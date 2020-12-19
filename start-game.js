// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const fs = require('fs');
const minimist = require('minimist');
const request = require('./lib/request');

const usage = `USAGE

    node start-game [OPTIONS] [SERVER]

OPTIONS

    -h, --help
        Print usage information

    -q, --quiet
        Only print player links (no extra text)

    --players=PLAYER1,PLAYER2,...
        Provide several player names to start a multi-player game`;
const argv = minimist(process.argv.slice(2));
if (argv.h || argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}

// Game settings templates
const gamePlayerColors = [ 'red', 'green', 'yellow', 'blue', 'black', 'purple' ];
const gamePlayerSettings = {
    "index": 1,
    "name": "Bot",
    "color": "red",
    "beginner": false,
    "handicap": 0,
    "first": false
};
const gameSettings = {
    "players": [],
    "corporateEra": true,
    "prelude": false,
    "draftVariant": true,
    "showOtherPlayersVP": false,
    "venusNext": false,
    "colonies": false,
    "turmoil": false,
    "customCorporationsList": [],
    "customColoniesList": [],
    "cardsBlackList": [],
    "board": "tharsis",
    "seed": 0.28529731680252757,
    "solarPhaseOption": false,
    "promoCardsOption": false,
    "communityCardsOption": false,
    "aresExtension": false,
    "undoOption": false,
    "fastModeOption": false,
    "removeNegativeGlobalEventsOption": false,
    "includeVenusMA": true,
    "startingCorporations": 2,
    "soloTR": false,
    "initialDraft": false,
    "randomMA": "No randomization",
    "shuffleMapOption": false,
    "beginnerOption": false,
    "randomFirstPlayer": true,
    "requiresVenusTrackCompletion": false
};

(async () => {
  const serverUrl = argv._[0] || 'http://localhost:8080';
  const quiet = argv.q || argv.quiet;

  // Build the game's settings by copying and adapting the default templates
  const settings = JSON.parse(JSON.stringify(gameSettings));
  settings.seed = Math.random();

  // Add player settings
  const players = argv.players ? argv.players.split(',') : [ 'Bot' ];
  if (players.length < 1 || players.length > gamePlayerColors.length) {
    throw new Error(`Unsupported number of players: ${players.length} (should be between 1 and ${gamePlayerColors.length})`);
  }
  for (const playerName of players) {
    const playerSettings = JSON.parse(JSON.stringify(gamePlayerSettings));
    playerSettings.index = settings.players.length + 1;
    playerSettings.name = playerName;
    playerSettings.color = gamePlayerColors[settings.players.length];
    settings.players.push(playerSettings);
  }

  // Pick a random first player
  settings.players[Math.floor(Math.random() * settings.players.length)].first = true;

  // Start the game
  const game = await request('PUT', `${serverUrl}/game`, settings);
  if (!quiet) {
    console.log('Started new game. Player links:');
  }
  console.log(game.players.map(p => (quiet ? '' : `  - ${p.name} (${p.color}): `) + `${serverUrl}/player?id=${p.id}`).join('\n'));
})();
