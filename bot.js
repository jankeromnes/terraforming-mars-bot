// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');
const request = require('./lib/request');

const PlayerInputTypes = require('./terraforming-mars/build/src/PlayerInputTypes');

const usage = `Usage: node bot PLAYER_LINK`;
const argv = minimist(process.argv.slice(2));

if (argv.help || argv._.length !== 1) {
  console.log(usage);
  process.exit();
}

const playerUrl = new URL(argv._[0]);
const serverUrl = playerUrl.origin;
const playerId = playerUrl.searchParams.get('id');

(async () => {
  const game = await request('GET', `${serverUrl}/api/player?id=${playerId}`);
  const bot = require(argv.bot || './bots/random');

  // TODO: pre-process `game.waitingFor`?
  // console.log('Game is waiting for: ' + JSON.stringify(game.waitingFor, null, 2));
  // console.log(PlayerInputTypes);

  const move = await bot.play(game);
  console.log('Bot plays:', move);

  const data = await request('POST', `${serverUrl}/player/input?id=${playerId}`, move);
  console.log(data);
})();
