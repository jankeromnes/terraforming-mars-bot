// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

// To test this bot:
//   1. Run `node start-game`, then copy the player link
//   2. Run `node play-bot PLAYER_LINK`

// To implement your own bot:
//   1. Copy 'random.js' to a new file, for example 'my-bot.js'
//   2. Improve your bot (for example, replace every call to 'chooseRandomItem' with your own logic)
//   3. Run `node start-game`, then copy the player link
//   4. Run `node play-bot --bot=bots/my-bot.js PLAYER_LINK`

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

// [["0"],["Power Plant","{\"heat\":0,\"megaCredits\":0,\"steel\":2,\"titanium\":0,\"microbes\":0,\"floaters\":0,\"isResearchPhase\":false}"]]
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
      // "{\"heat\":0,\"megaCredits\":0,\"steel\":2,\"titanium\":0,\"microbes\":0,\"floaters\":0,\"isResearchPhase\":false}"
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_HOW_TO_PAY_FOR_CARD':
      // [["Asteroid","{\"heat\":0,\"megaCredits\":14,\"steel\":0,\"titanium\":0,\"microbes\":0,\"floaters\":0,\"isResearchPhase\":false}"]]
      const card = chooseRandomItem(waitingFor.cards);
      const payment = {
        heat: 0,
        megaCredits: card.calculatedCost,
        steel: 0,
        titanium: 0,
        microbes: 0,
        floaters: 0,
        isResearchPhase: false,
      };
      return [[card.name, JSON.stringify(payment)]];

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
