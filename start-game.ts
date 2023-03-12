// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

import { Game } from "./models/game.js";

import fetch from 'node-fetch';

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
    "draftVariant": false,
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

export async function startGame(players: string[], serverUrl: string, quiet:boolean) {
  // Build the game's settings by copying and adapting the default templates
  const settings = JSON.parse(JSON.stringify(gameSettings));
  settings.seed = Math.random();

  // Add player settings
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
  const response = await fetch(`${serverUrl}/game`, {method: 'PUT', body: JSON.stringify(settings)});
  const game = (await response.json()) as Game;
  if (!quiet) {
    console.log('Started new game. Player links:');
  }
  console.log(game.players.map(p => (quiet ? '' : `  - ${p.name} (${p.color}): `) + `${serverUrl}/player?id=${p.id}`).join('\n'));
  return game.players;
};
