// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const minimist = require('minimist');

const usage = `Usage: node start-game [SERVER]`;
const argv = minimist(process.argv.slice(2));

if (argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}

const serverUrl = argv._[0] || 'http://localhost:8080';
console.log('Server URL:', serverUrl);
