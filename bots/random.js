// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

function chooseRandomItem (items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Choose corporation and initial cards
exports.playInitialResearchPhase = async (game, availableCorporations, availableCards) => {
  const corporation = chooseRandomItem(availableCorporations).name;
  const initialCards = [ chooseRandomItem(availableCards).name ];
  return [[corporation], initialCards];
}

// Play actions
exports.playActionPhase = async (game) => {
  return [["0"],["1"]];
  // [["0"],["1"],["1"]]
  // [["0"],["Power Plant","{\"heat\":0,\"megaCredits\":0,\"steel\":2,\"titanium\":0,\"microbes\":0,\"floaters\":0,\"isResearchPhase\":false}"]]
}
