// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');
const path = require('path');
const request = require('./lib/request');

const { PlayerInputTypes } = require('./terraforming-mars/build/src/PlayerInputTypes');

const usage = `Usage: node play-bot PLAYER_LINK`;
const argv = minimist(process.argv.slice(2));

if (argv.help || argv._.length !== 1) {
  console.log(usage);
  process.exit();
}

const playerUrl = new URL(argv._[0]);
const serverUrl = playerUrl.origin;
const playerId = playerUrl.searchParams.get('id');

(async () => {
  // Load bot script
  const bot = require('./' + path.join('.', argv.bot || 'bots/random'));

  // Initial research phase
  const game = await request('GET', `${serverUrl}/api/player?id=${playerId}`);
  logGameState(game);
  const availableCorporations = game.waitingFor.options[0].cards;
  const availableCards = game.waitingFor.options[1].cards;
  const move = await bot.playInitialResearchPhase(game, availableCorporations, availableCards);
  console.log('Bot plays:', move);
  const data = await request('POST', `${serverUrl}/player/input?id=${playerId}`, move);

  // Action phase
  logGameState(data);
  const move2 = await bot.playActionPhase(data);
  console.log('Bot plays:', move2);
})();

function logGameState(game) {
  console.log(`Game state (${game.players.length}p): temp=${game.temperature}, oxy=${game.oxygenLevel}, oceans=${game.oceans}, phase=${game.phase}`);
  console.log('Waiting for: ' + JSON.stringify(game.waitingFor, null, 2));
  console.log(PlayerInputTypes);
}
