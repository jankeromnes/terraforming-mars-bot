// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

exports.chooseCorporation = async (corporationCards, game) => {
  return chooseRandomItem(corporationCards).name;
}

exports.chooseInitialCards = async (initialCards, game) => {
  return [ chooseRandomItem(initialCards).name ];
}

function chooseRandomItem (items) {
  return items[Math.floor(Math.random() * items.length)];
}

exports.play = async (game) => {

  // Choose corporation and initial cards:
  const availableCorporationCards = game.waitingFor.options[0].cards;
  const availableInitialCards = game.waitingFor.options[1].cards;
  const corporation = await exports.chooseCorporation(availableCorporationCards, game);
  const initialCards = await exports.chooseInitialCards(availableInitialCards, game);
  return [[corporation], initialCards];

}
