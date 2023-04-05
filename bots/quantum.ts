import type { PlayerViewModel } from '../terraforming-mars/src/common/models/PlayerModel.js'
import { getCard } from './ClientCardManifest.js';
import { Tag } from '../terraforming-mars/src/common/cards/Tag.js';
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
import { ICardRenderDynamicVictoryPoints } from '../terraforming-mars/src/common/cards/render/ICardRenderDynamicVictoryPoints.js';
import { SpaceType } from '../terraforming-mars/src/common/boards/SpaceType.js';
import { ClientCard } from '../terraforming-mars/src/common/cards/ClientCard.js';
import { SpaceModel } from '../terraforming-mars/src/common/models/SpaceModel.js';
import { SpaceBonus } from '../terraforming-mars/src/common/boards/SpaceBonus.js';
import { CardName } from '../terraforming-mars/src/common/cards/CardName.js';

// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// Quantum Bot -- heavily inspired by https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy

// To test this bot, run this command:
//   node play-bot --bot=quantum

// target Quantum bot (100 games): average 50.69 points (min 30, max 72)
// from https://github.com/terraforming-mars/terraforming-mars/issues/1094

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

function parseRows (rows: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  var totalScore = 0;
  for (const row of rows) {
    totalScore += parseRow(row, game, card);
  }
  return totalScore;
}

function parseRow(row: MyCardComponent[], game: PlayerViewModel, card?:ClientCard) {
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
            const result = Math.max(firstPart, secondPart);
            if (result === secondPart)
              preferedOptionFromLastCard += 1;
            return result;
          case '/': 
            const production = parseRow(row.slice(0, index), game);
            const per = row[index+1];
            if (per.is !== 'item')
              throw new Error("Unexpected 'per' in" + JSON.stringify(row));
            var count = 0;
            if (per.isPlayed)
              count = per.anyPlayer 
                ? game.players.reduce((sum,p) => sum + (p.tags.find(tag => tag.tag === per.type)?.count ?? 0),0) 
                : (game.thisPlayer.tags.find(tag => tag.tag === per.type)?.count ?? 0)
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
          rowScore += evaluateItem(item, game, card) * generationsLeft * multiplier;
          break;
        default:
          throw new Error(`Unexpected element in card '${card?.name}':  ${item.is}`);
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
  if (game.players.length < 2)
    return 0;
  if (typeof victoryPoints === 'number') {
    return victoryPointValue * victoryPoints;
  } else if ((victoryPoints as any).per !== undefined){
    const points = victoryPoints as IVictoryPoints;
    // todo take into account how many we will pick up during the game
    if(points.type === "resource")
        return 0;
    return Math.floor((game.thisPlayer.tags.find(tag => tag.tag === points.type)?.count ?? 0) / points.per) * points.points * victoryPointValue;
  } else if ((victoryPoints as any).target !== undefined){
    const points = victoryPoints as any as ICardRenderDynamicVictoryPoints;
    const type = points.item?.type as string;
    // type could be a type of tag or a type of resouce (this code only works for existing tags)
    // todo take into account how many we will pick up during the game
    return Math.floor((game.thisPlayer.tags.find(tag => tag.tag === type)?.count ?? 0) / points.target) * points.points * victoryPointValue;
  }
}

function evaluateProductionBox(productionBox: Units, game: PlayerViewModel) {
  return 0; // sadly this box doesn't include anything useful
}

  // Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCard (cardInstance: CardModel, game: PlayerViewModel) {
  preferedOptionFromLastCard = 0;
  tileFromLastCardEvaluated = undefined;
  if (cardInstance.isDisabled)
    return -10000;
  var score = -cardInstance.calculatedCost;
  const card = getCard(cardInstance.name);
  if (card && card.victoryPoints)
    score += evaluateVictoryPoints(card.victoryPoints, game);

  if (card.productionBox)
    score += evaluateProductionBox(card.productionBox, game);
  if (card.metadata.renderData)
    score += evaluateCardComponent(card.metadata.renderData as MyCardComponent, game, card);

  if (card.requirements)
    card.requirements.requirements.forEach(requirement => score += evaluateRequirement(requirement, game));
  return score;
}

function evaluateTriggerCard (cardInstance: CardModel, game: PlayerViewModel) {
  if (cardInstance.isDisabled)
    return -10000;
  const card = getCard(cardInstance.name);
  if (card && card.metadata.renderData)
    return evaluateTriggerCardComponent(card.metadata.renderData as MyCardComponent, game, card);

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
    if (sortedOptions.every(o => o.result.score === bestOption.result.score) && (preferedOptionFromLastCard < option.options.length))
      return { score: 1, item: { type: 'or', index: preferedOptionFromLastCard, response: { type: 'option' }}};
    const choice = option.options.indexOf(bestOption.source);
    return { score: bestOption.result.score, item: { type: 'or', index: choice, response: bestOption.result.item }};

  case PlayerInputType.SELECT_CARD: {
    const title = typeof option.title === "string" ? option.title : option.title.message;
    var bestCard: {result:{score:number}, source: CardModel};
    if (title === "Sell patents")
      return { score: -100, item: {type: 'card', cards: []}};
    else if (title === "Standard projects") {
      console.log(`Standard projects : ${option.cards.map(c => `${c.name}(${evaluateTriggerCard(c, game)})`).join(", ")}`);
      bestCard = sortByEstimatedValue(option.cards, evaluateTriggerCard, game)[0];
    } else if (title === 'Select a card to discard') {
      console.log(`Discard from : ${option.cards.map(c => `${c.name}(${evaluateTriggerCard(c, game)})`).join(", ")}`);
      bestCard = sortByEstimatedValue(option.cards, evaluateTriggerCard, game)[option.cards.length-1];
    } else if (title === 'Perform an action from a played card') {
      console.log(`Events : ${option.cards.map(c => `${c.name}(${evaluateTriggerCard(c, game)})`).join(", ")}`);
      bestCard = sortByEstimatedValue(option.cards, evaluateTriggerCard, game)[0];
    } else {
      const match = title.match(/([A|a]dd|[R|r]emove)\s*(\d*) (\w+)/)
      if (match && (match.length >= 3))
        // TODO: pick the best card to send the resource to
        return { score: 10, item: {type: 'card', cards: [option.cards[0].name]}};
      else
        throw new Error(`Unsupported card selection title (${option.title})`);
    } 
    return { score: bestCard.result.score, item: {type: 'card', cards: [bestCard.source.name]}};
  }
  case PlayerInputType.SELECT_PROJECT_CARD_TO_PLAY:
    const cardToPlay = sortByEstimatedValue(option.cards, evaluateCard, game)[0];
    return { score: cardToPlay.result.score, item: { type: 'projectCard', card: cardToPlay.source.name, payment: chooseHowToPay(game, option, cardToPlay.source) } };

  case PlayerInputType.SELECT_SPACE: {
    const title = typeof option.title === "string" ? option.title : option.title.message;
    if (title.match(/Convert (\d+) plants into greenery/) || 
        (title === 'Select space for greenery tile')) {
      // Source: "2.1 Card Advantage"
      const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => evaluateSpace(space, game, TileType.GREENERY, false, false, true)
      const sortedSpaces = sortByEstimatedValue(option.availableSpaces, evaluateThisSpace, game);
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
    else if (game.game.awards.some(a => a.name === title)) {
      // don't fund awards, it is too hard to work out
      score = -100;
    }
    else
    {
      const match = title.match(/Increase your ([a-z]+) production (\d+) step/);
      if (match && (match.length === 3))
      {
        const generationsLeft = 14 - game.game.generation;
        score = +match[2] * bonusValues(match[1], game) * generationsLeft;
      }
      else
      {
        const match = title.match(/Steal (\d+) ([a-zA-Z€]+)/)
        if (match && (match.length === 3))
        {
          const resource = match[2];
          if ((resource !== 'M€') && (resource !== 'steel'))
            throw new Error("Trying to steal unexpected resource type: " + resource);
          const amount = +match[1];
          const otherPlayers = game.players.filter(p => p.color != game.thisPlayer.color);
          if (otherPlayers.some(p => resource === 'M€' ? p.megaCredits : p.steel >= amount))
            score = amount * bonusValues(resource, game);
        } else {
          // any card or action with optional actions will come
          // through here, there are a lot of possible options
          // give it a low but positive score because most actions are useful
          score = 1;
          console.log('Could not evaluate option! ', option);
        }
      }
    }
    return { score, item: { type: 'option' } }
  
  
  default:
    throw new Error(`Unsupported optional player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}

const adjacent = (space: SpaceModel, game:PlayerViewModel) => game.game.spaces.filter(s => 
  ((s.y === space.y) && (Math.abs(s.x - space.x) === 1)) || 
  ((Math.abs(s.y - space.y) === 1) && ((s.x === space.x - space.y % 2) || (s.x === space.x + 1 - space.y % 2)) ));

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateSpace (spaceId: SpaceId, game:PlayerViewModel, tileType: TileType, oceanOnly: boolean, ignoreRestrictions: boolean, restrictionsApplied: boolean) {
  // TODO: Also evaluate adjacent bonuses (points, megacredits, etc)
  var score = 0;
  const space = game.game.spaces.find(space => spaceId === space.id);
  if (space.tileType) // space already used
    return 0;
  if (!restrictionsApplied && (oceanOnly !== (space.spaceType === SpaceType.OCEAN)))
    return 0;
  for (const bonus of space.bonus)
    score += bonusValues(SpaceBonus.toString(bonus).toLowerCase(),game);
  const adjacentSpaces = adjacent(space, game);
  // ocean adjacent bonus
  score += adjacentSpaces.filter(s => s.tileType === TileType.OCEAN).length * 2;
  if ((tileType === TileType.CITY) || (tileType === TileType.CAPITAL))
  {
    if (adjacentSpaces.some(s => (s.tileType === TileType.CITY) || (tileType === TileType.CAPITAL)) 
        && !ignoreRestrictions
        && !restrictionsApplied)
      return -100;
    if (game.players.length < 2)
      return score;
    score += adjacentSpaces.filter(s => s.tileType === TileType.GREENERY).length * victoryPointValue;
    // each adjacent space is worth 1 point because I could put a greenery there
    // but reduce that if there is already an oposing city adjacent to the space
    // and increase it if there is one of my citied adjacent
    const possibleGreenerySpaces = adjacentSpaces.filter(s => (s.spaceType === SpaceType.LAND) && !s.tileType);
    possibleGreenerySpaces.forEach(greenerySpace => {
      const adjacentCities = adjacent(greenerySpace,game).filter(possibleCity => possibleCity.tileType === TileType.CITY);
      const myCities = adjacentCities.filter(citySpace => citySpace.color === game.thisPlayer.color).length;
      const opositionCities = adjacentCities.length - myCities;
      score += 1 + myCities - opositionCities;
    });
  }
  else if (tileType === TileType.GREENERY)
  {
    // greenery has to be adjacent to existing plants
    if (game.game.spaces.filter(s => s.color === game.thisPlayer.color).some &&
        !adjacentSpaces.filter(s => s.color === game.thisPlayer.color).some &&
        !ignoreRestrictions &&
        !restrictionsApplied)
        return -100;

    if (game.players.length < 2)
      return score;
    score += adjacentSpaces.filter(s => (s.tileType === TileType.CITY) && (s.color === game.thisPlayer.color)).length * victoryPointValue
    score -= adjacentSpaces.filter(s => (s.tileType === TileType.CITY) && (s.color !== game.thisPlayer.color)).length * victoryPointValue / (game.players.length - 1)
  }
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

function playInitialResearchPhase(game:PlayerViewModel, availableCorporations:CardModel[], availableCards:CardModel[]): InputResponse {

  // Sort corporation by estimated value
  const sortedCorporations = sortByEstimatedValue(availableCorporations, evaluateCorporation, game);

  // Pick the best available corporation
  const corporation = sortedCorporations[0];

  // Pick the best available cards
  const initialCards = availableCards.filter(c => evaluateCard(c, game) > 3);

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

  const projectCard = card ? getCard(card.name) : undefined;
  if (card && !projectCard) 
    throw new Error(`Could not find project card: ${card.name}`);
  var steel = 0;
  if ((waitingFor.canUseSteel || projectCard?.tags.includes(Tag.BUILDING))) {
    steel = Math.min(game.thisPlayer.steel, Math.floor(megaCredits / game.thisPlayer.steelValue));
    megaCredits -= steel * game.thisPlayer.steelValue;
    // If there aren't enough mega credits left, we may need to overshoot on steel.
    if (game.thisPlayer.megaCredits < megaCredits && (game.thisPlayer.steel > steel)) {
      steel++;
      megaCredits = Math.max(0, megaCredits - game.thisPlayer.steelValue);
    }
  }
  var titanium = 0;
  if ((waitingFor.canUseTitanium || projectCard?.tags.includes(Tag.SPACE))) {
    titanium = Math.min(game.thisPlayer.titanium, Math.floor(megaCredits / game.thisPlayer.titaniumValue));
    megaCredits -= titanium * game.thisPlayer.titaniumValue;
    // If there still aren't enough mega credits left, we may need to overshoot on titanium.
    if (game.thisPlayer.megaCredits < megaCredits && (game.thisPlayer.titanium > titanium)) {
      titanium++;
      megaCredits = Math.max(0, megaCredits - game.thisPlayer.titaniumValue);
    }
  }

  // only use heat if there is not enough other resources
  var heat = 0;
  if (waitingFor.canUseHeat && megaCredits > game.thisPlayer.megaCredits) {
    heat = megaCredits - game.thisPlayer.megaCredits;
    megaCredits -= heat;
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

function getTypeType(name:string) {
  for(const testTileType of Object.keys(TileType))
    if (TileType.toString(TileType[testTileType]) === name)
      return TileType[testTileType] as any as TileType;
  return undefined;
}

var tileFromLastCardEvaluated:TileType|undefined;
var preferedOptionFromLastCard = 0;

// Play a turn of Terraforming Mars or respond to other choices
export function play(game:PlayerViewModel, option:PlayerInputModel): InputResponse {
  const title = typeof option.title === "string" ? option.title : option.title.message;
  switch (option.inputType) {
    case PlayerInputType.AND_OPTIONS:
      return evaluateOption(option, game).item;

    case PlayerInputType.OR_OPTIONS:
      // Sort playable options by estimated value
      // if no useful actions are found increase the value of victory points until one is found
      var response: InputResponse = null;
      for(victoryPointValue = 5; victoryPointValue < 25; victoryPointValue++) {
        const bestOption = evaluateOption(option, game);
        response = bestOption.item;
        if (bestOption.score > 0)
          break;
      }

      console.log();
      console.log(`Player resources :M(${game.thisPlayer.megaCredits}),steel(${game.thisPlayer.steel}),titanium(${game.thisPlayer.titanium}),plants(${game.thisPlayer.plants}),energy(${game.thisPlayer.energy}),heat(${game.thisPlayer.heat}),cards(${game.thisPlayer.cardsInHandNbr})`);
      console.log(`Player cards : ${game.cardsInHand.map(c => `${c.name}(${c.calculatedCost},${evaluateCard(c, game)})`).join(", ")}`);
      if (response.type === 'or')
        if (response.response.type === 'projectCard')
          console.log("Played card: " + response.response.card);
        else if (response.response.type === 'card')
          console.log("Played action: " + response.response.cards[0]);
        else if (response.response.type === 'option')
          console.log("Played option: ", option.options[response.index].title);
        else 
          console.log("Played unexpected: " + response.response.type);

      // this is a bit of a hack:
      // the last thing we do before sending off our move is to evaluate 
      // the card we are going to play, this will set the tileFromLastCardEvaluated
      // which we wil then use when choosing the space for the tile
      if (response.type === 'or')
      {
        var cardName:CardName;
        if (response.response.type === 'projectCard')
          cardName = response.response.card;
        else if (response.response.type === 'card')
          cardName = response.response.cards[0];
        const card = getCard(cardName)?.metadata?.renderData;
        if (card)
          evaluateCardComponent(card as MyCardComponent, game);
      }
      return response;

    case PlayerInputType.SELECT_AMOUNT:
      return { type: 'amount', amount: chooseRandomNumber(option.min, option.max) };

    case PlayerInputType.SELECT_CARD:
      if (title.match(/Select\s*\d* card\(s\) to (buy|keep)/) ||
          (title === 'Select builder card to copy') ||
          title.startsWith('Select a card to keep and pass the rest to') ||
          (title === "Select a card to discard"))
      {
        console.log(`Cards for sale : ${option.cards.map(c => `${c.name}(${c.calculatedCost},${evaluateCard(c, game)})`).join(", ")}`);
        
        // Pick the best available cards
        // TODO reverse when "title": "Select a card to discard" / "buttonLabel": "Discard",
        const sortedCards = sortByEstimatedValue(option.cards, evaluateCard, game);
        const invert = (title === "Select a card to discard") ? -1 : 1;
        var numberOfCards = option.min;
        while ((numberOfCards < option.max) && (sortedCards[numberOfCards].result.score * invert > 3)) {
          numberOfCards++;
        }
        return { type: 'card', cards: sortedCards.slice(0, numberOfCards).map(c => c.source.name) };
      } else if (title === 'You cannot afford any cards') {
        return { type: 'card', cards: [] };
      } else {
        const match = title.match(/([A|a]dd|[R|r]emove)\s*(\d*) (\w+)/);
        if (match && (match.length > 0))
        {
          // ideally we should chose the best place to put the resource
          // but often there is only one option
          return { type: 'card', cards: [ option.cards[0].name ] };
        }
      } 
      throw new Error ("Unexpected card action " + option.title);

    case PlayerInputType.SELECT_PAYMENT:
      return { type: 'payment', payment: chooseHowToPay(game, option)};

    case PlayerInputType.SELECT_INITIAL_CARDS:
      return playInitialResearchPhase(game, option.options[0].cards, option.options[1].cards);

    case PlayerInputType.SELECT_OPTION:
      return { type: 'option' };

    case PlayerInputType.SELECT_PLAYER:
      return { type: 'player', player: chooseRandomItem(option.players)};

    case PlayerInputType.SELECT_SPACE:
      var tileType = tileFromLastCardEvaluated;
      if (tileType === undefined)
      {
        if (title === "Select space for claim")
        {
          const availableTileTypes = [
            TileType.GREENERY,
            TileType.OCEAN,
            TileType.CITY
          ];  // should also add tiles in hand
          var bestSpace: {result:{score:number}, source:string} = null;
          availableTileTypes.forEach(tileType => {
            const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => evaluateSpace(space, game, tileType, false, false, true)
            const sortedSpaces = sortByEstimatedValue(option.availableSpaces, evaluateThisSpace, game);
            if (bestSpace == null || sortedSpaces[0].result.score > bestSpace.result.score)
              bestSpace = sortedSpaces[0]
          });
          return { type: 'space', spaceId: bestSpace.source };
        }
        const match = title.match(/ocean|city|greenery/);
        if (match)
          tileType = getTypeType(match[0]);
        if (tileType === undefined)
          throw new Error(`Unknown tile type in '${title}'.  Match : ${JSON.stringify(match)}.`);
      }

      const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => evaluateSpace(space, game, tileType, false, false, true)

      const sortedSpaces = sortByEstimatedValue(option.availableSpaces, evaluateThisSpace, game);
      return { type: 'space', spaceId: sortedSpaces[0].source };

    case PlayerInputType.SELECT_PRODUCTION_TO_LOSE:
      return { type: 'productionToLose', units: Units.EMPTY };

    default:
      throw new Error(`Unsupported player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}
function evaluateCardComponent(cardComponent: MyCardComponent, game: PlayerViewModel, card?:ClientCard) {
  switch (cardComponent?.is) {
    case 'root' : return evaluateCardComponents(cardComponent.rows, game, card);
    case 'effect' : return evaluateEffect(cardComponent.rows, game, card);
    case 'production-box' : return evaluateProduction(cardComponent.rows, game, card);
    case 'tile' : return evaluateTile(cardComponent, game, card);
    case 'item' : return evaluateItem(cardComponent, game, card);
    case 'symbol' : return 0;
    default: return 0;
  }
}
function evaluateTriggerCardComponent(cardComponent: MyCardComponent, game: PlayerViewModel, card?:ClientCard) {
  switch (cardComponent.is) {
    case 'root' : return evaluateTriggerCardComponents(cardComponent.rows, game, card);
    case 'effect' : return evaluateTriggerEffect(cardComponent.rows, game, card);
    case 'production-box' : return 0;
    case 'tile' : return 0;
    case 'item' : return 0;
    case 'symbol' : return 0;
    default: return 0;
  }
}
function evaluateCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  var score = 0;
  cardComponents.forEach(c => c.forEach(component => score += evaluateCardComponent(component, game, card)));
  return score;
}

function evaluateTriggerCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  var score = 0;
  // todo: handle OR
  cardComponents.forEach(c => c.forEach(component => score += evaluateTriggerCardComponent(component, game, card)));
  return score;
}

function evaluateTriggerEffect(effect: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  if ((effect.length !== 3) || (effect[1].length !== 1) || (effect[1][0].is !== 'symbol'))
    throw new Error("Cannot understand effect that doesn't have 3 rows with a symbol in the middle: " + JSON.stringify(effect));
  var cost = 0;
  switch (effect[1][0].type) {
    // when x do y
    case ':':
      break;
    // spend x to do y
    case '->':
      cost = evaluateCardComponent(effect[0][0], game, card);
      break;
    case 'OR':
      break;
    default:
      throw new Error("Cannot understand effect that has this symbol in the middle: " + JSON.stringify(effect));

  }
  // the benifit of an event is never negative, 
  // but reduced card costs can look negative so make them positive
  var benifit = 0;
  effect[2].forEach(c => benifit += Math.abs(evaluateCardComponent(c,game)));
  return benifit - cost;
}

function evaluateEffect(effect: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  if ((effect.length !== 3) || (effect[1].length !== 1) || (effect[1][0].is !== 'symbol'))
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
      cost = evaluateCardComponent(effect[0][0], game, card);
      break;
    case 'OR':
      break;
    default:
      throw new Error(`Cannot understand effect on card '${card?.name}' that has this symbol in the middle: ${JSON.stringify(effect)}`);

  }
  // the benifit of an event is never negative, 
  // but reduced card costs can look negative so make them positive
  const benifit = Math.abs(evaluateCardComponent(effect[2][0],game));
  return (benifit - cost)*occurences;
}

function evaluateProduction(rows: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  return parseRows(rows, game, card);
}

function evaluateTile(cardComponent: CardRenderTile, game: PlayerViewModel, card?:ClientCard) {
  tileFromLastCardEvaluated = cardComponent.tile;
  return bonusValues(TileType.toString(cardComponent.tile), game, card)
}

var victoryPointValue = 5;

function bonusValues(type: string, game: PlayerViewModel, card?:ClientCard) {
  if (type.endsWith("s"))
    type = type.slice(0, -1);
  const basicValues = {
  'card': 2,
  'draw card': 2,
  'heat': 1,
  'energy': 1,
  'megacredit': 1,
  'M€': 1,
  'plant': 2,
  'steel': 2,
  'titanium': 2,
  // these needs more detail
  'science': 2,
  'microbes': 1, 
  'animals': 2,
  'microbe': 1, 
  'animal': 2,
  'fighter': game.players.length < 2 ? 0 : victoryPointValue
  };
  if (basicValues[type])
    return basicValues[type];

  var trs = {
  'ocean': victoryPointValue,
  'greenery': victoryPointValue * 2,
  'oxygen': victoryPointValue,
  'temperature': victoryPointValue,
  'tr': victoryPointValue,
  };
  if (game.players.length < 2)
  {
    trs.greenery -= victoryPointValue;
    if (!game.game.gameOptions.soloTR)
      trs.tr -= victoryPointValue;
  }
  if ((game.game.oceans === 9) && (type === 'ocean'))
    return 0;
  if ((game.game.temperature === 8) && (type === 'temperature'))
    return 0;
  if (game.game.oxygenLevel === 14)
    if (type === 'oxygen')
      return 0;
    else
      trs.greenery -= victoryPointValue + 14 - game.game.generation;

  var score = 0;
  if (trs[type])
    score += trs[type] + 14 - game.game.generation;
  const tileType = getTypeType(type)
  if (tileType !== undefined)
  {
    const description = (typeof(card?.metadata?.description) === 'string' ? card?.metadata?.description : card?.metadata?.description?.text) ?? "";
    const oceanSpace = description.includes("ON AN AREA RESERVED FOR OCEAN") || ((tileType === TileType.OCEAN) && !description.includes("ON AN AREA NOT RESERVED FOR OCEAN"));
    const ignoreRestrictions = description.includes("placement restrictions");
    const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => evaluateSpace(space, game, tileType, oceanSpace, ignoreRestrictions, false)
    const bestSpaces = sortByEstimatedValue(game.game.spaces.map(s => s.id), evaluateThisSpace, game);
    if (bestSpaces.some && (bestSpaces[0].result.score > 0))
      score += bestSpaces[0].result.score;
  }
  else if ((type !== 'text') && (trs[type] === undefined))
    console.log("Unknown resouce type: " + type);
  return score;
}
function evaluateItem(cardComponent: CardRenderItem, game: PlayerViewModel, card?:ClientCard) {
  // if this is affecting other players then the value 
  // is lower the more player there are
  const divider = cardComponent.anyPlayer 
    ? game.players.length < 2
      ? -10000
      : -game.players.length
    : 1;
  var amount = cardComponent.amount;
  // for some reson some cards show amount of -1 even thought they are avtually +1
  if ((cardComponent.type === 'city') || (cardComponent.type === 'greenery'))
    amount = Math.abs(amount);
  return bonusValues(cardComponent.type, game, card) * amount / divider;
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

