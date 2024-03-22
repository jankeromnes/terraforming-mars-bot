// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const request = require('./lib/request');
const { CardFinder } = require('./terraforming-mars/build/src/server/CardFinder');
const { PlayerInputTypes } = require('./terraforming-mars/build/src/common/input/PlayerInputType');
const { SpaceBonus } = require('./terraforming-mars/build/src/common/boards/SpaceBonus');

const usage = `USAGE

    node play-bot [OPTIONS] [PLAYER_LINK]

OPTIONS

    -h, --help
        Print usage information

    --bot=BOT
        Play with a specific bot script from the bots/ directory (default is --bot=random)

    --games=NUMBER
        Play NUMBER of games in a row, then print score statistics

    --ignore-errors
        If an error occurs during a game, ignore it and just play another game`;
const argv = minimist(process.argv.slice(2));
if (argv.h || argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}

const cardFinder = new CardFinder();

(async () => {
  const scores = [];
  const games = argv.games || 1;
  while (scores.length < games) {
    try {
      const game = await playGame(argv._[0], argv.bot);
      console.log('Final scores:\n' + game.players.map(p => `  - ${p.name} (${p.color}): ${p.victoryPointsBreakdown.total} points`).join('\n'));
      const score = {};
      for (const p of game.players) {
        score[p.name] = p.victoryPointsBreakdown.total;
      }
      scores.push(score);
    } catch (error) {
      if (argv['ignore-errors']) {
        continue;
      }
      throw error;
    }
  }
  if (scores.length > 1) {
    console.log(`\nPlayed ${scores.length} game${scores.length === 1 ? '' : 's'}. Score summary:`);
    for (const name in scores[0]) {
      let min = scores[0][name];
      let max = scores[0][name];
      let total = scores.map(s => s[name]).reduce((a, b) => {
        if (b < min) min = b;
        if (b > max) max = b;
        return a + b;
      }, 0);
      let average = Math.round(100 * total / scores.length) / 100;
      console.log(`  - ${name}: average ${average} points (min ${min}, max ${max})`);
    }
  }
})();

async function playGame (playerLink, botPath) {
  if  (!botPath) {
    botPath = 'random';
  }
  if (!playerLink) {
    playerLink = (await exec(`node start-game --players=${botPath} --quiet`)).stdout.trim();
    console.log('Auto-started new solo game! Bot player link: ' + playerLink);
  }
  const playerUrl = new URL(playerLink);
  const serverUrl = playerUrl.origin;
  const playerId = playerUrl.searchParams.get('id');

  // Load bot script
  const bot = require('./' + path.join('bots', botPath));

  // Initial research phase
  let game = await waitForTurn(serverUrl, playerId);
  logGameState(game);
  const availableCorporations = game.waitingFor.options[0].cards;
  const availableCards = game.waitingFor.options[1].cards;
  annotateCards(game, availableCards);
  let move = await bot.playInitialResearchPhase(game, availableCorporations, availableCards);
  // FIXME: New expected move format: {"runId":"r1a752108d3b6","type":"and","responses":[{"type":"card","cards":["CrediCor"]},{"type":"card","cards":["Vesta Shipyard"]}]}
  // instead of: [ [ 'CrediCor' ], [ 'Vesta Shipyard' ] ]
  game = await playMoveAndWaitForTurn(serverUrl, playerId, move);

  // Play the game until the end
  while (game.phase !== 'end') {
    annotateWaitingFor(game, game.waitingFor);
    annotateMapSpaces(game);
    logGameState(game);
    move = await bot.play(game, game.waitingFor);
    console.log('Bot plays:', move);
    game = await playMoveAndWaitForTurn(serverUrl, playerId, move);
  }

  console.log('Game ended!');
  logGameState(game);
  return game;
}

async function playMoveAndWaitForTurn (serverUrl, playerId, move) {
  console.log('Bot plays:', move);
  let game = await request('POST', `${serverUrl}/player/input?id=${playerId}`, move);
  return await waitForTurn(serverUrl, playerId, game);
}

async function waitForTurn (serverUrl, playerId, game) {
  while (!game || !('waitingFor' in game) && game.phase !== 'end') {
    await new Promise(resolve => setTimeout(resolve, 30));
    game = await request('GET', `${serverUrl}/api/player?id=${playerId}`);
  }
  return game;
}

// Add additional useful information to a game's "waitingFor" object
function annotateWaitingFor (game, waitingFor) {
  // Annotate expected player input type (e.g. inputType '2' means playerInputType 'SELECT_AMOUNT')
  const playerInputType = PlayerInputTypes[waitingFor.inputType];
  if (!playerInputType) {
    throw new Error(`Unsupported player input type ${waitingFor.inputType}! Supported types: ${JSON.stringify(PlayerInputTypes, null, 2)}`);
  }
  waitingFor.playerInputType = playerInputType;
  if (waitingFor.cards) {
    // Annotate any missing card information (e.g. tags)
    annotateCards(game, waitingFor.cards);
  }
  for (const option of (waitingFor.options || [])) {
    // Recursively annotate nested waitingFor options
    annotateWaitingFor(game, option);
  }
}

// Add additional useful information to cards
function annotateCards (game, cards) {
  for (const card of cards) {
    // BUG: For some reason, card.calculatedCost is always 0.
    // But we can get this info from the dealt project cards or cards in hand.
    const cardInHand = game.cardsInHand.find(c => c.name === card.name);
    if (card.calculatedCost === 0 && cardInHand && cardInHand.calculatedCost) {
      card.calculatedCost = cardInHand.calculatedCost;
    }
    const dealtProjectCard = game.dealtProjectCards.find(c => c.name === card.name);
    if (card.calculatedCost === 0 && dealtProjectCard && dealtProjectCard.cost) {
      card.calculatedCost = dealtProjectCard.cost;
    }
    // Check the reference project card to find & annotate more details.
    const projectCard = cardFinder.getProjectCardByName(card.name);
    if (!projectCard) {
      console.error(new Error(`Could not find card: ${JSON.stringify(card, null, 2)}`));
      continue;
    }
    card.cardType = projectCard.cardType;
    // If we still don't know the card's cost, get it from the reference card.
    /* FIXME: Why does this reduce the average score of Quantum Bot by 7 points?
    if (card.calculatedCost === 0) {
      card.calculatedCost = projectCard.cost;
    } */
    if (!('tags' in card)) {
      card.tags = projectCard.tags;
    }
    if (!('metadata' in card) && ('metadata' in projectCard)) {
      card.metadata = projectCard.metadata;
    }
  }
}

// Add additional useful information to map spaces
function annotateMapSpaces (game) {
  game.spaces.forEach(space => {
    space.placementBonus = space.bonus.map(b => SpaceBonus[b]);
  });
}

function logGameState (game) {
  console.log(`Game state (${game.players.length}p): gen=${game.game.generation}, temp=${game.game.temperature}, oxy=${game.game.oxygenLevel}, oceans=${game.game.oceans}, phase=${game.game.phase}`);
}
