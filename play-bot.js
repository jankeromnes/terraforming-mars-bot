// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const request = require('./lib/request');
const { CardFinder } = require('./terraforming-mars/build/src/CardFinder');
const { PlayerInputTypes } = require('./terraforming-mars/build/src/PlayerInputTypes');

const usage = `Usage: node play-bot PLAYER_LINK`;
const argv = minimist(process.argv.slice(2));
if (argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}

const cardFinder = new CardFinder();

(async () => {
  const playerUrl = new URL(argv._[0] || (await exec('node start-game --quiet')).stdout.trim());
  const serverUrl = playerUrl.origin;
  const playerId = playerUrl.searchParams.get('id');

  // Load bot script
  const bot = require('./' + path.join('.', argv.bot || 'bots/random'));

  // Initial research phase
  let game = await request('GET', `${serverUrl}/api/player?id=${playerId}`);
  logGameState(game);
  const availableCorporations = game.waitingFor.options[0].cards;
  const availableCards = game.waitingFor.options[1].cards;
  annotateCards(game, availableCards);
  let move = await bot.playInitialResearchPhase(game, availableCorporations, availableCards);
  console.log('Bot plays:', move);
  game = await request('POST', `${serverUrl}/player/input?id=${playerId}`, move);

  // Play the game until the end
  while (game.phase !== 'end') {
    annotateWaitingFor(game, game.waitingFor);
    logGameState(game);
    move = await bot.play(game, game.waitingFor);
    console.log('Bot plays:', move);
    game = await request('POST', `${serverUrl}/player/input?id=${playerId}`, move);
  }

  console.log('Game ended!');
  logGameState(game);
  logGameScore(game);
})();

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
    // For some reason, card.calculatedCost is always 0.
    // But we get this info from the dealt project cards or cards in hand.
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
    if (!('tags' in card)) {
      card.tags = projectCard.tags;
    }
    if (!('metadata' in card) && ('metadata' in projectCard)) {
      card.metadata = projectCard.metadata;
    }
  }
}

function logGameState (game) {
  console.log(`Game state (${game.players.length}p): gen=${game.generation}, temp=${game.temperature}, oxy=${game.oxygenLevel}, oceans=${game.oceans}, phase=${game.phase}`);
}

function logGameScore (game) {
  console.log('Final scores:\n' + game.players.map(p => `  - ${p.name} (${p.color}): ${p.victoryPointsBreakdown.total} points`).join('\n'));
}