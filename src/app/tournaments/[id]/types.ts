import {
    TournamentFormat,
    TournamentStatus,
    MatchStatus,
    MatchFormat,
    StandingRow,
    TournamentStatsResult,
} from "@/lib/tournament/types";

export interface TournamentDetailUser {
    id: string;
    name: string | null;
    image: string | null;
    duelsUserId?: string | null;
    duelsUsername?: string | null;
}

export interface TournamentDetailParticipant {
    id: string;
    tournamentId: string;
    userId: string;
    seed: number | null;
    dropped: boolean;
    droppedAtRound: number | null;
    officialDecklist: string | null;
    officialDeckColors: string[];
    joinedAt: Date | string;
    user: TournamentDetailUser;
}

export interface TournamentDetailMatch {
    id: string;
    roundId: string;
    tableNumber: number;
    player1Id: string;
    player2Id: string | null;
    duelsTableId: string | null;
    duelsTableUrl: string | null;
    player1Score: number;
    player2Score: number;
    isBye: boolean;
    isForfeit: boolean;
    winnerId: string | null;
    status: MatchStatus;
    replayUrl: string | null;
    player1Deck: string | null;
    player2Deck: string | null;
    player1DeckColors: string[];
    player2DeckColors: string[];
    wentFirstWinner: boolean | null;
    player1: TournamentDetailParticipant;
    player2: TournamentDetailParticipant | null;
    winner?: {
        id: string;
        userId: string;
    } | null;
    round?: {
        id: string;
        roundNumber: number;
        isTopCut: boolean;
        status: string;
    };
}

export interface TournamentDetailRound {
    id: string;
    tournamentId: string;
    roundNumber: number;
    isTopCut: boolean;
    status: string;
    createdAt: Date | string;
    matches: TournamentDetailMatch[];
}

export interface TournamentDetailData {
    id: string;
    teamId: string;
    name: string;
    format: TournamentFormat;
    status: TournamentStatus;
    matchFormat: MatchFormat;
    set: string | null;
    allowDeckChanges: boolean;
    topCutSize: number | null;
    roundsCount: number | null;
    currentRoundNumber: number;
    createdAt: Date | string;
    createdById: string;
    team: {
        id: string;
        name: string;
    };
    createdBy: {
        id: string;
        name: string | null;
    };
    participants: TournamentDetailParticipant[];
    rounds: TournamentDetailRound[];
}

export interface TournamentDetailProps {
    tournament: TournamentDetailData;
    standings: StandingRow[];
    stats: TournamentStatsResult;
    currentUserId: string;
    isAdmin: boolean;
    hasDuelsAccount: boolean;
}
