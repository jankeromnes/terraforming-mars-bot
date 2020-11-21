// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');
const request = require('./lib/request');

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
  const data = await request('GET', `${serverUrl}/api/player?id=${playerId}`);
  console.log(data);

  // TODO: POST /player/input?id=542b258c4f2 [["Teractor"],["Viral Enhancers","Kelp Farming"]]
})();
