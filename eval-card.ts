import * as minim from 'minimist';
import { quantum } from "./bots/quantum"
import type { PlayerViewModel, Protection } from './terraforming-mars/src/common/models/PlayerModel';
import type { CardModel } from './terraforming-mars/src/common/models/CardModel.js';
import { CardType } from './terraforming-mars/src/common/cards/CardType.js'
import { Units } from './terraforming-mars/src/common/Units';
import { GameModel } from './terraforming-mars/src/common/models/GameModel';
import { Color } from './terraforming-mars/src/common/Color';
import { Phase } from './terraforming-mars/src/common/Phase';
import { RandomMAOptionType } from './terraforming-mars/src/common/ma/RandomMAOptionType';
import { BoardName } from './terraforming-mars/src/common/boards/BoardName';
import { AgendaStyle } from './terraforming-mars/src/common/turmoil/Types';
import { Resources } from './terraforming-mars/src/common/Resources';
import { IVictoryPointsBreakdown } from './terraforming-mars/src/common/game/IVictoryPointsBreakdown';

const usage = `USAGE

    node eval-card [OPTIONS]

OPTIONS

    -h, --help
        Print usage information

    --card=CARD
        Evaluate the named card

    --gameState=JSON
        Evaluate given this game state`;
const argv = minim(process.argv.slice(2));
if (argv.h || argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}
const gameState = JSON.parse(argv.gameState);
const game: GameModel = {
  generation: 1,
  aresData: undefined,
  awards: [],
  colonies: [],
  discardedColonies: [],
  corporationsToDraft: [],
  deckSize: 0,
  expectedPurgeTimeMs: 0,
  gameAge: 0,
  gameOptions: {
    aresExtension: false,
    altVenusBoard: false,
    boardName: BoardName.THARSIS,
    bannedCards: [],
    ceoExtension: false,
    coloniesExtension: false,
    communityCardsOption: false,
    corporateEra: false,
    draftVariant: false,
    corporationsDraft: false,
    escapeVelocityMode: false,
    escapeVelocityThreshold: undefined,
    escapeVelocityPeriod: undefined,
    escapeVelocityPenalty: undefined,
    fastModeOption: false,
    includeFanMA: false,
    includeVenusMA: false,
    initialDraftVariant: false,
    moonExpansion: false,
    pathfindersExpansion: false,
    preludeExtension: false,
    promoCardsOption: false,
    politicalAgendasExtension: AgendaStyle.STANDARD,
    removeNegativeGlobalEvents: false,
    showOtherPlayersVP: false,
    showTimers: false,
    shuffleMapOption: false,
    solarPhaseOption: false,
    soloTR: false,
    randomMA: RandomMAOptionType.NONE,
    requiresMoonTrackCompletion: false,
    requiresVenusTrackCompletion: false,
    turmoilExtension: false,
    twoCorpsVariant: false,
    venusNextExtension: false,
    undoOption: false
  },
  isSoloModeWin: false,
  lastSoloGeneration: 0,
  milestones: [],
  moon: undefined,
  oceans: 0,
  oxygenLevel: 0,
  passedPlayers: [],
  pathfinders: undefined,
  phase: Phase.ACTION,
  spaces: [],
  step: 0,
  temperature: -30,
  isTerraformed: false,
  turmoil: undefined,
  undoCount: 0,
  venusScaleLevel: 0,
  ...gameState?.game
}
const noProtection: Record<Resources, Protection> = {
  [Resources.MEGACREDITS]: 'off',
  [Resources.STEEL]: 'off',
  [Resources.TITANIUM]: 'off',
  [Resources.PLANTS]: 'off',
  [Resources.ENERGY]: 'off',
  [Resources.HEAT]: 'off'
};
const victoryPointsBreakdown: IVictoryPointsBreakdown = {
  terraformRating: 0,
  milestones: 0,
  awards: 0,
  greenery: 0,
  city: 0,
  escapeVelocity: 0,
  moonHabitats: 0,
  moonMines: 0,
  moonRoads: 0,
  planetaryTracks: 0,
  victoryPoints: 0,
  total: 0,
  detailsCards: [],
  detailsMilestones: [],
  detailsAwards: [],
  detailsPlanetaryTracks: []
}
const playerGame: PlayerViewModel = { 
  cardsInHand: [],
  dealtCorporationCards: [],
  dealtPreludeCards: [],
  dealtProjectCards: [],
  dealtCeoCards: [],
  draftedCorporations: [],
  draftedCards: [],
  id: 'p123',
  ceoCardsInHand: [],
  pickedCorporationCard: [],
  preludeCardsInHand: [],
  thisPlayer: {
    actionsTakenThisRound: 0,
    actionsThisGeneration: [],
    actionsTakenThisGame: 0,
    availableBlueCardActionCount: 0,
    cardCost: 0,
    cardDiscount: 0,
    cardsInHandNbr: 0,
    citiesCount: 0,
    coloniesCount: 0,
    color: Color.BLUE,
    energy: 0,
    energyProduction: 0,
    fleetSize: 0,
    heat: 0,
    heatProduction: 0,
    id: undefined,
    influence: 0,
    isActive: false,
    lastCardPlayed: undefined,
    megaCredits: 0,
    megaCreditProduction: 0,
    name: '',
    needsToDraft: undefined,
    needsToResearch: undefined,
    noTagsCount: 0,
    plants: 0,
    plantProduction: 0,
    protectedResources: noProtection,
    protectedProduction: noProtection,
    tableau: [],
    selfReplicatingRobotsCards: [],
    steel: 0,
    steelProduction: 0,
    steelValue: 0,
    tags: [],
    terraformRating: 0,
    timer: {
      sumElapsed: 0,
      startedAt: 0,
      running: false,
      afterFirstAction: false,
      lastStoppedAt: 0
    },
    titanium: 0,
    titaniumProduction: 0,
    titaniumValue: 0,
    tradesThisGeneration: 0,
    victoryPointsBreakdown: victoryPointsBreakdown,
    victoryPointsByGeneration: []
  },
  waitingFor: undefined,
  players: [],
  ...gameState,
  game,
}
const card: CardModel = {
  name: argv.card,
  resources: undefined,
  cardType: CardType.EVENT,
  isDisabled: false,
  reserveUnits: Units.EMPTY,
}


console.log(new quantum().evaluateCard(card, playerGame));
