import type { PlayerViewModel } from '../terraforming-mars/src/common/models/PlayerModel.js'
import { getCard } from './ClientCardManifest.js';
import { Tag } from '../terraforming-mars/src/common/cards/tag.js';
import type { CardModel } from '../terraforming-mars/src/common/models/CardModel.js';
import type { PlayerInputModel } from '../terraforming-mars/src/common/models/PlayerInputModel.js';
import { PlayerInputType } from '../terraforming-mars/src/common/input/PlayerInputType.js';
import type { InputResponse } from '../terraforming-mars/src/common/inputs/InputResponse.js';
import type { Payment } from '../terraforming-mars/src/common/inputs/Payment.js';
import type { SpaceModel } from '../terraforming-mars/src/common/models/SpaceModel.js';
import type { IVictoryPoints } from '../terraforming-mars/src/common/cards/IVictoryPoints.js';
import { Units } from '../terraforming-mars/src/common/Units.js';
import { CardComponent } from '../terraforming-mars/src/common/cards/render/CardComponent.js';
import type { CardRenderItem, CardRenderTile, MyCardComponent } from './CardComponents.js';
import type { SpaceId } from '../terraforming-mars/src/common/Types.js';

// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// Quantum Bot -- heavily inspired by https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy

// To test this bot, run this command:
//   node play-bot --bot=quantum

// Source: "6. Corporations" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCorporation (corporation: CardModel, game:PlayerViewModel) {
  switch (corporation.name) {
    case 'Saturn Systems':
      return 57 + game.dealtProjectCards.filter(c => getCard(c.name).tags.includes(Tag.JOVIAN)).length * 5;
    case 'Teractor':
      return 60 + game.dealtProjectCards.filter(c => getCard(c.name).tags.includes(Tag.EARTH)).length * 3;
    case 'Tharsis Republic':
      return 52;
    case 'Helion':
      return 57;
    case 'Interplanetary Cinematics':
      return 70;
    case 'Mining Guild':
      return 48; // TODO: Plus 8M for each bonus Steel Production you can gain early.
    case 'PhoboLog':
      return 63;
    case 'CrediCor':
      return 57;
    case 'EcoLine':
      return 62;
    case 'United Nations Mars Initiative':
      return 40;
    case 'Inventrix':
      return 51; // TODO: +4M if that Science Symbol fulfills the requirement of cards you plan to play early.
    case 'Thorgate':
      return 55;
    default:
      throw new Error(`Unsupported corporation! ${corporation.name}`);
  }
}

function parseRows (rows: MyCardComponent[][], game: PlayerViewModel) {
  var totalScore = 0;
  for (const row of rows) {
    totalScore += parseRow(row, game);
  }
  return totalScore;
}

function parseRow(row: MyCardComponent[], game: PlayerViewModel) {
  var generationsLeft = 14 - game.game.generation; // TODO: improve this guess
  var rowScore = 0;
  var index = -1;
  var multiplier = 1;
  for (const item of row) {
    index++;
    switch(item.is)
    {
      case 'symbol':
        switch (item.type) {
          case '-':
            multiplier = -1;
            break;
          case '+':
            multiplier = 1;
            break;
          case ' ':
            // Ignore.
            break;
          case 'nbsp':
            // Ignore.
            break;
          case '*':
            // special additional rules, e.g. for flooding, ignore these for now
            break;
          case ':':
            // when condition, do effect
            const condition = row.slice(0, index);
            const conditionTimes = howManyTimesWillOccur(condition);
            const effectValue = parseRow(row.slice(index+1), game);
            return conditionTimes * effectValue;
          case '->':
            // action: spend cost, get benifit
            const cost = parseRow(row.slice(0, index), game);
            const benifit = parseRow(row.slice(index+1), game);
            const netBenifit = (benifit - cost) * generationsLeft
            return netBenifit;
          case 'OR': 
            let firstPart = parseRow(row.slice(0, index), game);
            let secondPart = parseRow(row.slice(index+1), game);
            return Math.max(firstPart, secondPart);
          }
          break;
        case 'item':
          rowScore += evaluateItem(item, game) * generationsLeft * multiplier;
          break;
        default:
          throw new Error("Unexpected element in production-box " + item.is);
    }
  }
  return rowScore;
}

function howManyTimesWillOccur(condition: MyCardComponent[]) {
  // TODO: guess better
  return 1;
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateVictoryPoints (victoryPoints: number | 'special' | IVictoryPoints, game: PlayerViewModel) {
  if (game.players.length == 0)
    return 0;
  if (typeof victoryPoints === 'number') {
    return 5 * victoryPoints;
  } else {
    console.error(new Error('Unsupported victoryPoints format! ' + JSON.stringify(victoryPoints, null, 2)));
    return 0;
  }
}

function evaluateProductionBox(productionBox: Units, game: PlayerViewModel) {
  return 0; // sadly this box doesn't include anything useful
}

  // Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCard (cardInstance: CardModel, game: PlayerViewModel) {
  if (cardInstance.isDisabled)
    return -10000;
  let score = -cardInstance.calculatedCost;
  const card = getCard(cardInstance.name);
  if (card && card.victoryPoints)
    score += evaluateVictoryPoints(card.victoryPoints, game);

  if (card.productionBox)
    score += evaluateProductionBox(card.productionBox, game);
  if (card.metadata.renderData)
    score += evaluateCardComponent(card.metadata.renderData as MyCardComponent, game);

  /*
  // HACK: Guess card effects by parsing the renderData (will definitely break unless tested)
  if (card && card.metadata && card.metadata.renderData) {
    try {
      score += parseRows(card.metadata.renderData._rows, 0);
    } catch (error) {
      console.error('Could not parse card renderData');
      console.error(error);
    }
  }
  */
  return score;
}

// Source: https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateOption (option: PlayerInputModel, game: PlayerViewModel): number {
  switch (option.inputType){
  case PlayerInputType.AND_OPTIONS:
    var score = 0;
    for (const andOption of option.options) {
      score += evaluateOption(andOption, game);
    }
    return score;

  case PlayerInputType.OR_OPTIONS:
    return evaluateOption(sortByEstimatedValue(option.options, evaluateOption, game)[0], game)

  case PlayerInputType.SELECT_CARD:
    if (option.title === "Sell patents")
      return -1000;
    else if (option.title === "Standard projects")
      return evaluateCard(sortByEstimatedValue(option.cards, evaluateCard, game)[0], game);
    else if (option.title === 'Perform an action from a played card')
      return evaluateCard(sortByEstimatedValue(option.cards, evaluateCard, game)[0], game);
    else
      throw new Error(`Unsupported card selection title (${option.title})`);


  case PlayerInputType.SELECT_PROJECT_CARD_TO_PLAY:
    return evaluateCard(sortByEstimatedValue(option.cards, evaluateCard, game)[0], game);

  case PlayerInputType.SELECT_SPACE:
    return evaluateSpace(sortByEstimatedValue(option.availableSpaces, evaluateSpace, game)[0], game);

  case PlayerInputType.SELECT_OPTION:
    const title = typeof option.title === "string" ? option.title : option.title.message;
    if (title.match(/Take first action of.*/)) {
      // We definitely want to do that
      return 100;
    }
    if (option.buttonLabel.match(/Claim - \((.*)\)/)) {
      // Source: "1.1 Standard Cards"
      return 25;
    }
    if (title.match(/Convert (\d+) plants into greenery/)) {
      // Source: "2.1 Card Advantage"
      return 19;
    }
    if (title === 'Convert 8 heat into temperature') {
      // Source: "1.1 Standard Cards"
      return 10;
    }
    var match = title.match(/([^(]+) \((\d+) MC\)/);
    if (match?.length === 3)
    {
      const projectType = match[1];
      const cost = parseInt(match[2], 10);
      if (projectType === "Power plant") {
        // Source: "1.1 Standard Cards"
        return 7 - cost;
      }
      if (projectType === "Asteroid") {
        // Source: "1.1 Standard Cards"
        return 10 - cost;
      }
      if (projectType === "Aquifer") {
        // Source: "1.1 Standard Cards"
        return 14 - cost;
      }
      if (projectType === "Greenery") {
        // Source: "2.1 Card Advantage"
        return 19 - cost;
      }
      if (projectType === "City") {
        // Source: "4.5 Points from City"
        return 9 - cost;
      }
    }
    if (title === 'Pass for this generation') {
      // Only pass when no "good" choices remain
      return -100;
    }
    if (title === 'Sell patents') {
      // Don't sell patents
      return -101;
    }
    if (title === "Don't place a greenery") {
      // always place greenery in the final phase
      return -100;
    }
    console.error(new Error('Could not evaluate option! ' + JSON.stringify(option, null, 2)));
    return -100; // Don't play options we don't understand, except if there is no other choice.
  
  
  default:
    throw new Error(`Unsupported optional player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateSpace (spaceId: SpaceId, game:PlayerViewModel) {
  // TODO: Also evaluate adjacent bonuses (points, megacredits, etc)
  let score = 0;
  const bonusValues = [
    2,  // TITANIUM
    2,  // STEEL
    2,  // PLANT
    2,  // DRAW_CARD
    1,  // HEAT
    14, // OCEAN
    1,  // MEGACREDITS
  ];
  const space = game.game.spaces.find(space => spaceId === space.id);
  for (const bonus of space.bonus) {
    score += bonusValues[bonus];
  }
  return score;
}

function sortByEstimatedValue<T>(items:T[], evaluator: (t: T,game: PlayerViewModel) => number, game:PlayerViewModel) {
  // Evaluate all items
  var valueItems = items.map(item => ({item: item, value: evaluator(item, game)}))
  // Sort items by estimated value
  return shuffle(valueItems).sort((a, b) => a.value > b.value ? -1 : 1).map(v => v.item);
}

function shuffle<T>(items:T[]) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

// Choose corporation and initial cards
export function playInitialResearchPhase(game:PlayerViewModel, availableCorporations:CardModel[], availableCards:CardModel[]): InputResponse {
  console.log(availableCorporations, availableCards, game);

  // Sort corporation by estimated value
  const sortedCorporations = sortByEstimatedValue(availableCorporations, evaluateCorporation, game);

  // Pick the best available corporation
  const corporation = sortedCorporations[0];

  // Pick the best available cards
  const initialCards = availableCards.filter(c => evaluateCard(c, game) > 3);

  console.log('Quantum bot chose:', corporation, initialCards);
  return { 
    type: 'and', 
    responses: [
      { type: 'card', cards: [corporation.name]}, 
      { type: 'card', cards: initialCards.map(c => c.name)}
    ]
  };
}

// Choose how to pay for a given card (or amount)
function chooseHowToPay (game: PlayerViewModel, waitingFor: PlayerInputModel, card?: CardModel): Payment {
  // Prefer non-megacredit resources when available (in case there are not enough megacredits)
  let megaCredits = card ? card.calculatedCost : waitingFor.amount ?? 0;
  let heat = 0;
  if (waitingFor.canUseHeat) {
    heat = Math.min(game.thisPlayer.heat, megaCredits);
    megaCredits -= heat;
  }

  const projectCard = card ? getCard(card.name) : undefined;
  if (card && !projectCard) 
    throw new Error(`Could not find project card: ${card.name}`);
  let steel = 0;
  if ((waitingFor.canUseSteel || projectCard?.tags.includes(Tag.BUILDING))) {
    steel = Math.min(game.thisPlayer.steel, Math.floor(megaCredits / game.thisPlayer.steelValue));
    megaCredits -= steel * game.thisPlayer.steelValue;
    // If there aren't enough mega credits left, we may need to overshoot on steel.
    if (game.thisPlayer.megaCredits < megaCredits  && game.thisPlayer.steel > steel) {
      steel++;
      megaCredits = Math.max(0, megaCredits - game.thisPlayer.steelValue);
    }
  }
  let titanium = 0;
  if ((waitingFor.canUseTitanium || projectCard?.tags.includes(Tag.SPACE))) {
    titanium = Math.min(game.thisPlayer.titanium, Math.floor(megaCredits / game.thisPlayer.titaniumValue));
    megaCredits -= titanium * game.thisPlayer.titaniumValue;
    // If there still aren't enough mega credits left, we may need to overshoot on titanium.
    if (game.thisPlayer.megaCredits < megaCredits  && game.thisPlayer.titanium > titanium) {
      titanium++;
      megaCredits = Math.max(0, megaCredits - game.thisPlayer.titaniumValue);
    }
  }
  let microbes = 0;
  let floaters = 0;
  const science = 0;
  const seeds = 0;
  const data = 0;
  return { heat, megaCredits, steel, titanium, microbes, floaters, science, seeds, data };
}

// TODO: Remove
function chooseRandomItem<T> (items?: T[]) {
  return items ? items[chooseRandomNumber(0, items.length - 1)] : undefined;
}
function chooseRandomNumber (min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Play a turn of Terraforming Mars
export function play(game:PlayerViewModel, option:PlayerInputModel): InputResponse {
  console.log('Game is waiting for:', JSON.stringify(option, null, 2));
  switch (option.inputType) {
    case PlayerInputType.AND_OPTIONS:
      if (!option.options)
        throw new Error("No options when some are expected");
      const actions: InputResponse[] = [];
      for (const orOption of option.options) {
        actions.push(play(game, orOption)[0]);
      }
      return { type: 'and', responses: actions };

    case PlayerInputType.OR_OPTIONS:
      // Sort playable options by estimated value
      const sortedOptions = sortByEstimatedValue(option.options, evaluateOption, game);

      // Pick the best playable option
      const bestOption = sortedOptions[0];
      const choice = option.options?.indexOf(bestOption);
      return { type: 'or', index: choice, response: play(game, bestOption) };

    case PlayerInputType.SELECT_AMOUNT:
      return { type: 'amount', amount: chooseRandomNumber(option.min, option.max) };

    case PlayerInputType.SELECT_CARD:
      if (option.title === 'Select card(s) to buy')
      {
        // Pick the best available cards
        // TODO reverse when "title": "Select a card to discard" / "buttonLabel": "Discard",
        const sortedCards = sortByEstimatedValue(option.cards, evaluateCard, game);
        let numberOfCards = option.min;
        while (numberOfCards < option.max && evaluateCard(sortedCards[numberOfCards],game) > 3) {
          numberOfCards++;
        }
        return { type: 'card', cards: sortedCards.slice(0, numberOfCards).map(c => c.name) };
      } else if (option.title === "Sell patents")
        return { type: 'card', cards: [] };
      else if (option.title === "Standard projects")
        return { type: 'card', cards: [option.cards[0].name] };
      else if (option.title === 'Perform an action from a played card') {
        const card = sortByEstimatedValue(option.cards, evaluateCard, game)[0];
        return { type: 'card', cards: [card.name] };
      }
      break;


    case PlayerInputType.SELECT_PAYMENT:
      return { type: 'payment', payment: chooseHowToPay(game, option)};

    case PlayerInputType.SELECT_INITIAL_CARDS:
      // shouldn't get here
      return playInitialResearchPhase(game, option.options[0].cards, option.options[1].cards);

    case PlayerInputType.SELECT_PROJECT_CARD_TO_PLAY:
      const card = sortByEstimatedValue(option.cards, evaluateCard, game)[0];
      if (!card)
        throw new Error("No cards to select from.");
      return { type: 'projectCard', card: card.name, payment: chooseHowToPay(game, option, card) };

    case PlayerInputType.SELECT_OPTION:
      return { type: 'option' };

    case PlayerInputType.SELECT_PLAYER:
      return { type: 'player', player: chooseRandomItem(option.players)};

    case PlayerInputType.SELECT_SPACE:
      // Pick the best available space
      if (!option.availableSpaces)
        throw new Error("Could not find a space to select");
      const sortedSpaces = sortByEstimatedValue(option.availableSpaces, evaluateSpace, game);
      return { type: 'space', spaceId: sortedSpaces[0] };

    case PlayerInputType.SELECT_PRODUCTION_TO_LOSE:
      return { type: 'productionToLose', units: Units.EMPTY };

    default:
      throw new Error(`Unsupported player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}
function evaluateCardComponent(cardComponent: MyCardComponent, game: PlayerViewModel) {
  switch (cardComponent.is) {
    case 'root' : return evaluateCardComponents(cardComponent.rows, game);
    case 'effect' : return evaluateEffect(cardComponent.rows, game);
    case 'production-box' : return evaluateProduction(cardComponent.rows, game);
    case 'tile' : return evaluateTile(cardComponent, game);
    case 'item' : return evaluateItem(cardComponent, game);
    default: return 0;
  }
}
function evaluateCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel) {
  var score = 0;
  cardComponents.forEach(c => c.forEach(component => score += evaluateCardComponent(component, game)));
  return score;
}


function evaluateEffect(rows: MyCardComponent[][], game: PlayerViewModel) {
  return 0; // effects are hard to evaluate
}

function evaluateProduction(rows: MyCardComponent[][], game: PlayerViewModel) {
  return parseRows(rows, game);
}
function evaluateTile(cardComponent: CardRenderTile, game: PlayerViewModel) {
  return 0; // TODO: we can do better than this
}
function evaluateItem(cardComponent: CardRenderItem, game: PlayerViewModel) {
  const bonusValues = {
    'cards': 2,
    'city': 9, // Source: "4.5 Points from City"
    'heat': 1,
    'megacredits': 1,
    'oceans': 14,
    'oxygen': 10,
    'plants': 2,
    'steel': 2,
    'temperature': 10,
    'titanium': 2,
    'tr': 10,
    // these needs more detail
    'microbes': 1, 
    'animals': 2,
  };
  // if this is affecting other players then the value 
  // is lower the more player there are
  const divider = cardComponent.anyPlayer ? game.players.length : 1
  if (bonusValues[cardComponent.type])
    return bonusValues[cardComponent.type] / divider;
  return 0;
}

