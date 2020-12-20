// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// To test this bot, run this command:
//   node play-bot

// To implement your own bot:
//   1. Copy 'random.js' to a new file, for example 'my-bot.js'
//   2. Improve your bot (for example, replace every call to 'chooseRandomItem' with your own logic)
//   3. Run `node start-game`, then copy the player link
//   4. Run `node play-bot --bot=my-bot.js PLAYER_LINK`

// Good luck & have fun!

// The random bot will always choose randomly when presented with a choice
function chooseRandomItem (items) {
  return items[chooseRandomNumber(0, items.length - 1)];
}
function chooseRandomNumber (min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Choose corporation and initial cards
exports.playInitialResearchPhase = async (game, availableCorporations, availableCards) => {
  const corporation = chooseRandomItem(availableCorporations).name;
  const initialCards = [ chooseRandomItem(availableCards).name ];
  return [[corporation], initialCards];
}

// Choose how to pay for a given card (or amount)
function chooseHowToPay (game, waitingFor, card) {
  // Not-so-random: Prefer non-megacredit resources when available (in case there are not enough megacredits)
  // FIXME: Overshoot non-megacredit resources if there are not enough megacredits
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
