import { InputResponse } from "../terraforming-mars/src/common/inputs/InputResponse";
import { PlayerInputModel } from "../terraforming-mars/src/common/models/PlayerInputModel";
import { PlayerViewModel } from "../terraforming-mars/src/common/models/PlayerModel";

export interface IBot {
    play(game:PlayerViewModel, option:PlayerInputModel): InputResponse
}