import { PlayerViewModel } from "../terraforming-mars/src/common/models/PlayerModel";
import { quantum } from "./quantum";

export class player extends quantum {
    remainingGenerations = (game: PlayerViewModel) => {
        var expectedTemperature = game.game.temperature;
        var expectedOxygen = game.game.oxygenLevel;
        var expectedOceans = game.game.oceans;
        game.players.forEach(p => {
            expectedTemperature += Math.floor(p.heat / 8);
            expectedOxygen += Math.floor(p.plants / 8);
            expectedOceans += Math.floor(p.megaCredits / 18);
        })
        if (expectedOceans >= 9 && expectedTemperature >= 8 && expectedOxygen >= 14)
            return 0;
        return Math.max(1, this.lastGeneration(game.players.length) - game.game.generation);
    }

    lastGeneration(players:number) {
        switch (players) {
            case 1: return 14;
            case 2: return 12;
            case 3: return 10;
            case 4: return 9;
            case 5: return 8;
            default: throw new Error("Unexpected number of players " + players);
        }
    }
}