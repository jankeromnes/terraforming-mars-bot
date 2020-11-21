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
