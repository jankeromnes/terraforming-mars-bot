// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// Quantum Bot -- heavily inspired by https://boardgamegeek.com/thread/1847708/quantified-guide-tm-strategy

// To test this bot:
//   1. Run `node start-game`, then copy the player link
//   2. Run `node play-bot --bot=bots/quantum.js PLAYER_LINK`

// TODO: Remove
function chooseRandomItem (items) {
  return items[chooseRandomNumber(0, items.length - 1)];
}
function chooseRandomNumber (min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

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
    console.log(card);
    try {
      let effectScore = 0;
      let effectValues = [
        // Bonus
        {
          'cards': 2,
          'heat': 1,
          'megacredits': 1,
          'oceans': 14,
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

// Choose corporation and initial cards
exports.playInitialResearchPhase = async (game, availableCorporations, availableCards) => {
  console.log(availableCorporations, availableCards, game);

  // Sort corporation by estimated value
  const sortedCorporations = availableCorporations
    .map(c => {
      c.value = evaluateCorporation(c, game);
      return c;
    })
    .sort((a, b) => a.value > b.value ? -1 : 1);

  // Pick the best available corporation
  const corporation = sortedCorporations[0];

  // Pick the best available cards
  const initialCards = availableCards.filter(c => evaluateCard(c, game) > 3);

  console.log('Quantum bot chose:', corporation, initialCards);

  return [[corporation.name], initialCards.map(c => c.name)];
}

// Choose how to pay for a given card (or amount)
function chooseHowToPay (game, waitingFor, card) {
  // Not-so-random: Prefer non-megacredit resources when available (in case there are not enough megacredits)
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
  }
  let titanium = 0;
  if ((waitingFor.canUseTitanium || card && card.tags.includes('space'))) {
    titanium = Math.min(game.titanium, Math.floor(megaCredits / game.titaniumValue));
    megaCredits -= titanium * game.titaniumValue;
  }
  let microbes = 0;
  let floaters = 0;
  let isResearchPhase = false;
  return { heat, megaCredits, steel, titanium, microbes, floaters, isResearchPhase };
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
      const option = chooseRandomItem(waitingFor.options);
      const choice = String(waitingFor.options.indexOf(option));
      return [[choice]].concat(await exports.play(game, option));

    case 'SELECT_AMOUNT':
      return [[String(chooseRandomNumber(waitingFor.min, waitingFor.max))]];

    case 'SELECT_CARD':
      let numberOfCards = chooseRandomNumber(waitingFor.minCardsToSelect, waitingFor.maxCardsToSelect);
      let cards = [];
      while (cards.length < numberOfCards) {
        const remainingCards = waitingFor.cards.filter(c => !cards.includes(c.name));
        cards.push(chooseRandomItem(remainingCards).name);
      }
      return [cards];

    case 'SELECT_HOW_TO_PAY':
      return [[JSON.stringify(chooseHowToPay(game, waitingFor))]];

    case 'SELECT_HOW_TO_PAY_FOR_CARD':
      const card = chooseRandomItem(waitingFor.cards);
      // For some reason, card.calculatedCost is always 0. So, get this info from the cards in hand.
      const cardInHand = game.cardsInHand.find(c => c.name === card.name);
      card.calculatedCost = cardInHand.calculatedCost;
      return [[card.name, JSON.stringify(chooseHowToPay(game, waitingFor, card))]];

    case 'SELECT_OPTION':
      return [['1']];

    case 'SELECT_PLAYER':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_SPACE':
      const space = chooseRandomItem(waitingFor.availableSpaces);
      return [[space]];

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
