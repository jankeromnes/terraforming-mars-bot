// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// Quantum Bot -- heavily inspired by https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy

// To test this bot, run this command:
//   node play-bot --bot=quantum

// Source: "6. Corporations" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCorporation (corporation, game) {
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

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateCard (card, game) {
  let score = -card.calculatedCost;
  if (card.metadata && card.metadata.victoryPoints) {
    if (typeof card.metadata.victoryPoints === 'number') {
      score += 5 * card.metadata.victoryPoints;
    } else {
      console.error(new Error('Unsupported victoryPoints format! ' + JSON.stringify(card.metadata.victoryPoints, null, 2)));
    }
  }
  // HACK: Guess card effects by parsing the renderData (will definitely break unless tested)
  if (card.metadata && card.metadata.renderData) {
    try {
      let effectScore = 0;
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
      function parseRows (rows, level) {
        for (const row of rows) {
          let minus = false;
          for (const item of row) {
            if (item._rows) {
              parseRows(item._rows, level + 1);
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
              default:
                if (effectValues[level][item.type]) {
                  effectScore += (minus ? -1 : 1) * item.amount * effectValues[level][item.type];
                  continue;
                }
                if (item.tile) {
                  effectScore += 4;
                  continue;
                }
                throw new Error(`Unsupported renderData type ${item.type} in ` + JSON.stringify(card.metadata.renderData, null, 2));
            }
          }
        }
      }
      parseRows(card.metadata.renderData._rows, 0);
      score += effectScore;
    } catch (error) {
      console.error('Could not parse card renderData');
      console.error(error);
    }
  }
  return score;
}

// Source: https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateOption (option, game) {
  let match = null;
  if (option.playerInputType === 'OR_OPTIONS') {
    // Return the value of the best sub-option
    return sortByEstimatedValue(option.options, evaluateOption, game)[0].value
  }
  if (option.playerInputType === 'SELECT_HOW_TO_PAY_FOR_CARD') {
    // Return the value of the best playable card
    return sortByEstimatedValue(option.cards, evaluateCard, game)[0].value;
  }
  if (option.playerInputType === 'SELECT_SPACE') {
    // Return the value of the best available space
    const spaces = option.availableSpaces.map(id => game.spaces.find(s => s.id === id));
    return sortByEstimatedValue(spaces, evaluateSpace, game)[0].value;
  }
  if (option.title.message && option.title.message.match(/Take first action of.*/)) {
    // We definitely want to do that
    return 100;
  }
  if (match = option.buttonLabel.match(/Claim - \((.*)\)/)) {
    // Source: "1.1 Standard Cards"
    return 25;
  }
  if (match = option.title.match(/Convert (\d+) plants into greenery/)) {
    // Source: "2.1 Card Advantage"
    return 19;
  }
  if (option.title === 'Convert 8 heat into temperature') {
    // Source: "1.1 Standard Cards"
    return 10;
  }
  if (match = option.title.match(/Power plant \((\d+) MC\)/)) {
    const cost = parseInt(match[1], 10)
    // Source: "1.1 Standard Cards"
    return 7 - cost;
  }
  if (match = option.title.match(/Asteroid \((\d+) MC\)/)) {
    const cost = parseInt(match[1], 10);
    // Source: "1.1 Standard Cards"
    return 10 - cost;
  }
  if (match = option.title.match(/Aquifer \((\d+) MC\)/)) {
    const cost = parseInt(match[1], 10);
    // Source: "1.1 Standard Cards"
    return 14 - cost;
  }
  if (match = option.title.match(/Greenery \((\d+) MC\)/)) {
    const cost = parseInt(match[1], 10);
    // Source: "2.1 Card Advantage"
    return 19 - cost;
  }
  if (match = option.title.match(/City \((\d+) MC\)/)) {
    const cost = parseInt(match[1], 10);
    // Source: "4.5 Points from City"
    return 9 - cost;
  }
  if (option.title === 'Pass for this generation') {
    // Only pass when no "good" choices remain
    return -100;
  }
  if (option.title === 'Sell patents') {
    // Don't sell patents
    return -101;
  }
  console.error(new Error('Could not evaluate option! ' + JSON.stringify(option, null, 2)));
  return -100; // Don't play options we don't understand, except if there is no other choice.
}

// Source: "1. Efficiency of Cards" in https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy
function evaluateSpace (space, game) {
  // TODO: Also evaluate adjacent bonuses (points, megacredits, etc)
  let score = 0;
  const bonusValue = {
    'TITANIUM': 2,
    'STEEL': 2,
    'PLANT': 2,
    'DRAW_CARD': 2,
    'HEAT': 1,
    'OCEAN': 14,
    'MEGACREDITS': 1,
  }
  for (const bonus of space.placementBonus) {
    if (!(bonus in bonusValue)) {
      throw new Error(`Unsupported map placement bonus: ${bonus} in ${JSON.stringify(space, null, 2)}`);
    }
    score += bonusValue[bonus];
  }
  return score;
}

function sortByEstimatedValue (items, evaluator, game) {
  // Evaluate all items
  items.forEach(item => {
    if (!('value' in item)) {
      item.value = evaluator(item, game);
    }
  });
  // Sort items by estimated value
  return shuffle([...items]).sort((a, b) => a.value > b.value ? -1 : 1);
}

function shuffle (items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

// Choose corporation and initial cards
exports.playInitialResearchPhase = async (game, availableCorporations, availableCards) => {
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

// Choose how to pay for a given card (or amount)
function chooseHowToPay (game, waitingFor, card) {
  // Prefer non-megacredit resources when available (in case there are not enough megacredits)
  let megaCredits = card ? card.calculatedCost : waitingFor.amount;
  let heat = 0;
  if (waitingFor.canUseHeat) {
    heat = Math.min(game.heat, megaCredits);
    megaCredits -= heat;
  }
  let steel = 0;
  if ((waitingFor.canUseSteel || card && card.tags.includes('building'))) {
    steel = Math.min(game.steel, Math.floor(megaCredits / game.steelValue));
    megaCredits -= steel * game.steelValue;
    // If there aren't enough mega credits left, we may need to overshoot on steel.
    if (game.megaCredits < megaCredits  && game.steel > steel) {
      steel++;
      megaCredits = Math.max(0, megaCredits - game.steelValue);
    }
  }
  let titanium = 0;
  if ((waitingFor.canUseTitanium || card && card.tags.includes('space'))) {
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
function chooseRandomItem (items) {
  return items[chooseRandomNumber(0, items.length - 1)];
}
function chooseRandomNumber (min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Play a turn of Terraforming Mars
exports.play = async (game, waitingFor) => {
  console.log('Game is waiting for:', JSON.stringify(waitingFor, null, 2));
  switch (waitingFor.playerInputType) {
    case 'AND_OPTIONS':
      const actions = [];
      for (const option of waitingFor.options) {
        actions.push(await exports.play(game, option));
      }
      return actions;

    case 'OR_OPTIONS':
      // Sort playable options by estimated value
      const sortedOptions = sortByEstimatedValue(waitingFor.options, evaluateOption, game);

      // Pick the best playable option
      const option = sortedOptions[0];
      const choice = String(waitingFor.options.indexOf(option));
      return [[choice]].concat(await exports.play(game, option));

    case 'SELECT_AMOUNT':
      return [[String(chooseRandomNumber(waitingFor.min, waitingFor.max))]];

    case 'SELECT_CARD':
      // Pick the best available cards
      // TODO reverse when "title": "Select a card to discard" / "buttonLabel": "Discard",
      const sortedCards = sortByEstimatedValue(waitingFor.cards, evaluateCard, game);
      let numberOfCards = waitingFor.minCardsToSelect;
      while (numberOfCards < waitingFor.maxCardsToSelect && sortedCards[numberOfCards].value > 3) {
        numberOfCards++;
      }
      return [sortedCards.slice(0, numberOfCards).map(c => c.name)];

    case 'SELECT_HOW_TO_PAY':
      return [[JSON.stringify(chooseHowToPay(game, waitingFor))]];

    case 'SELECT_HOW_TO_PAY_FOR_CARD':
      const card = chooseRandomItem(waitingFor.cards);
      return [[card.name, JSON.stringify(chooseHowToPay(game, waitingFor, card))]];

    case 'SELECT_OPTION':
      return [['1']];

    case 'SELECT_PLAYER':
      return [[chooseRandomItem(waitingFor.players)]];

    case 'SELECT_SPACE':
      // Pick the best available space
      const spaces = waitingFor.availableSpaces.map(id => game.spaces.find(s => s.id === id));
      const sortedSpaces = sortByEstimatedValue(spaces, evaluateSpace, game);
      return [[sortedSpaces[0].id]];

    case 'SELECT_DELEGATE':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_PARTY':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_COLONY':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_PRODUCTION_TO_LOSE':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SHIFT_ARES_GLOBAL_PARAMETERS':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    default:
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);
  }
}
