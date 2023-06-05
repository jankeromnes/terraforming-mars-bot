import type {CardName} from '../terraforming-mars/src/common/cards/CardName';
import type {ClientCard} from '../terraforming-mars/src/common/cards/ClientCard';
import * as cardJson from '../terraforming-mars/src/genfiles/cards.json' // assert {type: 'json'};

const cards: Map<CardName, ClientCard> = new Map();

export function getCard(cardName: CardName): ClientCard | undefined {
  return cards.get(cardName);
}

function initialize() {
  (cardJson as any as Array<ClientCard>).forEach((card) => {
    cards.set(card.name, card);
  });
}

initialize();
