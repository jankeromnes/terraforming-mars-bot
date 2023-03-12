import { Game, Option, CardInstance, RenderRow, Space } from '../models/game.js'
//import { PlayerInputTypes } from '../terraforming-mars/build/src/PlayerInputTypes.js';
enum PlayerInputTypes {
  AND_OPTIONS = 0,
  OR_OPTIONS = 1,
  SELECT_AMOUNT = 2,
  SELECT_CARD = 3,
  SELECT_HOW_TO_PAY = 4,
  SELECT_HOW_TO_PAY_FOR_CARD = 5,
  SELECT_OPTION = 6,
  SELECT_PLAYER = 7,
  SELECT_SPACE = 8,
  SELECT_DELEGATE = 9,
  SELECT_PARTY = 10,
  SELECT_COLONY = 11,
  SELECT_PRODUCTION_TO_LOSE = 12,
  SHIFT_ARES_GLOBAL_PARAMETERS = 13
}

// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// Quantum Bot -- heavily inspired by https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy

// To test this bot, run this command:
//   node play-bot --bot=quantum

// Source: "6. Corporations" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCorporation (corporation: CardInstance, game:Game) {
  switch (corporation.name) {
    case 'Saturn Systems':
      return 57 + game.dealtProjectCards.filter(c => c.tags.includes('jovian')).length * 5;
    case 'Teractor':
      return 60 + game.dealtProjectCards.filter(c => c.tags.includes('earth')).length * 3;
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

function parseRows (rows: RenderRow[], level: number) {
  var totalScore = 0;
  for (const row of rows) {
    totalScore += parseRow(row, level);
  }
  return totalScore;
}

function parseRow(row: RenderRow, level: number) {
  var rowScore = 0;
  let minus = false;
  var index = -1;
  for (const item of row) {
    index++;
    if (item._rows) {
      rowScore += parseRows(item._rows, level + 1);
      continue;
    }
    if (item.anyPlayer) {
      // Ignore effects to other players.
      continue;
    }
    switch (item.type) {
      case '-':
        minus = true;
        break;
      case '+':
        minus = false;
        break;
      case ' ':
        // Ignore.
        break;
      case 'nbsp':
        // Ignore.
        break;
      case 'text':
        // Ignore.
        break;
      case 'OR': 
        let firstPart = parseRow(row.slice(0, index), level);
        let secondPart = parseRow(row.slice(index), level);
        return Math.max(firstPart, secondPart);
      default:
        let effectValues = [
          // Bonus
          {
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
          },
          // Production
          {
            'energy': 7,
            'heat': 6,
            'megacredits': 5,
            'plants': 10,
            'steel': 8,
            'titanium': 10,
          },
        ];
        if (effectValues[level][item.type]) {
          rowScore += (minus ? -1 : 1) * (item.amount ?? 0) * effectValues[level][item.type];
          continue;
        }
        if (item.tile) {
          rowScore += 4;
          continue;
        }
        throw new Error(`Unsupported renderData type ${item.type} in card row ` + JSON.stringify(row, null, 2));
    }
  }
  return rowScore;
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCard (cardInstance: CardInstance, game: Game) {
  let score = -cardInstance.calculatedCost;
  const card = getCard(game, cardInstance);
  if (card && card.metadata && card.metadata.victoryPoints) {
    if (typeof card.metadata.victoryPoints === 'number') {
      score += 5 * card.metadata.victoryPoints;
    } else {
      console.error(new Error('Unsupported victoryPoints format! ' + JSON.stringify(card.metadata.victoryPoints, null, 2)));
    }
  }
  // HACK: Guess card effects by parsing the renderData (will definitely break unless tested)
  if (card && card.metadata && card.metadata.renderData) {
    try {
      score += parseRows(card.metadata.renderData._rows, 0);
    } catch (error) {
      console.error('Could not parse card renderData');
      console.error(error);
    }
  }
  return score;
}

// Source: https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateOption (option: Option, game: Game) {
  if (option.inputType === PlayerInputTypes.OR_OPTIONS && option.options) {
    // Return the value of the best sub-option
    return evaluateOption(sortByEstimatedValue(option.options, evaluateOption, game)[0], game)
  }
  if (option.inputType === PlayerInputTypes.SELECT_HOW_TO_PAY_FOR_CARD && option.cards) {
    // Return the value of the best playable card
    return evaluateCard(sortByEstimatedValue(option.cards, evaluateCard, game)[0], game);
  }
  if (option.inputType === PlayerInputTypes.SELECT_SPACE && option.availableSpaces) {
    // Return the value of the best available space
    const spaces = option.availableSpaces.map(id => game.spaces.find(s => s.id === id)??game.spaces[0]);
    return evaluateSpace(sortByEstimatedValue(spaces, evaluateSpace, game)[0], game);
  }
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
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateSpace (space: Space, game:Game) {
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
  ]
  for (const bonus of space.bonus) {
    score += bonusValues[bonus];
  }
  return score;
}

function sortByEstimatedValue<T>(items:T[], evaluator: (t: T,game: Game) => number, game:Game) {
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
export function playInitialResearchPhase(game:Game, availableCorporations:CardInstance[], availableCards:CardInstance[]) {
  console.log(availableCorporations, availableCards, game);

  // Sort corporation by estimated value
  const sortedCorporations = sortByEstimatedValue(availableCorporations, evaluateCorporation, game);

  // Pick the best available corporation
  const corporation = sortedCorporations[0];

  // Pick the best available cards
  const initialCards = availableCards.filter(c => evaluateCard(c, game) > 3);

  console.log('Quantum bot chose:', corporation, initialCards);
  return [[corporation.name], initialCards.map(c => c.name)];
}

function getCard(game: Game, card?: CardInstance) {
  return game.dealtProjectCards.find(c => c.name == card?.name)
}

// Choose how to pay for a given card (or amount)
function chooseHowToPay (game: Game, waitingFor: Option, card?: CardInstance) {
  // Prefer non-megacredit resources when available (in case there are not enough megacredits)
  let megaCredits = card ? card.calculatedCost : waitingFor.amount ?? 0;
  let heat = 0;
  if (waitingFor.canUseHeat) {
    heat = Math.min(game.heat, megaCredits);
    megaCredits -= heat;
  }
  const cardDefinition = getCard(game, card);
  let steel = 0;
  if ((waitingFor.canUseSteel || cardDefinition && cardDefinition.tags.includes('building'))) {
    steel = Math.min(game.steel, Math.floor(megaCredits / game.steelValue));
    megaCredits -= steel * game.steelValue;
    // If there aren't enough mega credits left, we may need to overshoot on steel.
    if (game.megaCredits < megaCredits  && game.steel > steel) {
      steel++;
      megaCredits = Math.max(0, megaCredits - game.steelValue);
    }
  }
  let titanium = 0;
  if ((waitingFor.canUseTitanium || cardDefinition && cardDefinition.tags.includes('space'))) {
    titanium = Math.min(game.titanium, Math.floor(megaCredits / game.titaniumValue));
    megaCredits -= titanium * game.titaniumValue;
    // If there still aren't enough mega credits left, we may need to overshoot on titanium.
    if (game.megaCredits < megaCredits  && game.titanium > titanium) {
      titanium++;
      megaCredits = Math.max(0, megaCredits - game.titaniumValue);
    }
  }
  let microbes = 0;
  let floaters = 0;
  let isResearchPhase = false;
  return { heat, megaCredits, steel, titanium, microbes, floaters, isResearchPhase };
}

// TODO: Remove
function chooseRandomItem<T> (items?: T[]) {
  return items ? items[chooseRandomNumber(0, items.length - 1)] : undefined;
}
function chooseRandomNumber (min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Play a turn of Terraforming Mars
export function play(game:Game, waitingFor:Option): string[][] {
  console.log('Game is waiting for:', JSON.stringify(waitingFor, null, 2));
  switch (waitingFor.inputType) {
    case PlayerInputTypes.AND_OPTIONS:
      if (!waitingFor.options)
        throw new Error("No options when some are expected");
      const actions: string[][] = [[]];
      for (const option of waitingFor.options) {
        actions.push(play(game, option)[0]);
      }
      return actions;

    case PlayerInputTypes.OR_OPTIONS:
      // Sort playable options by estimated value
      const sortedOptions = sortByEstimatedValue(waitingFor.options, evaluateOption, game);

      // Pick the best playable option
      const option = sortedOptions[0];
      const choice = String(waitingFor.options?.indexOf(option));
      return [[choice]].concat(play(game, option));

    case PlayerInputTypes.SELECT_AMOUNT:
      return [[String(chooseRandomNumber(waitingFor.min ?? 0, waitingFor.max ?? 0))]];

    case PlayerInputTypes.SELECT_CARD:
      if (!waitingFor.cards)
        throw new Error("No cards when some are expected");
      if (waitingFor.minCardsToSelect === undefined || waitingFor.maxCardsToSelect === undefined)
        throw new Error("No min or max CardsToSelect when value expected");
      // Pick the best available cards
      // TODO reverse when "title": "Select a card to discard" / "buttonLabel": "Discard",
      const sortedCards = sortByEstimatedValue(waitingFor.cards, evaluateCard, game);
      let numberOfCards = waitingFor.minCardsToSelect;
      while (numberOfCards < waitingFor.maxCardsToSelect && evaluateCard(sortedCards[numberOfCards],game) > 3) {
        numberOfCards++;
      }
      return [sortedCards.slice(0, numberOfCards).map(c => c.name)];

    case PlayerInputTypes.SELECT_HOW_TO_PAY:
      return [[JSON.stringify(chooseHowToPay(game, waitingFor))]];

    case PlayerInputTypes.SELECT_HOW_TO_PAY_FOR_CARD:
      var card = chooseRandomItem(waitingFor.cards);
      card = game.cardsInHand.find(c => c.name == card.name);
      if (!card)
        throw new Error("No cards to select from.");
      return [[card.name, JSON.stringify(chooseHowToPay(game, waitingFor, card))]];

    case PlayerInputTypes.SELECT_OPTION:
      return [['1']];

    case PlayerInputTypes.SELECT_PLAYER:
      return [[JSON.stringify(chooseRandomItem(waitingFor.players))]];

    case PlayerInputTypes.SELECT_SPACE:
      // Pick the best available space
      if (!waitingFor.availableSpaces)
        throw new Error("Could not find a space to select");
      const spaces = waitingFor.availableSpaces.map(id => game.spaces.find(s => s.id === id) ?? game.spaces[0]);
      const sortedSpaces = sortByEstimatedValue(spaces, evaluateSpace, game);
      return [[sortedSpaces[0].id]];

    case PlayerInputTypes.SELECT_DELEGATE:
      throw new Error(`Unsupported player input type! SELECT_DELEGATE (${waitingFor.inputType})`);

    case PlayerInputTypes.SELECT_PARTY:
      throw new Error(`Unsupported player input type! SELECT_PARTY (${waitingFor.inputType})`);

    case PlayerInputTypes.SELECT_COLONY:
      throw new Error(`Unsupported player input type! SELECT_COLONY (${waitingFor.inputType})`);

    case PlayerInputTypes.SELECT_PRODUCTION_TO_LOSE:
      throw new Error(`Unsupported player input type! SELECT_PRODUCTION_TO_LOSE (${waitingFor.inputType})`);

    case PlayerInputTypes.SHIFT_ARES_GLOBAL_PARAMETERS:
      throw new Error(`Unsupported player input type! SHIFT_ARES_GLOBAL_PARAMETERS (${waitingFor.inputType})`);

    default:
      throw new Error(`Unsupported player input type! UNKNOWN (${waitingFor.inputType})`);
  }
}
