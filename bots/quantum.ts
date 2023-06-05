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
import { IBot } from './IBot.js';
import { CardType } from '../terraforming-mars/src/common/cards/CardType.js';

// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// Quantum Bot -- heavily inspired by https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy

// To test this bot, run this command:
//   node play-bot --bot=quantum

// target Quantum bot (100 games): average 50.69 points (min 30, max 72)
// from https://github.com/terraforming-mars/terraforming-mars/issues/1094

export class quantum implements IBot {

// Source: "6. Corporations" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
evaluateCorporation (corporation: CardModel, game:PlayerViewModel) {
  switch (corporation.name) {
    case 'Saturn Systems':
      return 57 + game.dealtProjectCards.filter(c => getCard(c.name).tags.includes(Tag.JOVIAN)).length * 5;
    case 'Teractor':
      return 60 + game.dealtProjectCards.filter(c => getCard(c.name).tags.includes(Tag.EARTH)).length * 3;
    case 'Tharsis Republic':
      return 40 + this.bonusValues("city", game) + this.remainingGenerations(game);
    case 'Helion':
      return 42 + this.bonusValues("heat", game) * 3 * this.remainingGenerations(game);
    case 'Interplanetary Cinematics':
      return 30 + this.bonusValues("steel", game) * 20  + game.dealtProjectCards.filter(c => getCard(c.name).tags.includes(Tag.EVENT)).length * 2;
    case 'Mining Guild':
      return 30 + this.bonusValues("steel", game) * (5 + this.remainingGenerations(game)); // TODO: Plus 8M for each bonus Steel Production you can gain early.
    case 'PhoboLog':
      return 23 + (this.bonusValues("titanium", game) + 1) * 10;
    case 'CrediCor':
      return 57 + game.dealtProjectCards.filter(c => c.calculatedCost >= 20).length * 4;
    case 'EcoLine':
      return 36 + this.bonusValues("plant", game) * (8/7) * (3 + 2 * this.remainingGenerations(game));
    case 'United Nations Mars Initiative':
      return 40;  // TODO
    case 'Inventrix':
      return 45 + this.bonusValues("card", game) * 3; // TODO: +4M if that Science Symbol fulfills the requirement of cards you plan to play early.
    case 'Thorgate':
      return 48 + this.bonusValues("energy", game) * this.remainingGenerations(game) + game.dealtProjectCards.filter(c => getCard(c.name).tags.includes(Tag.POWER)).length * 3;
    default:
      throw new Error(`Unsupported corporation! ${corporation.name}`);
  }
}

parseRows (rows: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  var totalScore = 0;
  for (const row of rows) {
    totalScore += this.parseRow(row, game, card);
  }
  return totalScore;
}

parseRow(row: MyCardComponent[], game: PlayerViewModel, card?:ClientCard) {
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
            const conditionTimes = this.howManyTimesWillOccur(condition);
            const effectValue = this.parseRow(row.slice(index+1), game);
            return conditionTimes * effectValue;
          case '->':
            // action: spend cost, get benifit
            const cost = this.parseRow(row.slice(0, index), game);
            const benifit = this.parseRow(row.slice(index+1), game);
            const netBenifit = (benifit - cost) * this.remainingGenerations(game);
            return netBenifit;
          case 'OR': 
            const firstPart = this.parseRow(row.slice(0, index), game);
            const secondPart = this.parseRow(row.slice(index+1), game);
            const result = Math.max(firstPart, secondPart);
            if (result === secondPart)
              this.preferedOptionFromLastCard += 1;
            return result;
          case '/': 
            const production = this.parseRow(row.slice(0, index), game);
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
          rowScore += this.evaluateItem(item, game, card, true) * this.remainingGenerations(game) * multiplier;
          break;
        default:
          throw new Error(`Unexpected element in card '${card?.name}':  ${item.is}`);
    }
  }
  return rowScore;
}

howManyTimesWillOccur(condition: MyCardComponent[]) {
  // TODO: guess better
  return 1;
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
evaluateVictoryPoints (victoryPoints: number | 'special' | IVictoryPoints | ICardRenderDynamicVictoryPoints, game: PlayerViewModel, cardName: string) {
  if (game.players.length < 2)
    return 0;
  if (typeof victoryPoints === 'number') {
    return this.victoryPointValue * victoryPoints;
  } else if ((victoryPoints as IVictoryPoints).per !== undefined){
    const points = victoryPoints as IVictoryPoints;
    // todo take into account how many we will pick up during the game
    if(points.type === "resource")
        return 0;
    return Math.floor((game.thisPlayer.tags.find(tag => tag.tag === points.type)?.count ?? 0) / points.per) * points.points * this.victoryPointValue;
  } else if ((victoryPoints as ICardRenderDynamicVictoryPoints).target !== undefined){
    const points = victoryPoints as any as ICardRenderDynamicVictoryPoints;
    const type = points.item?.type as string;
    // type could be a type of tag or a type of resouce (this code only works for existing tags)
    // todo take into account how many we will pick up during the game
    return Math.floor((game.thisPlayer.tags.find(tag => tag.tag === type)?.count ?? 0) / points.target) * points.points * this.victoryPointValue;
  } else if (victoryPoints === 'special') {
    switch (cardName) {
      case 'Capital': return 3 * this.victoryPointValue;
      case 'Immigration Shuttles': return 3 * this.victoryPointValue;
      case 'Search For Life': return 3 * this.victoryPointValue;
      case 'Commercial District': return 2 * this.victoryPointValue;
    }
    console.log("Unexpected special victory points on card " + cardName);
    return 0;
  }
}

evaluateProductionBox(productionBox: Units, game: PlayerViewModel) {
  return 0; // sadly this box doesn't include anything useful
}

  // Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
public evaluateCard (cardInstance: CardModel, game: PlayerViewModel) {
  this.preferedOptionFromLastCard = 0;
  this.tileFromLastCardEvaluated = undefined;
  if (cardInstance.isDisabled)
    return -10000;
  const card = getCard(cardInstance.name);
  var score = -(cardInstance.calculatedCost == null ? card.cost : cardInstance.calculatedCost);
  if (card && card.victoryPoints)
    score += this.evaluateVictoryPoints(card.victoryPoints, game, card.name);

  if (card.productionBox)
    score += this.evaluateProductionBox(card.productionBox, game);
  if (card.metadata.renderData)
    score += this.evaluateCardComponent(card.metadata.renderData as MyCardComponent, game, card);

  if (card.requirements)
    card.requirements.requirements.forEach(requirement => score += this.evaluateRequirement(requirement, game));
  
  score += this.evaluateRebate(game, card)
  return score;
}

evaluateRebate(game: PlayerViewModel, card: ClientCard) {
  var rebate = 0;
  game.thisPlayer.tableau.forEach(rebateCard => rebate += this.rebateFromCard(rebateCard, card, game) + this.rebateFromCardTags(rebateCard, card.tags, game));
  return rebate;
}
evaluateEventRebate(game: PlayerViewModel, card: ClientCard) {
  var rebate = 0;
  var mockTags = card.name === "City" ? [Tag.CITY] : card.name === "Power Plant:SP" ? [Tag.POWER] : [];
  game.thisPlayer.tableau.forEach(rebateCard => rebate += this.rebateFromEvent(rebateCard, card, game) + this.rebateFromCardTags(rebateCard, mockTags, game));
  return rebate;
}
rebateFromCardTags(rebateCard: CardModel, tags: Tag[], game: PlayerViewModel) {
  switch(rebateCard.name)
  {
    // cards
    case "Optimal Aerobraking":
      return tags.some(t => t === Tag.SPACE) ? 3 + this.bonusValues("heat", game) * 3 : 0;
    case "Rover Construction":
      return tags.some(t => t === Tag.CITY) ? 2 : 0;
    case "Immigrant City":
      return tags.some(t => t === Tag.CITY) ? this.remainingGenerations(game) : 0;
    case "Pets":
      return tags.some(t => t === Tag.CITY) ? this.victoryPointValue / 2 : 0;
    case "Earth Office":
      return tags.some(t => t === Tag.EARTH) ? 3 : 0;
    case "Media Group":
      return tags.some(t => t === Tag.EVENT) ? 2 : 0;
    case "Olympus Conference":
      return tags.filter(t => t === Tag.SCIENCE).length * this.bonusValues("card", game) / 2;
    case "Mars University":
      return tags.filter(t => t === Tag.SCIENCE).length;  // TODO: Not sure about this
    case "Decomposers":
      return tags.filter(t => t === Tag.PLANT || t === Tag.MICROBE || t === Tag.ANIMAL).length * this.victoryPointValue / 3;
    case "Viral Enhancers":
      return tags.filter(t => t === Tag.PLANT || t === Tag.MICROBE || t === Tag.ANIMAL).length * this.bonusValues("plant", game);
  
    // coprorations            
    case "Thorgate":
      return tags.some(t => t === Tag.POWER) ? 3 : 0;
    case "Interplanetary Cinematics":
      return tags.some(t => t === Tag.EVENT) ? 2 : 0;
    case "Point Luna":
      return tags.some(t => t === Tag.EARTH) ? this.bonusValues("card", game) : 0;
    case "Tharsis Republic": 
      return tags.some(t => t === Tag.CITY) ? this.remainingGenerations(game) + 3 : 0;
    case "Valley Trust":
      return tags.some(t => t === Tag.BUILDING) ? 2 : 0;
  }
  return 0;
}

rebateFromCard(rebateCard: CardModel, card: ClientCard, game: PlayerViewModel) {
  switch(rebateCard.name)
  {
    case "CrediCor":
      return card.cost >= 20 ? 4 : 0;
    case "Arctic Algae":
      return typeof(card.metadata.description) === "string" && card.metadata.description.match(/place ([1-9]|an) ocean tile/i) ? this.bonusValues("plant", game) : 0;
    case "Vitor":
      return (typeof(this.victoryPointValue) !== 'number' || this.victoryPointValue > 0) ? 3 : 0;
  }
  return 0;
}

rebateFromEvent(rebateCard: CardModel, card: ClientCard, game: PlayerViewModel) {
  switch(rebateCard.name)
  {
    case "CrediCor":
      return card.name === "Greenery" || card.name === "City" ? 4 : 0;
    case "Arctic Algae":
      return typeof(card.metadata.description) === "string" && card.metadata.description.match(/place ([1-9]|an) ocean tile/i) ? this.bonusValues("plant", game) * 2 : 0;
    case "Standard Technology":
      return card.cardType === CardType.STANDARD_PROJECT ? 3 : 0;
  }
  return 0;
}

remainingGenerations = (game: PlayerViewModel) => 14 - game.game.generation;

evaluateTriggerCard (cardInstance: CardModel, game: PlayerViewModel) {
  if (cardInstance.isDisabled)
    return -10000;
  const card = getCard(cardInstance.name);
  const score = this.evaluateTriggerCardComponent(card.metadata.renderData as MyCardComponent, game, card)
       + this.evaluateEventRebate(game, card);

  return score;
}

// Source: https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
// chose the best option to play as one of the two main turn actions
evaluateOption (option: PlayerInputModel, game: PlayerViewModel, log: boolean): {score:number,item:InputResponse}  {
  switch (option.inputType){
  case PlayerInputType.AND_OPTIONS:
    var score = 0;
    var actions = [];
    for (const andOption of option.options) {
      const result = this.evaluateOption(andOption, game, log);
      score += result.score;
      actions.push(actions);
    }

    return {score, item: { type: 'and', responses: actions }} ;

  case PlayerInputType.OR_OPTIONS:
    const evaluateOrOption = (o: PlayerInputModel, g: PlayerViewModel) => this.evaluateOption(o, g, log);
    const sortedOptions = this.sortByEstimatedValue2(option.options, evaluateOrOption, game)
    const bestOption = sortedOptions[0];
    if (option.options.every(o => o.inputType === PlayerInputType.SELECT_OPTION) && 
        sortedOptions.every(o => o.result.score === bestOption.result.score) && 
        (this.preferedOptionFromLastCard < option.options.length))
      return { score: bestOption.result.score, item: { type: 'or', index: this.preferedOptionFromLastCard, response: { type: 'option' }}};
    const choice = option.options.indexOf(bestOption.source);
    return { score: bestOption.result.score, item: { type: 'or', index: choice, response: bestOption.result.item }};

  case PlayerInputType.SELECT_CARD: {
    const title = typeof option.title === "string" ? option.title : option.title.message;
    var bestCard: {result:{score:number}, source: CardModel};
    if (title === "Sell patents") {
      // see off any cards that are no longer of value
      // mosly so they don't confuse my hand
      const badCardsInHand = this.sortByEstimatedValue(game.cardsInHand, (c, g) => this.evaluateCard(c, g), game).filter(c => c.result.score < 0);
      return { score: badCardsInHand.length > 0 ? 1000 : -1000, item: {type: 'card', cards: badCardsInHand.map(c => c.source.name)}};
    }
    else if (title === "Standard projects") {
      if (log) console.log(`Standard projects : ${option.cards.map(c => `${c.name}(${this.evaluateTriggerCard(c, game)})`).join(", ")}`);
      bestCard = this.sortByEstimatedValue(option.cards, (c,g) => this.evaluateTriggerCard(c,g), game)[0];
    } else if (title === 'Select a card to discard') {
      if (log) console.log(`Discard from : ${option.cards.map(c => `${c.name}(${this.evaluateTriggerCard(c, game)})`).join(", ")}`);
      bestCard = this.sortByEstimatedValue(option.cards, (c,g) => this.evaluateTriggerCard(c,g), game)[option.cards.length-1];
    } else if (title === 'Perform an action from a played card') {
      if (log) console.log(`Events : ${option.cards.map(c => `${c.name}(${this.evaluateTriggerCard(c, game)})`).join(", ")}`);
      bestCard = this.sortByEstimatedValue(option.cards, (c,g) => this.evaluateTriggerCard(c,g), game)[0];
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
    const sortedCards = this.sortByEstimatedValue(option.cards, (c,g) => this.evaluateCard(c,g), game);
    if (log) console.log(`Playable cards : ${sortedCards.map(c => `${c.source.name}(${c.result.score})`)}`);
    return { score: sortedCards[0].result.score, item: { type: 'projectCard', card: sortedCards[0].source.name, payment: this.chooseHowToPay(game, option, sortedCards[0].source) } };

  case PlayerInputType.SELECT_SPACE: {
    const title = typeof option.title === "string" ? option.title : option.title.message;
    if (title.match(/Convert (\d+) plants into greenery/) || 
        (title === 'Select space for greenery tile')) {
      // Source: "2.1 Card Advantage"
      const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => this.evaluateSpace(space, game, TileType.GREENERY, false, false, true)
      const sortedSpaces = this.sortByEstimatedValue(option.availableSpaces, evaluateThisSpace, game);
      const score = sortedSpaces[0].result.score + this.victoryPointValue * 2;
      if (log) console.log(`Select space : ${title}(${score})`);
      return { score, item: { type: 'space', spaceId: sortedSpaces[0].source } }
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
      score = this.bonusValues("greenery", game, null);
    }
    else if (title === 'Convert 8 heat into temperature') {
      score = this.bonusValues("temperature", game, null);
    }
    else if (title === 'Pass for this generation') {
      // Only pass when no "good" choices remain
      score = 0;
    }
    else if (title === 'End Turn') {
      // often it is good to end the turn, but figuring out when is hard
      score = -1;
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
        score = +match[2] * this.bonusValues(match[1], game) * this.remainingGenerations(game);
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
            score = amount * this.bonusValues(resource, game);
        } else {
          // any card or action with optional actions will come
          // through here, there are a lot of possible options
          // give it a low but positive score because most actions are useful
          score = 1;
          if (log) console.log('Could not evaluate option! ', option);
        }
      }
    }
    if (log) console.log(`Option: ${option.title} (${score})`);
    return { score, item: { type: 'option' } }
  
  
  default:
    throw new Error(`Unsupported optional player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}

adjacent = (space: SpaceModel, game:PlayerViewModel) => game.game.spaces.filter(s => 
  ((s.y === space.y) && (Math.abs(s.x - space.x) === 1)) || 
  ((Math.abs(s.y - space.y) === 1) && ((s.x === space.x - space.y % 2) || (s.x === space.x + 1 - space.y % 2)) ));

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
evaluateSpace (spaceId: SpaceId, game:PlayerViewModel, tileType: TileType, oceanOnly: boolean, ignoreRestrictions: boolean, restrictionsApplied: boolean) {
  // TODO: Also evaluate adjacent bonuses (points, megacredits, etc)
  var score = 0;
  const space = game.game.spaces.find(space => spaceId === space.id);
  if (space.tileType) // space already used
    return 0;
  if (!restrictionsApplied && (oceanOnly !== (space.spaceType === SpaceType.OCEAN)))
    return 0;
  for (const bonus of space.bonus)
    score += this.bonusValues(SpaceBonus.toString(bonus).toLowerCase(),game);
  const adjacentSpaces = this.adjacent(space, game);
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
    score += adjacentSpaces.filter(s => s.tileType === TileType.GREENERY).length * this.victoryPointValue;
    // each adjacent space is worth 1 point because I could put a greenery there
    // but reduce that if there is already an oposing city adjacent to the space
    // and increase it if there is one of my citied adjacent
    const possibleGreenerySpaces = adjacentSpaces.filter(s => (s.spaceType === SpaceType.LAND) && !s.tileType);
    possibleGreenerySpaces.forEach(greenerySpace => {
      const adjacentCities = this.adjacent(greenerySpace,game).filter(possibleCity => possibleCity.tileType === TileType.CITY);
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
    score += adjacentSpaces.filter(s => (s.tileType === TileType.CITY) && (s.color === game.thisPlayer.color)).length * this.victoryPointValue
    score -= adjacentSpaces.filter(s => (s.tileType === TileType.CITY) && (s.color !== game.thisPlayer.color)).length * this.victoryPointValue / (game.players.length - 1)
  }
  return score;
}

sortByEstimatedValue2<T,R>(sources:T[], evaluator: (t: T,game: PlayerViewModel) => { score: number, item: R }, game:PlayerViewModel): {result:{ score: number, item: R }, source:T}[] {
  // Evaluate all items
  return sources
    .map(source => ({result: evaluator(source, game), source}))
    .sort((n1,n2) => n2.result.score - n1.result.score);
}

// Choose corporation and initial cards
sortByEstimatedValue<T>(sources:T[], evaluator: (t: T,game: PlayerViewModel) => number, game:PlayerViewModel): {result:{ score: number, item: undefined }, source:T}[] {
  // Evaluate all items
  return this.sortByEstimatedValue2(sources, (t:T, game2:PlayerViewModel) => ({ score: evaluator(t, game2), item: undefined }), game);
}

playInitialResearchPhase(game:PlayerViewModel, availableCorporations:CardModel[], availableCards:CardModel[]): InputResponse {

  // Sort corporation by estimated value
  const sortedCorporations = this.sortByEstimatedValue(availableCorporations, (c,g) => this.evaluateCorporation(c,g), game);
  console.log(`Corporations: ${sortedCorporations.map(c => `${c.source.name}(${c.result.score})`).join()}`)

  // Pick the best available corporation
  const corporation = sortedCorporations[0];

  // Pick the best available cards
  const sortedCards = this.sortByEstimatedValue(availableCards, (c,g) => this.evaluateCard(c,g), game);
  console.log(`Initial cards: ${sortedCards.map(c => `${c.source.name}(${c.result.score})`).join()}`)
  const initialCards = sortedCards.filter(c => c.result.score > 3).map(c => c.source.name);

  return { 
    type: 'and', 
    responses: [
      { type: 'card', cards: [corporation.source.name]}, 
      { type: 'card', cards: initialCards}
    ]
  };
}

// Choose how to pay for a given card (or amount)
chooseHowToPay (game: PlayerViewModel, waitingFor: PlayerInputModel, card?: CardModel): Payment {
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

chooseRandomNumber (min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

getTileType(name:string) {
  for(const testTileType of Object.keys(TileType))
    if (TileType.toString(TileType[testTileType]) === name)
      return TileType[testTileType] as any as TileType;
  return undefined;
}

tileFromLastCardEvaluated:TileType|undefined;
preferedOptionFromLastCard:number = 0;

// Play a turn of Terraforming Mars or respond to other choices
public play(game:PlayerViewModel, option:PlayerInputModel): InputResponse {
  const title = typeof option.title === "string" ? option.title : option.title.message;
  switch (option.inputType) {
    case PlayerInputType.AND_OPTIONS:
      return this.evaluateOption(option, game, true).item;

    case PlayerInputType.OR_OPTIONS:
      // increase the value of victory points until a useful option is found
      for(this.victoryPointValue = 5; this.victoryPointValue < 25; this.victoryPointValue++) {
        const bestOption = this.evaluateOption(option, game, false);
        if (bestOption.score > 0)
          break;
      }
      console.log();
      console.log(`Player resources (${game.id}) :M(${game.thisPlayer.megaCredits}),steel(${game.thisPlayer.steel}),titanium(${game.thisPlayer.titanium}),plants(${game.thisPlayer.plants}),energy(${game.thisPlayer.energy}),heat(${game.thisPlayer.heat}),cards(${game.thisPlayer.cardsInHandNbr}),victoryPointValue(${this.victoryPointValue})`);
      const response = this.evaluateOption(option, game, true).item;
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
        const card = getCard(cardName)
        const renderData = card?.metadata?.renderData;
        if (renderData)
          this.evaluateCardComponent(renderData as MyCardComponent, game, card);
      }
      return response;

    case PlayerInputType.SELECT_AMOUNT:
      return { type: 'amount', amount: this.chooseRandomNumber(option.min, option.max) };

    case PlayerInputType.SELECT_CARD:
      if (title.match(/Select\s*\d* card\(s\) to (buy|keep)/) ||
          (title === 'Select builder card to copy') ||
          title.startsWith('Select a card to keep and pass the rest to') ||
          (title === "Select a card to discard"))
      {
        this.victoryPointValue = 5;
        
        // Pick the best available cards
        const sortedCards = this.sortByEstimatedValue(option.cards, (c,g) => this.evaluateCard(c,g), game);
        const invert = (title === "Select a card to discard") ? -1 : 1;
        var numberOfCards = option.min;

        // avoid buying cards that are worce than all the cards in hand that could be played this turn
        const existingCards = this.sortByEstimatedValue(game.cardsInHand, (c,g) => this.evaluateCard(c,g), game);
        var cash = game.thisPlayer.megaCredits 
          + game.thisPlayer.steel * game.thisPlayer.steelValue
          + game.thisPlayer.titanium * game.thisPlayer.titaniumValue;
        var cardIndex = 0;
        while((cash > 0) && (cardIndex < existingCards.length))
          cash -= existingCards[cardIndex++].source.calculatedCost;
        var minimumCardValue = 0;
        if ((cash < 0) && (cardIndex > 0))
          minimumCardValue = existingCards[cardIndex-1].result.score;

        console.log(`Cards for sale (gen:${game.game.generation},vpVal:${this.victoryPointValue},minVal:${minimumCardValue}) : ${option.cards.map(c => `${c.name}(${c.calculatedCost},${this.evaluateCard(c, game)})`).join(", ")}`);

        while ((numberOfCards < option.max) && (sortedCards[numberOfCards].result.score * invert > Math.max(0, minimumCardValue) + 3)) {
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
      return { type: 'payment', payment: this.chooseHowToPay(game, option)};

    case PlayerInputType.SELECT_INITIAL_CARDS:
      return this.playInitialResearchPhase(game, option.options[0].cards, option.options[1].cards);

    case PlayerInputType.SELECT_OPTION:
      return { type: 'option' };

    case PlayerInputType.SELECT_PLAYER:
      // should select the winning player
      const player = option.players.find(p => p != game.thisPlayer.color) ?? game.thisPlayer.color
      return { type: 'player', player};

    case PlayerInputType.SELECT_SPACE:
      var tileType = this.tileFromLastCardEvaluated;
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
            const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => this.evaluateSpace(space, game, tileType, false, false, true)
            const sortedSpaces = this.sortByEstimatedValue(option.availableSpaces, evaluateThisSpace, game);
            if (bestSpace == null || sortedSpaces[0].result.score > bestSpace.result.score)
              bestSpace = sortedSpaces[0]
          });
          return { type: 'space', spaceId: bestSpace.source };
        }
        const match = title.match(/ocean|city|greenery/);
        if (match)
          tileType = this.getTileType(match[0]);
        if (tileType === undefined)
          throw new Error(`Unknown tile type in '${title}'.  Match : ${JSON.stringify(match)}.`);
      }

      const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => this.evaluateSpace(space, game, tileType, false, false, true)

      const sortedSpaces = this.sortByEstimatedValue(option.availableSpaces, evaluateThisSpace, game);
      return { type: 'space', spaceId: sortedSpaces[0].source };

    case PlayerInputType.SELECT_PRODUCTION_TO_LOSE:
      return { type: 'productionToLose', units: Units.EMPTY };

    default:
      throw new Error(`Unsupported player input type! UNKNOWN (${PlayerInputType[option.inputType]})`);
  }
}
evaluateCardComponent(cardComponent: MyCardComponent, game: PlayerViewModel, card:ClientCard) {
  switch (cardComponent?.is) {
    case 'root' : return this.evaluateCardComponents(cardComponent.rows, game, card);
    case 'effect' : return this.evaluateEffect(cardComponent.rows, game, card);
    case 'production-box' : return this.evaluateProduction(cardComponent.rows, game, card);
    case 'tile' : return this.evaluateTile(cardComponent, game, card);
    case 'item' : return this.evaluateItem(cardComponent, game, card, false);
    case 'symbol' : return 0;
    default: return 0;
  }
}
evaluateTriggerCardComponent(cardComponent: MyCardComponent, game: PlayerViewModel, card?:ClientCard) {
  switch (cardComponent.is) {
    case 'root' : return this.evaluateTriggerCardComponents(cardComponent.rows, game, card);
    case 'effect' : return this.evaluateTriggerEffect(cardComponent.rows, game, card);
    case 'production-box' : return 0;
    case 'tile' : return 0;
    case 'item' : return 0;
    case 'symbol' : return 0;
    default: return 0;
  }
}
evaluateCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  var score = 0;
  var or = false;
  cardComponents.forEach(c => 
    c.forEach(component => {
      if ((component.is === 'symbol') && (component.type === "OR"))
        or = true;
      else {
        const localScore = this.evaluateCardComponent(component, game, card);
        if (or)
          score = Math.max(localScore, score);
        else
          score += localScore;
      }
    }));
  return score;
}

evaluateTriggerCardComponents(cardComponents: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  var score = 0;
  // todo: handle OR
  cardComponents.forEach(c => c.forEach(component => score += this.evaluateTriggerCardComponent(component, game, card)));
  return score;
}

evaluateTriggerEffect(effect: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  if ((effect.length !== 3) || (effect[1].length !== 1) || (effect[1][0].is !== 'symbol'))
    throw new Error("Cannot understand effect that doesn't have 3 rows with a symbol in the middle: " + JSON.stringify(effect));
  var cost = 0;
  switch (effect[1][0].type) {
    // when x do y
    case ':':
      break;
    // spend x to do y
    case '->':
      cost = this.evaluateCardComponent(effect[0][0], game, card);
      break;
    case 'OR':
      break;
    default:
      throw new Error("Cannot understand effect that has this symbol in the middle: " + JSON.stringify(effect));

  }
  // the benifit of an event is never negative, 
  // but reduced card costs can look negative so make them positive
  var benifit = 0;
  effect[2].forEach(c => benifit += Math.abs(this.evaluateCardComponent(c,game,card)));
  return benifit - cost;
}

evaluateEffect(effect: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  if ((effect.length !== 3) || (effect[1].length !== 1) || (effect[1][0].is !== 'symbol'))
    throw new Error("Cannot understand effect that doesn't have 3 rows with a symbol in the middle: " + JSON.stringify(effect));
  var cost = 0;
  var occurences = this.remainingGenerations(game);
  switch (effect[1][0].type) {
    // when x do y
    case ':':
      occurences = 5; // TODO: total guess
      break;
    // spend x to do y
    case '->': 
      cost = this.evaluateCardComponent(effect[0][0], game, card);
      if (effect[0][0].is === "item") {
        const costType = this.typeSingular(effect[0][0]);
        if ((costType === 'energy') || (costType === 'titanium') || (costType === 'steel') && 
            (game.thisPlayer[`${costType}Production`] < effect[0][0].amount))
          cost = 100;
      }
      break;
    case 'OR':
      break;
    default:
      throw new Error(`Cannot understand effect on card '${card?.name}' that has this symbol in the middle: ${JSON.stringify(effect)}`);

  }
  const type = (effect[2][0].is === "item") ? effect[2][0].type : undefined;
  if ((effect[0][0].is === "item") && ((type === 'ocean') || (type === 'temperature') || (type === 'oxygen') || (type === 'tr')))
  {
    var localGame = {...game, game: { ...game.game } };
    var microbes = card.name === "Nitrite Reducing Bacteria" ? 3 : 0
    var score = 0;
    while (localGame.game.generation <= game.game.generation + this.remainingGenerations(game))
    {
      if (!effect[0][0].type.startsWith('microbe') || microbes >= cost) {
        score += this.bonusValues(type, localGame, card);
        microbes = -1;
        if (type === 'oxygen')
          localGame.game.oxygenLevel++; // should probably add more than one
        else if (type === 'temperature')
          localGame.game.temperature++; // should probably add more than one
        else if (type === 'ocean')
          localGame.game.oceans++; // should probably add more than one
      }
      microbes++;
      if (game.thisPlayer.tableau.some(c => c.name === 'Symbiotic Fungus'))
        microbes++;
      localGame.game.generation++;
    }
    return score;
  }
  else
  {
    // the benifit of an event is never negative, 
    // but reduced card costs can look negative so make them positive
    const benifit = Math.abs(this.evaluateCardComponent(effect[2][0],game,card));
    return (benifit - cost)*occurences;
  }
}

evaluateProduction(rows: MyCardComponent[][], game: PlayerViewModel, card?:ClientCard) {
  return this.parseRows(rows, game, card);
}

evaluateTile(cardComponent: CardRenderTile, game: PlayerViewModel, card?:ClientCard) {
  this.tileFromLastCardEvaluated = cardComponent.tile;
  return this.bonusValues(TileType.toString(cardComponent.tile), game, card)
}

victoryPointValue = 5;

bonusValues(type: string, game: PlayerViewModel, card?:ClientCard) {
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
  'fighter': game.players.length < 2 ? 0 : this.victoryPointValue
  };
  if (basicValues[type])
    return basicValues[type];

  var trs = {
  'ocean': this.victoryPointValue,
  'greenery': this.victoryPointValue * 2,
  'oxygen': this.victoryPointValue,
  'temperature': this.victoryPointValue,
  'tr': this.victoryPointValue,
  };
  if (game.players.length < 2)
  {
    trs.greenery -= this.victoryPointValue;
    if (!game.game.gameOptions.soloTR)
      trs.tr -= this.victoryPointValue;
  }
  if ((game.game.oceans === 9) && (type === 'ocean'))
    return 0;
  if ((game.game.temperature === 8) && (type === 'temperature'))
    return 0;
  if (game.game.oxygenLevel === 14)
    if (type === 'oxygen')
      return 0;
    else
      trs.greenery -= this.victoryPointValue + this.remainingGenerations(game);

  var score = 0;
  if (trs[type])
    score += trs[type] + this.remainingGenerations(game);
  const tileType = this.getTileType(type)
  if (tileType !== undefined)
  {
    const description = (typeof(card?.metadata?.description) === 'string' ? card?.metadata?.description : card?.metadata?.description?.text) ?? "";
    const oceanSpace = description.includes("ON AN AREA RESERVED FOR OCEAN") || ((tileType === TileType.OCEAN) && !description.includes("ON AN AREA NOT RESERVED FOR OCEAN"));
    const ignoreRestrictions = description.includes("placement restrictions");
    const evaluateThisSpace = (space: SpaceId, game: PlayerViewModel) => this.evaluateSpace(space, game, tileType, oceanSpace, ignoreRestrictions, false)
    const bestSpaces = this.sortByEstimatedValue(game.game.spaces.map(s => s.id), evaluateThisSpace, game);
    if (bestSpaces.some && (bestSpaces[0].result.score > 0))
      score += bestSpaces[0].result.score;
  }
  else if ((type !== 'text') && (type !== 'plate') && (trs[type] === undefined))
    console.log("Unknown resouce type: " + type);
  return score;
}
typeSingular = (cardComponent: CardRenderItem) => cardComponent.type.endsWith("s") ? cardComponent.type.slice(0,-1) : cardComponent.type;
evaluateItem(cardComponent: CardRenderItem, game: PlayerViewModel, card:ClientCard, production:boolean) {
  var amount = cardComponent.amount;
  // if this is affecting other players then the value 
  // is lower the more player there are
  const type = this.typeSingular(cardComponent);
  const divider = cardComponent.anyPlayer 
    ? game.players.length < 2
      ? -10000
      : (!production || (type === "megacredit") || game.players.some(p => (p.color !== game.thisPlayer.color) && (p[`${type}Production`] >= amount))) ? -(game.players.length-1) : 1
    : 1;
  // for some reson some cards show amount of -1 even thought they are avtually +1
  if ((type === 'city') || (type === 'greenery'))
    amount = Math.abs(amount);
  return this.bonusValues(type, game, card) * amount / divider;
}

// reduce value by one point per missing requirement
// reduce to -100 for exceeded requirements 
checkRequirement(requirement: ICardRequirement, level: number): number {
  if (requirement.isMax)
    if (level > requirement.amount)
      return -1000;
    else
      return 0;
  else
    if (level >= requirement.amount)
      return 0;
    else
      // never choose cards that have unmet requirements because it messes up deciding which future cards to buy
      return -1000; 
}

evaluateRequirement(requirement: ICardRequirement, game: PlayerViewModel) {
  switch(requirement.type){
    case RequirementType.OXYGEN:
      return this.checkRequirement(requirement, game.game.oxygenLevel);
    case RequirementType.TEMPERATURE:
      return this.checkRequirement(requirement, game.game.temperature) / 2;
    case RequirementType.OCEANS:
      return this.checkRequirement(requirement, game.game.oceans);
    case RequirementType.TAG:
      var tagRequirement = requirement as ITagCardRequirement;
      return this.checkRequirement(requirement, game.thisPlayer.tags.find(tag => tag.tag === tagRequirement.tag)?.count ?? 0);
    case RequirementType.GREENERIES:
      return this.checkRequirement(requirement, requirement.isAny ? game.players.reduce((sum, p) => sum+p.victoryPointsBreakdown.greenery,0) : game.thisPlayer.victoryPointsBreakdown.greenery);
    case RequirementType.CITIES:
      return this.checkRequirement(requirement, requirement.isAny ? game.players.reduce((sum, p) => sum+p.citiesCount,0) : game.thisPlayer.citiesCount);
    default:
      return -100;
  }
}
}

