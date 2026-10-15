// Constantes et types du domaine Tournois LoreTracker

export const TOURNAMENT_FORMATS = [
    "SWISS",
    "SWISS_TOP_CUT",
    "SINGLE_ELIMINATION",
    "ROUND_ROBIN",
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_STATUSES = [
    "REGISTRATION",
    "RUNNING",
    "TOP_CUT",
    "FINISHED",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const MATCH_STATUSES = [
    "PENDING",
    "IN_PROGRESS",
    "FINISHED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_FORMATS = ["BO1", "BO3"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export type RoundStatus = MatchStatus;

// --- Interfaces pour les participants et appariements ---

export interface PairingPlayer {
    id: string;
    name?: string;
    seed?: number;
    dropped: boolean;
    officialDecklist?: string | null;
    officialDeckColors?: string[] | null;
}

export interface GeneratedMatch {
    tableNumber: number;
    roundNumber?: number;
    p1Id: string;
    p2Id: string | null;
    isBye: boolean;
}

export interface MatchRecord {
    id?: string;
    roundNumber: number;
    p1Id: string;
    p2Id: string | null;
    p1Score: number;
    p2Score: number;
    winnerId: string | null;
    isBye: boolean;
    isForfeit?: boolean;
    status?: MatchStatus;
    p1DeckColors?: string[];
    p2DeckColors?: string[];
    wentFirstWinner?: boolean | null;
}

// --- Interfaces pour le classement et tie-breaks OMWP ---

export interface StandingRow {
    participantId: string;
    name?: string;
    rank: number;
    matchPoints: number;
    wins: number;
    losses: number;
    draws: number;
    gameWins: number;
    gameLosses: number;
    mwp: number;
    omwp: number;
    pgwp: number;
    ogwp: number;
    dropped: boolean;
}

export type ParticipantStanding = StandingRow;

// --- Interfaces pour les actions et formulaires ---

export interface CreateTournamentInput {
    name: string;
    format: TournamentFormat;
    matchFormat?: MatchFormat;
    set?: string | null;
    allowDeckChanges?: boolean;
    topCutSize?: number | null;
    roundsCount?: number | null;
}

// --- Interfaces pour les statistiques de tournoi ---

export interface InkComboStat {
    name: string;
    gamesPlayed: number;
    matchesWon: number;
    matchesPlayed: number;
    matchWinrate: number;
}

export interface TournamentStatsResult {
    inkCombos: InkComboStat[];
    wentFirstRate: number;
}

// --- Interfaces Duels.ink Bot Organisateur ---

export interface CreateTablePayload {
    asSpectator: boolean;
    players: string[];
    gameMode: string;
    matchFormat: string;
    visibility: string;
    timerPreset?: string;
}
