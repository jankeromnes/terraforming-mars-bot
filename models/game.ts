export interface CardInstance {
    name: string;
    calculatedCost: number;
    cardType: string;
    isDisabled: boolean;
}

export interface Milestone2 {
    name: string;
    terraformRating: number;
    terraformRatingTurmoil: number;
    description: string;
}

export interface Score {
    playerColor: string;
    playerScore: number;
}

export interface Milestone {
    player_name: string;
    player_color: string;
    milestone: Milestone2;
    scores: Score[];
}

export interface Award {
    name: string;
    description: string;
}

export interface AwardInstance {
    player_name: string;
    player_color: string;
    award: Award;
    scores: Score[];
}

export interface VictoryPointsBreakdown {
    terraformRating: number;
    milestones: number;
    awards: number;
    greenery: number;
    city: number;
    victoryPoints: number;
    total: number;
    detailsCards: string[];
    detailsMilestones: any[];
    detailsAwards: any[];
}

export interface Tag {
    tag: string;
    count: number;
}

export interface Player {
    color: string;
    corporationCard: CardInstance;
    energy: number;
    energyProduction: number;
    heat: number;
    heatProduction: number;
    id: string;
    megaCredits: number;
    megaCreditProduction: number;
    name: string;
    plants: number;
    plantProduction: number;
    playedCards: CardInstance[];
    cardsInHandNbr: number;
    citiesCount: number;
    coloniesCount: number;
    noTagsCount: number;
    influence: number;
    coloniesExtension: boolean;
    steel: number;
    steelProduction: number;
    steelValue: number;
    terraformRating: number;
    titanium: number;
    titaniumProduction: number;
    titaniumValue: number;
    victoryPointsBreakdown: VictoryPointsBreakdown;
    isActive: boolean;
    venusNextExtension: boolean;
    venusScaleLevel: number;
    boardName: string;
    colonies: any[];
    tags: Tag[];
    showOtherPlayersVP: boolean;
    actionsThisGeneration: any[];
    fleetSize: number;
    tradesThisTurn: number;
    selfReplicatingRobotsCards: any[];
    deckSize: number;
    actionsTakenThisRound: number;
    preludeExtension: boolean;
}

export interface Space {
    x: number;
    y: number;
    id: string;
    bonus: number[];
    spaceType: string;
    tileType?: number;
    color: string;
}

export interface CardInstance {
    name: string;
    calculatedCost: number;
    cardType: string;
    isDisabled: boolean;
}

export interface Message {
    message: string
}

export interface Option {
    title: string | Message;
    buttonLabel: string;
    inputType: number;

    options?: Option[];

    cards?: CardInstance[];
    maxCardsToSelect?: number;
    minCardsToSelect?: number;

    min?: number;
    max?: number;

    players?: Player[];

    availableSpaces?: string[];

    canUseHeat?: boolean;
    canUseSteel?: boolean;
    canUseTitanium?: boolean;

    amount?: number;
}

export interface CorporationCard {
    name: string;
    tags: string[];
    startingMegaCredits: number;
    cardType: string;
}

export interface RenderItem{
    tile: any;
    type: string,
    amount?: number, 
    multiplier?: boolean, 
    anyPlayer?: true,
    _rows?: RenderRow[],

    // these properties are purely for rendering and have no use
    size?: string,
    showDigit?: true,
    isIcon?: boolean 
}
export type RenderRow = RenderItem[]

export interface RenderData {
    _rows: RenderRow[];
}

export interface Requirement {
    _type: string;
    _amount: number;
    _isMax: boolean;
}

export interface Requirements {
    requirements: Requirement[];
}

export interface Metadata {
    cardNumber: string;
    renderData: RenderData;
    description: string;
    victoryPoints: any;
    requirements: Requirements;
}

export interface ProjectCard {
    cost: number;
    tags: string[];
    cardType: string;
    name: string;
    metadata: Metadata;
    hasRequirements?: boolean;
    resourceType: string;
    resourceCount?: number;
}

export interface Game {
    cardsInHand: CardInstance[];
    draftedCards: any[];
    milestones: Milestone[];
    awards: AwardInstance[];
    cardCost: number;
    color: string;
    corporationCard: CardInstance;
    energy: number;
    energyProduction: number;
    generation: number;
    heat: number;
    heatProduction: number;
    id: string;
    megaCredits: number;
    megaCreditProduction: number;
    name: string;
    oceans: number;
    oxygenLevel: number;
    phase: string;
    plants: number;
    plantProduction: number;
    playedCards: CardInstance[];
    cardsInHandNbr: number;
    citiesCount: number;
    coloniesCount: number;
    noTagsCount: number;
    influence: number;
    coloniesExtension: boolean;
    players: Player[];
    spaces: Space[];
    steel: number;
    steelProduction: number;
    steelValue: number;
    temperature: number;
    terraformRating: number;
    titanium: number;
    titaniumProduction: number;
    titaniumValue: number;
    victoryPointsBreakdown: VictoryPointsBreakdown;
    waitingFor: Option;
    isSoloModeWin: boolean;
    gameAge: number;
    isActive: boolean;
    corporateEra: boolean;
    venusNextExtension: boolean;
    venusScaleLevel: number;
    boardName: string;
    colonies: any[];
    tags: Tag[];
    showOtherPlayersVP: boolean;
    actionsThisGeneration: any[];
    fleetSize: number;
    tradesThisTurn: number;
    selfReplicatingRobotsCards: any[];
    dealtCorporationCards: CorporationCard[];
    dealtPreludeCards: any[];
    dealtProjectCards: ProjectCard[];
    initialDraft: boolean;
    deckSize: number;
    randomMA: string;
    actionsTakenThisRound: number;
    passedPlayers: any[];
    aresExtension: boolean;
    preludeExtension: boolean;
}