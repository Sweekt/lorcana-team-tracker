import {
    InkComboStat,
    TournamentStatsResult,
} from "./types";

export interface TournamentStatsMatch {
    p1DeckColors?: string[] | null;
    p2DeckColors?: string[] | null;
    player1DeckColors?: string[] | null;
    player2DeckColors?: string[] | null;
    p1Score?: number | null;
    p2Score?: number | null;
    player1Score?: number | null;
    player2Score?: number | null;
    winnerId?: string | null;
    p1Id?: string | null;
    p2Id?: string | null;
    player1Id?: string | null;
    player2Id?: string | null;
    wentFirstWinner?: boolean | null;
    isBye?: boolean | null;
    isForfeit?: boolean | null;
    status?: string | null;
    [key: string]: unknown;
}

const INK_CANONICAL_MAP: Record<string, string> = {
    amber: "Amber",
    ambre: "Amber",
    amethyst: "Amethyst",
    amethyste: "Amethyst",
    améthyste: "Amethyst",
    emerald: "Emerald",
    emeraude: "Emerald",
    émeraude: "Emerald",
    ruby: "Ruby",
    rubis: "Ruby",
    sapphire: "Sapphire",
    saphir: "Sapphire",
    steel: "Steel",
    acier: "Steel",
};

/**
 * Ordre canonique des encres pour garantir une normalisation déterministe
 * et cohérente avec les archétypes LoreTracker ("Ruby / Amethyst", "Amber / Steel", etc.).
 */
const CANONICAL_INK_ORDER = [
    "Amber",
    "Ruby",
    "Amethyst",
    "Emerald",
    "Sapphire",
    "Steel",
];

function normalizeInk(rawInk: string): string {
    const trimmed = rawInk.trim();
    if (!trimmed) return "";
    const lower = trimmed.toLowerCase();
    if (INK_CANONICAL_MAP[lower]) {
        return INK_CANONICAL_MAP[lower];
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Normalise un tableau ou une chaîne de couleurs d'encre en une combinaison canonique.
 * Ex: ["ruby", "amethyst"] -> { name: "Ruby / Amethyst", inks: ["Ruby", "Amethyst"] }
 * Ex: ["amethyst", "ruby"] -> { name: "Ruby / Amethyst", inks: ["Ruby", "Amethyst"] }
 */
export function normalizeDeckColors(
    colors?: string[] | string | null
): { name: string; inks: string[] } | null {
    if (!colors) return null;

    const rawList: string[] = [];
    if (Array.isArray(colors)) {
        for (const item of colors) {
            if (typeof item === "string") {
                if (item.includes("/") || item.includes(",")) {
                    rawList.push(...item.split(/[\/,]+/).map((s) => s.trim()));
                } else {
                    rawList.push(item.trim());
                }
            }
        }
    } else if (typeof colors === "string") {
        rawList.push(...colors.split(/[\/,]+/).map((s) => s.trim()));
    }

    const normalizedInks = Array.from(
        new Set(rawList.map(normalizeInk).filter(Boolean))
    );

    if (normalizedInks.length === 0) {
        return null;
    }

    normalizedInks.sort((a, b) => {
        const indexA = CANONICAL_INK_ORDER.indexOf(a);
        const indexB = CANONICAL_INK_ORDER.indexOf(b);
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    return {
        name: normalizedInks.join(" / "),
        inks: normalizedInks,
    };
}

interface InkAccumulator {
    name: string;
    inks: string[];
    matchesPlayed: number;
    matchesWon: number;
    gamesPlayed: number;
    gamesWon: number;
}

/**
 * Calcule les statistiques d'un tournoi à partir de la liste des matchs joués.
 *
 * Retourne :
 * - `inkCombos`: tableau des statistiques par archétype (trié par matchs joués DESC puis winrate DESC).
 * - `wentFirst`: taux et décompte de victoires pour le joueur qui joue en premier.
 * - `totalMatches`: nombre total de matchs pris en compte.
 * - `totalGamesDecided`: nombre total de manches disputées et décidées.
 */
export function computeTournamentStats(
    matches: TournamentStatsMatch[] = []
): TournamentStatsResult {
    if (!Array.isArray(matches) || matches.length === 0) {
        return {
            inkCombos: [],
            wentFirst: {
                totalGames: 0,
                firstPlayerWins: 0,
                firstPlayerWinrate: 0,
                secondPlayerWins: 0,
                secondPlayerWinrate: 0,
            },
            wentFirstRate: 0,
            totalMatches: 0,
            totalGamesDecided: 0,
        };
    }

    let firstPlayerWins = 0;
    let secondPlayerWins = 0;
    let totalWentFirstGames = 0;
    let totalGamesDecided = 0;
    let totalProcessedMatches = 0;

    const comboMap = new Map<string, InkAccumulator>();

    for (const match of matches) {
        if (!match || typeof match !== "object") continue;

        if (match.isBye || match.p2Id === null || match.player2Id === null) {
            continue;
        }

        const p1Score = Math.max(0, Number(match.p1Score ?? match.player1Score ?? 0));
        const p2Score = Math.max(0, Number(match.p2Score ?? match.player2Score ?? 0));
        const decidedInMatch = p1Score + p2Score;

        // Si le match est en attente sans score ni gagnant ni forfeit, on ne le compte pas
        const isPendingUnplayed =
            (match.status === "PENDING" || match.status === "IN_PROGRESS") &&
            decidedInMatch === 0 &&
            !match.winnerId &&
            !match.isForfeit;

        if (isPendingUnplayed) {
            continue;
        }

        totalProcessedMatches += 1;
        totalGamesDecided += decidedInMatch;

        // Statistiques Went First / Toss
        if (match.wentFirstWinner === true) {
            firstPlayerWins += 1;
            totalWentFirstGames += 1;
        } else if (match.wentFirstWinner === false) {
            secondPlayerWins += 1;
            totalWentFirstGames += 1;
        }

        const p1Deck = normalizeDeckColors(match.p1DeckColors ?? match.player1DeckColors);
        const p2Deck = normalizeDeckColors(match.p2DeckColors ?? match.player2DeckColors);

        // Détermination du gagnant du match
        const p1Id = match.p1Id ?? match.player1Id;
        const p2Id = match.p2Id ?? match.player2Id;
        const winnerId = match.winnerId;

        let p1WonMatch = false;
        let p2WonMatch = false;

        if (winnerId) {
            if (p1Id && winnerId === p1Id) {
                p1WonMatch = true;
            } else if (p2Id && winnerId === p2Id) {
                p2WonMatch = true;
            } else if (winnerId === "p1" || winnerId === "player1") {
                p1WonMatch = true;
            } else if (winnerId === "p2" || winnerId === "player2") {
                p2WonMatch = true;
            } else {
                if (p1Score > p2Score) p1WonMatch = true;
                else if (p2Score > p1Score) p2WonMatch = true;
            }
        } else {
            if (p1Score > p2Score) p1WonMatch = true;
            else if (p2Score > p1Score) p2WonMatch = true;
        }

        // Cumul des statistiques pour le joueur 1
        if (p1Deck) {
            let acc = comboMap.get(p1Deck.name);
            if (!acc) {
                acc = {
                    name: p1Deck.name,
                    inks: p1Deck.inks,
                    matchesPlayed: 0,
                    matchesWon: 0,
                    gamesPlayed: 0,
                    gamesWon: 0,
                };
                comboMap.set(p1Deck.name, acc);
            }
            acc.matchesPlayed += 1;
            if (p1WonMatch) acc.matchesWon += 1;
            acc.gamesPlayed += decidedInMatch;
            acc.gamesWon += p1Score;
        }

        // Cumul des statistiques pour le joueur 2
        if (p2Deck) {
            let acc = comboMap.get(p2Deck.name);
            if (!acc) {
                acc = {
                    name: p2Deck.name,
                    inks: p2Deck.inks,
                    matchesPlayed: 0,
                    matchesWon: 0,
                    gamesPlayed: 0,
                    gamesWon: 0,
                };
                comboMap.set(p2Deck.name, acc);
            }
            acc.matchesPlayed += 1;
            if (p2WonMatch) acc.matchesWon += 1;
            acc.gamesPlayed += decidedInMatch;
            acc.gamesWon += p2Score;
        }
    }

    const firstPlayerWinrate =
        totalWentFirstGames > 0
            ? Math.round((firstPlayerWins / totalWentFirstGames) * 100)
            : 0;

    const secondPlayerWinrate =
        totalWentFirstGames > 0
            ? Math.round((secondPlayerWins / totalWentFirstGames) * 100)
            : 0;

    const inkCombos: InkComboStat[] = Array.from(comboMap.values()).map((c) => {
        const matchWinrate =
            c.matchesPlayed > 0
                ? Math.round((c.matchesWon / c.matchesPlayed) * 100)
                : 0;
        const gameWinrate =
            c.gamesPlayed > 0
                ? Math.round((c.gamesWon / c.gamesPlayed) * 100)
                : 0;

        return {
            name: c.name,
            inks: c.inks,
            matchesPlayed: c.matchesPlayed,
            matchesWon: c.matchesWon,
            matchWinrate,
            gamesPlayed: c.gamesPlayed,
            gamesWon: c.gamesWon,
            gameWinrate,
        };
    });

    // Tri officiel : matchs joués DESC, puis winrate de match DESC, puis nom ASC
    inkCombos.sort((a, b) => {
        if (b.matchesPlayed !== a.matchesPlayed) {
            return b.matchesPlayed - a.matchesPlayed;
        }
        if (b.matchWinrate !== a.matchWinrate) {
            return b.matchWinrate - a.matchWinrate;
        }
        return a.name.localeCompare(b.name);
    });

    return {
        inkCombos,
        wentFirst: {
            totalGames: totalWentFirstGames,
            firstPlayerWins,
            firstPlayerWinrate,
            secondPlayerWins,
            secondPlayerWinrate,
        },
        wentFirstRate: firstPlayerWinrate,
        totalMatches: totalProcessedMatches,
        totalGamesDecided,
    };
}
