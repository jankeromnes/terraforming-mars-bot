import type { AltSecondaryTag } from "../terraforming-mars/src/common/cards/render/AltSecondaryTag";
import type { CardRenderSymbolType } from "../terraforming-mars/src/common/cards/render/CardRenderSymbolType";
import type { Size } from "../terraforming-mars/src/common/cards/render/Size";
import type { Tag } from "../terraforming-mars/src/common/cards/Tag";
import type { TileType } from "../terraforming-mars/src/common/TileType";

export type CardRenderItem = {
    is: 'item';
    type: string;
    anyPlayer?: boolean;
    showDigit?: boolean;
    amountInside?: boolean;
    isPlayed?: boolean;
    text?: string;
    isUppercase?: boolean;
    isBold?: boolean;
    isPlate?: boolean;
    size?: Size;
    secondaryTag?: Tag | AltSecondaryTag;
    multiplier?: boolean;
    cancelled?: boolean;
    over?: number;
}

export type CardRenderRoot = {
    is: 'root';
    rows: MyCardComponent[][];
}

export type CardRenderProductionBox = {
    is: 'production-box';
    rows: MyCardComponent[][]
}

export type CardRenderEffect = {
    is: 'effect';
    rows: MyCardComponent[][]
}
//'corp-box-effect' |
//'corp-box-action' |
export type CardRenderSymbol = {
    is: 'symbol';
    type: CardRenderSymbolType;
    size: Size;
    isIcon: boolean;
}
export type CardRenderTile = {
    is: 'tile';
    tile: TileType;
    hasSymbol: boolean;
    isAres: boolean;
}

export type MyCardComponent = 
    CardRenderItem |
    CardRenderRoot |
    CardRenderProductionBox | 
    CardRenderEffect |
    CardRenderSymbol |
    CardRenderTile;
