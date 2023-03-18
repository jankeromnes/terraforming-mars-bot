// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

import type { NewGameConfig, NewPlayerModel } from './terraforming-mars/src/common/game/NewGameConfig.js'
import { BoardName } from './terraforming-mars/src/common/boards/BoardName.js';
import type { SimpleGameModel } from './terraforming-mars/src/common/models/SimpleGameModel.js'
import { Color } from './terraforming-mars/src/common/color.js'
import { RandomMAOptionType } from './terraforming-mars/src/common/ma/RandomMAOptionType.js';
import { AgendaStyle } from './terraforming-mars/src/common/turmoil/Types.js';

// Game settings templates
const gamePlayerColors = [ 'red', 'green', 'yellow', 'blue', 'black', 'purple' ];
const gamePlayerSettings: NewPlayerModel = {
    index: 1,
    name: "Bot",
    color: Color.RED,
    beginner: false,
    handicap: 0,
    first: false
};
const gameSettings: NewGameConfig = {
  players: [],
  corporateEra: true,
  prelude: false,
  draftVariant: false,
  showOtherPlayersVP: false,
  venusNext: false,
  colonies: false,
  turmoil: false,
  customCorporationsList: [],
  customColoniesList: [],
  board: BoardName.THARSIS,
  seed: 0.28529731680252757,
  solarPhaseOption: false,
  promoCardsOption: false,
  communityCardsOption: false,
  aresExtension: false,
  politicalAgendasExtension: AgendaStyle.STANDARD,
  moonExpansion: false,
  pathfindersExpansion: false,
  undoOption: false,
  showTimers: false,
  fastModeOption: false,
  removeNegativeGlobalEventsOption: false,
  includeVenusMA: true,
  includeFanMA: false,
  startingCorporations: 2,
  soloTR: false,
  initialDraft: false,
  corporationsDraft: false,
  randomMA: RandomMAOptionType.NONE,
  shuffleMapOption: false,
  randomFirstPlayer: true,
  requiresVenusTrackCompletion: false,
  requiresMoonTrackCompletion: false,
  moonStandardProjectVariant: false,
  altVenusBoard: false,
  escapeVelocityMode: false,
  twoCorpsVariant: false,
  ceoExtension: false,
  customCeos: [],
  startingCeos: 3,
  clonedGamedId: undefined,
  bannedCards: [],
  customPreludes: [],
  escapeVelocityThreshold: 0,
  escapeVelocityPeriod: 0,
  escapeVelocityPenalty: 0
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
  const responseText = await response.text()
  const game = JSON.parse(responseText) as SimpleGameModel;
  if (!quiet) {
    console.log('Started new game. Player links:');
  }
  console.log(game.players.map(p => (quiet ? '' : `  - ${p.name} (${p.color}): `) + `${serverUrl}/player?id=${p.id}`).join('\n'));
  return game.players;
};
