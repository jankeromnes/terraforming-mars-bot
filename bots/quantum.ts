import type { PlayerViewModel } from '../terraforming-mars/src/common/models/PlayerModel.js'
import { getCard } from './ClientCardManifest.js';
import { Tag } from '../terraforming-mars/src/common/cards/tag.js';
import type { CardModel } from '../terraforming-mars/src/common/models/CardModel.js';
import type { PlayerInputModel } from '../terraforming-mars/src/common/models/PlayerInputModel.js';
import { PlayerInputType } from '../terraforming-mars/src/common/input/PlayerInputType.js';
import type { InputResponse } from '../terraforming-mars/src/common/inputs/InputResponse.js';
import type { Payment } from '../terraforming-mars/src/common/inputs/Payment.js';
import type { IVictoryPoints } from '../terraforming-mars/src/common/cards/IVictoryPoints.js';
import { Units } from '../terraforming-mars/src/common/Units.js';
import type { CardRenderItem, CardRenderTile, MyCardComponent } from './CardComponents.js';
import type { SpaceId } from '../terraforming-mars/src/common/Types.js';
import { TileType } from '../terraforming-mars/src/common/TileType.js';
import { ICardRequirement, ITagCardRequirement } from '../terraforming-mars/src/common/cards/ICardRequirement.js';
import { RequirementType } from '../terraforming-mars/src/common/cards/RequirementType.js';

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
            const firstPart = parseRow(row.slice(0, index), game);
            const secondPart = parseRow(row.slice(index+1), game);
            return Math.max(firstPart, secondPart);
          case '/': 
            const production = parseRow(row.slice(0, index), game);
            const per = row[index+1];
            if (per.is !== 'item')
              throw new Error("Unexpected 'per' in" + JSON.stringify(row));
            var count = 0;
            if (per.isPlayed)
              count = per.anyPlayer ? game.players.reduce((sum,p) => sum + p.tags[per.type],0) : game.thisPlayer.tags[per.type]
            else
              switch(per.type)
              {
                case 'city':
                  count = per.anyPlayer ? game.players.reduce((sum,p) => sum + p.citiesCount,0) : game.thisPlayer.citiesCount;
                  break;
                case 'greenery':
                  count = per.anyPlayer ? game.players.reduce((sum,p) => sum + p.victoryPointsBreakdown.greenery,0) : game.thisPlayer.victoryPointsBreakdown.greenery;
                  break;
                default:
                  throw new Error("Unexpected 'per' in" + JSON.stringify(row));
              }
            const num = Math.floor(count/Math.abs(per.amount));
            return production * num;
          default:
            console.log("Unexpected card symbol type :", item)
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
    const points = victoryPoints as IVictoryPoints;
    // todo take into account how many we will pick up during the game
    if(points.type === "resource")
        return 0;
    return Math.floor(game.thisPlayer.tags[points.type] / points.per) * points.points * 5;
  }
}

function evaluateProductionBox(productionBox: Units, game: PlayerViewModel) {
  return 0; // sadly this box doesn't include anything useful
}

  // Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCard (cardInstance: CardModel, game: PlayerViewModel) {
  if (cardInstance.isDisabled)
    return -10000;
  var score = -cardInstance.calculatedCost;
  const card = getCard(cardInstance.name);
  if (card && card.victoryPoints)
    score += evaluateVictoryPoints(card.victoryPoints, game);

  if (card.productionBox)
    score += evaluateProductionBox(card.productionBox, game);
  if (card.metadata.renderData)
    score += evaluateCardComponent(card.metadata.renderData as MyCardComponent, game);

  if (card.requirements)
    card.requirements.requirements.forEach(requirement => score += evaluateRequirement(requirement, game));
  return score;
}

function evaluateTriggerCard (cardInstance: CardModel, game: PlayerViewModel) {
  if (cardInstance.isDisabled)
    return -10000;
  const card = getCard(cardInstance.name);
  if (card && card.metadata.renderData)
    return evaluateTriggerCardComponent(card.metadata.renderData as MyCardComponent, game);

  throw new Error ("Unrecognised card found " + cardInstance.name);
}

// Source: https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
// chose the best option to play as one of the two main turn actions
function evaluateOption (option: PlayerInputModel, game: PlayerViewModel): {score:number,item:InputResponse}  {
  switch (option.inputType){
  case PlayerInputType.AND_OPTIONS:
    var score = 0;
    var actions = [];
    for (const andOption of option.options) {
      const result = evaluateOption(andOption, game);
      score += result.score;
      actions.push(actions);
    }

    return {score, item: { type: 'and', responses: actions }} ;

  case PlayerInputType.OR_OPTIONS:
    const sortedOptions = sortByEstimatedValue2(option.options, evaluateOption, game)
    const bestOption = sortedOptions[0];
    const choice = option.options.indexOf(bestOption.source);
    return { score: bestOption.result.score, item: { type: 'or', index: choice, response: bestOption.result.item }};

  case PlayerInputType.SELECT_CARD:
    var bestCard: {result:{score:number}, source: CardModel};
    if (option.title === "Sell patents")
      return { score: -100, item: {type: 'card', cards: []}};
    else if (option.title === "Standard projects")
      bestCard = sortByEstimatedValue(option.cards, evaluateTriggerCard, game)[0];
    else if (option.title === 'Perform an action from a played card')
      bestCard = sortByEstimatedValue(option.cards, evaluateTriggerCard, game)[0];
    else
      throw new Error(`Unsupported card selection title (${option.title})`);
    return { score: bestCard.result.score, item: {type: 'card', cards: [bestCard.source.name]}};

  case PlayerInputType.SELECT_PROJECT_CARD_TO_PLAY:
    const cardToPlay = sortByEstimatedValue(option.cards, evaluateCard, game)[0];
    return { score: cardToPlay.result.score, item: { type: 'projectCard', card: cardToPlay.source.name, payment: chooseHowToPay(game, option, cardToPlay.source) } };

  case PlayerInputType.SELECT_SPACE: {
    const title = typeof option.title === "string" ? option.title : option.title.message;
    if (title.match(/Convert (\d+) plants into greenery/)) {
      // Source: "2.1 Card Advantage"
      const sortedSpaces = sortByEstimatedValue(option.availableSpaces, evaluateSpace, game);
      return { score: sortedSpaces[0].result.score + 10, item: { type: 'space', spaceId: sortedSpaces[0].source } }
    }
    else {
      throw new Error("Unexpected SELECT_SPACE option " + title);
    }
  }
  case PlayerInputType.SELECT_OPTION:
    const title = typeof option.title === "string" ? option.title : option.title.message;
    var score = 0;
    if (title.match(/Take first action of.*/)) {
      // We definitely want to do that
      score = 100;
    }
    else if (option.buttonLabel.match(/Claim - \((.*)\)/)) {
      // Source: "1.1 Standard Cards"
      score = 25;
    }
    else if (title.match(/Convert (\d+) plants into greenery/)) {
      // Source: "2.1 Card Advantage"
      score = 19;
    }
    else if (title === 'Convert 8 heat into temperature') {
      // Source: "1.1 Standard Cards"
      score = 10;
    }
    /*
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
    */
    else if (title === 'Pass for this generation') {
      // Only pass when no "good" choices remain
      score = 0;
    }
    else if (title === 'Sell patents') {
      // Don't sell patents
      score = -101;
    }
    else if (title === "Don't place a greenery") {
      // always place greenery in the final phase
      score = -100;
    }
    else
    {
      const match = title.match(/Increase your ([a-z]+) production (\d+) step/);
      if (match && match.length === 3)
      {
        const generationsLeft = 14 - game.game.generation;
        score = +match[2] * bonusValues[match[1]] * generationsLeft;
      }
      else
      {
        const match = title.match(/Steal (\d+) ([a-zA-Z€]+)/)
        if (match && match.length === 3)
        {
          const resource = match[2];
          if (resource != 'M€' && resource != 'steel')
            throw new Error("Trying to steal unexpected resource type: " + resource);
          const amount = +match[1];
          const otherPlayers = game.players.filter(p => p.color != game.thisPlayer.color);
          if (otherPlayers.some(p => resource === 'M€' ? p.megaCredits : p.steel >= amount))
            score = amount * bonusValues[resource];
        } else {
          // any card or action with optional actions will come
          // through here, there are a lot of possible options
          score = -100;
          console.log('Could not evaluate option! ', option);
        }
      }
    }
    return { score, item: { type: 'option' } }
  
  
  default:
    throw new Error(`Unsupported optional player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateSpace (spaceId: SpaceId, game:PlayerViewModel) {
  // TODO: Also evaluate adjacent bonuses (points, megacredits, etc)
  var score = 0;
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
//  const adjacentSpaces = game.game.spaces.filter(s => s.y == space.y && s)
  return score;
}

function sortByEstimatedValue2<T,R>(sources:T[], evaluator: (t: T,game: PlayerViewModel) => { score: number, item: R }, game:PlayerViewModel): {result:{ score: number, item: R }, source:T}[] {
  // Evaluate all items
  return sources
    .map(source => ({result: evaluator(source, game), source}))
    .sort((n1,n2) => n2.result.score - n1.result.score);
}

// Choose corporation and initial cards
function sortByEstimatedValue<T>(sources:T[], evaluator: (t: T,game: PlayerViewModel) => number, game:PlayerViewModel): {result:{ score: number, item: undefined }, source:T}[] {
  // Evaluate all items
  return sortByEstimatedValue2(sources, (t:T, game2:PlayerViewModel) => ({ score: evaluator(t, game2), item: undefined }), game);
}

export function playInitialResearchPhase(game:PlayerViewModel, availableCorporations:CardModel[], availableCards:CardModel[]): InputResponse {
//  console.log(availableCorporations, availableCards, game);

  // Sort corporation by estimated value
  const sortedCorporations = sortByEstimatedValue(availableCorporations, evaluateCorporation, game);

  // Pick the best available corporation
  const corporation = sortedCorporations[0];

  // Pick the best available cards
  const initialCards = availableCards.filter(c => evaluateCard(c, game) > 3);

 // console.log('Quantum bot chose:', corporation, initialCards);
  return { 
    type: 'and', 
    responses: [
      { type: 'card', cards: [corporation.source.name]}, 
      { type: 'card', cards: initialCards.map(c => c.name)}
    ]
  };
}

// Choose how to pay for a given card (or amount)
function chooseHowToPay (game: PlayerViewModel, waitingFor: PlayerInputModel, card?: CardModel): Payment {
  // Prefer non-megacredit resources when available (in case there are not enough megacredits)
  var megaCredits = card ? card.calculatedCost : waitingFor.amount ?? 0;
  var heat = 0;
  if (waitingFor.canUseHeat) {
    heat = Math.min(game.thisPlayer.heat, megaCredits);
    megaCredits -= heat;
  }

  const projectCard = card ? getCard(card.name) : undefined;
  if (card && !projectCard) 
    throw new Error(`Could not find project card: ${card.name}`);
  var steel = 0;
  if ((waitingFor.canUseSteel || projectCard?.tags.includes(Tag.BUILDING))) {
    steel = Math.min(game.thisPlayer.steel, Math.floor(megaCredits / game.thisPlayer.steelValue));
    megaCredits -= steel * game.thisPlayer.steelValue;
    // If there aren't enough mega credits left, we may need to overshoot on steel.
    if (game.thisPlayer.megaCredits < megaCredits  && game.thisPlayer.steel > steel) {
      steel++;
      megaCredits = Math.max(0, megaCredits - game.thisPlayer.steelValue);
    }
  }
  var titanium = 0;
  if ((waitingFor.canUseTitanium || projectCard?.tags.includes(Tag.SPACE))) {
    titanium = Math.min(game.thisPlayer.titanium, Math.floor(megaCredits / game.thisPlayer.titaniumValue));
    megaCredits -= titanium * game.thisPlayer.titaniumValue;
    // If there still aren't enough mega credits left, we may need to overshoot on titanium.
    if (game.thisPlayer.megaCredits < megaCredits  && game.thisPlayer.titanium > titanium) {
      titanium++;
      megaCredits = Math.max(0, megaCredits - game.thisPlayer.titaniumValue);
    }
  }
  const microbes = 0;
  const floaters = 0;
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

// Play a turn of Terraforming Mars or respond to other choices
export function play(game:PlayerViewModel, option:PlayerInputModel): InputResponse {
//  console.log('Game is waiting for:', JSON.stringify(option, null, 2));
  switch (option.inputType) {
    case PlayerInputType.AND_OPTIONS:
      return evaluateOption(option, game).item;

    case PlayerInputType.OR_OPTIONS:
      // Sort playable options by estimated value
      return evaluateOption(option, game).item;

    case PlayerInputType.SELECT_AMOUNT:
      return { type: 'amount', amount: chooseRandomNumber(option.min, option.max) };

    case PlayerInputType.SELECT_CARD:
      if (option.title === 'Select card(s) to buy')
      {
        // Pick the best available cards
        // TODO reverse when "title": "Select a card to discard" / "buttonLabel": "Discard",
        const sortedCards = sortByEstimatedValue(option.cards, evaluateCard, game);
        var numberOfCards = option.min;
        while (numberOfCards < option.max && sortedCards[numberOfCards].result.score > 3) {
          numberOfCards++;
        }
        return { type: 'card', cards: sortedCards.slice(0, numberOfCards).map(c => c.source.name) };
      } else if (option.title === 'You cannot afford any cards') {
        return { type: 'card', cards: [] };
      }
      throw new Error ("Unexpected card action " + option.title);

    case PlayerInputType.SELECT_PAYMENT:
      return { type: 'payment', payment: chooseHowToPay(game, option)};

    case PlayerInputType.SELECT_INITIAL_CARDS:
      // shouldn't get here
      return playInitialResearchPhase(game, option.options[0].cards, option.options[1].cards);

    case PlayerInputType.SELECT_OPTION:
      return { type: 'option' };

    case PlayerInputType.SELECT_PLAYER:
      return { type: 'player', player: chooseRandomItem(option.players)};

    case PlayerInputType.SELECT_SPACE:
      /*
      switch(option.title)
      {
        case 'Select space for city tile':
          return evaluateSpace(sortByEstimatedValue(option.availableSpaces, evaluateSpace, game)[0], game);
        case 'Select space for greenery tile':
          return evaluateSpace(sortByEstimatedValue(option.availableSpaces, evaluateSpace, game)[0], game);
        case 'Select space for ocean tile':
          return evaluateSpace(sortByEstimatedValue(option.availableSpaces, evaluateSpace, game)[0], game);
        default:
          return evaluateSpace(sortByEstimatedValue(option.availableSpaces, evaluateSpace, game)[0], game);
      }
      */
      const sortedSpaces = sortByEstimatedValue(option.availableSpaces, evaluateSpace, game);
      return { type: 'space', spaceId: sortedSpaces[0].source };

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
    case 'symbol' : return 0;
    default: return 0;
  }
}
function evaluateTriggerCardComponent(cardComponent: MyCardComponent, game: PlayerViewModel) {
  switch (cardComponent.is) {
    case 'root' : return evaluateTriggerCardComponents(cardComponent.rows, game);
    case 'effect' : return evaluateTriggerEffect(cardComponent.rows, game);
    case 'production-box' : return 0;
    case 'tile' : return 0;
    case 'item' : return 0;
    case 'symbol' : return 0;
    default: return 0;
  }
}
function evaluateCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel) {
  var score = 0;
  cardComponents.forEach(c => c.forEach(component => score += evaluateCardComponent(component, game)));
  return score;
}

function evaluateTriggerCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel) {
  var score = 0;
  // todo: handle OR
  cardComponents.forEach(c => c.forEach(component => score += evaluateTriggerCardComponent(component, game)));
  return score;
}

function evaluateTriggerEffect(effect: MyCardComponent[][], game: PlayerViewModel) {
  if (effect.length !== 3 || effect[1].length !== 1 || effect[1][0].is !== 'symbol')
    throw new Error("Cannot understand effect that doesn't have 3 rows with a symbol in the middle: " + JSON.stringify(effect));
  var cost = 0;
  switch (effect[1][0].type) {
    // when x do y
    case ':':
      break;
    // spend x to do y
    case '->':
      cost = evaluateCardComponent(effect[0][0], game);
      break;
    case 'OR':
      break;
    default:
      throw new Error("Cannot understand effect that has this symbol in the middle: " + JSON.stringify(effect));

  }
  const benifit = evaluateCardComponent(effect[2][0],game);
  return benifit - cost;
}

function evaluateEffect(effect: MyCardComponent[][], game: PlayerViewModel) {
  if (effect.length !== 3 || effect[1].length !== 1 || effect[1][0].is !== 'symbol')
    throw new Error("Cannot understand effect that doesn't have 3 rows with a symbol in the middle: " + JSON.stringify(effect));
  var cost = 0;
  var occurences = 14 - game.game.generation;
  switch (effect[1][0].type) {
    // when x do y
    case ':':
      occurences = 5; // TODO: total guess
      break;
    // spend x to do y
    case '->':
      cost = evaluateCardComponent(effect[0][0], game);
      break;
    case 'OR':
      break;
    default:
      throw new Error("Cannot understand effect that has this symbol in the middle: " + JSON.stringify(effect));

  }
  const benifit = evaluateCardComponent(effect[2][0],game);
  return (benifit - cost)*occurences;
}

function evaluateProduction(rows: MyCardComponent[][], game: PlayerViewModel) {
  return parseRows(rows, game);
}

function evaluateTile(cardComponent: CardRenderTile, game: PlayerViewModel) {
  var score = 4; // best case for tile placement but figuring out available spaces is hard
  if (cardComponent.tile === TileType.GREENERY || cardComponent.tile === TileType.OCEAN)
    score += 10;
  return score;
}

const bonusValues = {
  'cards': 2,
  'card': 2,
  'city': 9, // Source: "4.5 Points from City"
  'heat': 1,
  'megacredits': 1,
  'megacredit': 1,
  'M€': 1,
  'oceans': 14,
  'ocean': 14,
  'oxygen': 10,
  'plants': 2,
  'plant': 2,
  'steel': 2,
  'temperature': 10,
  'titanium': 2,
  'tr': 10,
  'trs': 10,
  // these needs more detail
  'microbes': 1, 
  'animals': 2,
  'microbe': 1, 
  'animal': 2,
};
function evaluateItem(cardComponent: CardRenderItem, game: PlayerViewModel) {
  // if this is affecting other players then the value 
  // is lower the more player there are
  const divider = cardComponent.anyPlayer ? game.players.length : 1
  if (bonusValues[cardComponent.type])
    return bonusValues[cardComponent.type] * cardComponent.amount / divider;
  return 0;
}

// reduce value by one point per missing requirement
// reduce to -100 for exceeded requirements 
function checkRequirement(requirement: ICardRequirement, level: number): number {
  if (requirement.isMax)
    if (level > requirement.amount)
      return -100;
    else
      return requirement.amount - level; 
  else
    if (level >= requirement.amount)
      return 0;
    else
      return level - requirement.amount;
}

function evaluateRequirement(requirement: ICardRequirement, game: PlayerViewModel) {
  switch(requirement.type){
    case RequirementType.OXYGEN:
      return checkRequirement(requirement, game.game.oxygenLevel);
    case RequirementType.TEMPERATURE:
      return checkRequirement(requirement, game.game.temperature);
    case RequirementType.OCEANS:
      return checkRequirement(requirement, game.game.oceans);
    case RequirementType.TAG:
      var tagRequirement = requirement as ITagCardRequirement;
      return checkRequirement(requirement, game.thisPlayer.tags.find(tag => tag.tag === tagRequirement.tag)?.count ?? 0);
    case RequirementType.GREENERIES:
      return checkRequirement(requirement, requirement.isAny ? game.players.reduce((sum, p) => sum+p.victoryPointsBreakdown.greenery,0) : game.thisPlayer.victoryPointsBreakdown.greenery);
    case RequirementType.CITIES:
      return checkRequirement(requirement, requirement.isAny ? game.players.reduce((sum, p) => sum+p.citiesCount,0) : game.thisPlayer.citiesCount);
    default:
      return -100;
  }
}

