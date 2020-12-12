// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const fs = require('fs');
const minimist = require('minimist');
const request = require('./lib/request');

const usage = `Usage: node start-game [SERVER]`;
const argv = minimist(process.argv.slice(2));

if (argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}

const serverUrl = argv._[0] || 'http://localhost:8080';

const settings = JSON.parse(fs.readFileSync('./assets/tm_settings_solo_game.json', 'utf-8'));

(async () => {
  const game = await request('PUT', `${serverUrl}/game`, settings);
  console.log('Started new game. Player links:\n' + game.players.map(p => `  - ${p.name} (${p.color}): ${serverUrl}/player?id=${p.id}`).join('\n'));
})();
