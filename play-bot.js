// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');
const path = require('path');
const request = require('./lib/request');

const PlayerInputTypes = require('./terraforming-mars/build/src/PlayerInputTypes');

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
  const bot = require('./' + path.join('.', argv.bot || 'bots/random'));
  const game = await request('GET', `${serverUrl}/api/player?id=${playerId}`);

  // Initial research phase
  const availableCorporations = game.waitingFor.options[0].cards;
  const availableCards = game.waitingFor.options[1].cards;
  const move = await bot.playInitialResearchPhase(game, availableCorporations, availableCards);
  console.log('Bot plays:', move);

  const data = await request('POST', `${serverUrl}/player/input?id=${playerId}`, move);
  console.log('Game is waiting for: ' + JSON.stringify(data.waitingFor, null, 2));
  console.log(PlayerInputTypes);
})();
