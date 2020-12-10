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

// The random bot will always choose randomly when presented with a choice
function chooseRandomItem (items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Choose corporation and initial cards
exports.playInitialResearchPhase = async (game, availableCorporations, availableCards) => {
  const corporation = chooseRandomItem(availableCorporations).name;
  const initialCards = [ chooseRandomItem(availableCards).name ];
  return [[corporation], initialCards];
}

// [["0"],["1"],["1"]]
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
      return exports.play(game, option);

    case 'SELECT_AMOUNT':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_CARD':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_HOW_TO_PAY':
      // "{\"heat\":0,\"megaCredits\":0,\"steel\":2,\"titanium\":0,\"microbes\":0,\"floaters\":0,\"isResearchPhase\":false}"
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_HOW_TO_PAY_FOR_CARD':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_OPTION':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_PLAYER':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

    case 'SELECT_SPACE':
      throw new Error(`Unsupported player input type! ${waitingFor.playerInputType} (${waitingFor.inputType})`);

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
