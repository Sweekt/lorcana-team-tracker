import { StandingRow, MatchRecord } from "./types";

export interface StandingsParticipant {
    id: string;
    name?: string;
    dropped?: boolean;
    [key: string]: unknown;
}

export interface StandingsMatch {
    roundNumber?: number;
    p1Id: string;
    p2Id: string | null;
    p1Score?: number;
    p2Score?: number;
    winnerId?: string | null;
    isBye?: boolean;
    isForfeit?: boolean;
    status?: string;
    [key: string]: unknown;
}

interface PlayerStats {
    participantId: string;
    name?: string;
    dropped: boolean;
    wins: number;
    losses: number;
    draws: number;
    matchPoints: number;
    gameWins: number;
    gameLosses: number;
    opponents: string[];
}

/**
 * Calcule le classement complet et les départages (OMWP / PGWP / OGWP)
 * selon les règles officielles des tournois Disney Lorcana.
 *
 * Règles :
 * - Victoire de match : 3 points, Match nul : 1 point, Défaite : 0 point.
 * - Match Win Percentage (MWP) : ratio des points de match sur points possibles, avec plancher à 0.33.
 * - Opponents' Match Win Percentage (OMWP) : moyenne des MWP des adversaires rencontrés (hors Byes).
 * - Player Game Win Percentage (PGWP) : ratio des manches gagnées sur manches disputées.
 * - Opponents' Game Win Percentage (OGWP) : moyenne des PGWP des adversaires.
 * - Tri : points de match DESC, omwp DESC, pgwp DESC, ogwp DESC.
 * - Byes : attribuent 3 points de match et 2-0 en manches, mais sont exclus du calcul d'OMWP/OGWP adverse.
 */
export function computeStandings(
    participants: StandingsParticipant[],
    completedMatches: StandingsMatch[] = []
): StandingRow[] {
    const statsMap = new Map<string, PlayerStats>();

    for (const p of participants) {
        statsMap.set(p.id, {
            participantId: p.id,
            name: p.name,
            dropped: Boolean(p.dropped),
            wins: 0,
            losses: 0,
            draws: 0,
            matchPoints: 0,
            gameWins: 0,
            gameLosses: 0,
            opponents: [],
        });
    }

    for (const match of completedMatches) {
        // Ignorer les matchs non terminés si le statut est spécifié
        if (match.status && match.status !== "FINISHED") {
            continue;
        }

        const isBye = Boolean(match.isBye || match.p2Id === null);

        if (isBye) {
            const p1 = statsMap.get(match.p1Id);
            if (p1) {
                p1.wins += 1;
                p1.matchPoints += 3;
                const p1Score = match.p1Score !== undefined && match.p1Score > 0 ? match.p1Score : 2;
                const p2Score = match.p2Score !== undefined && match.p2Score > 0 ? match.p2Score : 0;
                p1.gameWins += p1Score;
                p1.gameLosses += p2Score;
                // Un Bye n'est pas un adversaire : aucun adversaire ajouté
            }
            continue;
        }

        const p1Id = match.p1Id;
        const p2Id = match.p2Id;
        if (!p2Id) continue;

        const p1 = statsMap.get(p1Id);
        const p2 = statsMap.get(p2Id);

        const p1Score = Number(match.p1Score ?? 0);
        const p2Score = Number(match.p2Score ?? 0);

        if (p1) {
            p1.gameWins += p1Score;
            p1.gameLosses += p2Score;
            p1.opponents.push(p2Id);
        }

        if (p2) {
            p2.gameWins += p2Score;
            p2.gameLosses += p1Score;
            p2.opponents.push(p1Id);
        }

        let p1Won = false;
        let p2Won = false;
        let isDraw = false;

        if (match.winnerId) {
            if (match.winnerId === p1Id) {
                p1Won = true;
            } else if (match.winnerId === p2Id) {
                p2Won = true;
            } else {
                isDraw = true;
            }
        } else {
            if (p1Score > p2Score) {
                p1Won = true;
            } else if (p2Score > p1Score) {
                p2Won = true;
            } else {
                isDraw = true;
            }
        }

        if (p1Won) {
            if (p1) {
                p1.wins += 1;
                p1.matchPoints += 3;
            }
            if (p2) {
                p2.losses += 1;
            }
        } else if (p2Won) {
            if (p2) {
                p2.wins += 1;
                p2.matchPoints += 3;
            }
            if (p1) {
                p1.losses += 1;
            }
        } else {
            if (p1) {
                p1.draws += 1;
                p1.matchPoints += 1;
            }
            if (p2) {
                p2.draws += 1;
                p2.matchPoints += 1;
            }
        }
    }

    // Calcul de MWP et PGWP individuels
    const intermediateMap = new Map<
        string,
        PlayerStats & { mwp: number; pgwp: number }
    >();

    for (const [id, stats] of statsMap.entries()) {
        const matchesPlayed = stats.wins + stats.losses + stats.draws;
        const rawMwp = matchesPlayed > 0 ? stats.matchPoints / (matchesPlayed * 3) : 0;
        // Plancher officiel à 0.33 pour le MWP
        const mwp = Math.max(0.33, rawMwp);

        const totalGames = stats.gameWins + stats.gameLosses;
        const pgwp = totalGames > 0 ? stats.gameWins / totalGames : 0;

        intermediateMap.set(id, {
            ...stats,
            mwp,
            pgwp,
        });
    }

    // Calcul de OMWP et OGWP
    const rows: StandingRow[] = [];

    for (const stats of intermediateMap.values()) {
        let omwp = 0.33;
        let ogwp = 0;

        if (stats.opponents.length > 0) {
            let totalOpponentMwp = 0;
            let totalOpponentPgwp = 0;
            let validOpponentsCount = 0;

            for (const oppId of stats.opponents) {
                const opp = intermediateMap.get(oppId);
                if (opp) {
                    totalOpponentMwp += opp.mwp;
                    totalOpponentPgwp += opp.pgwp;
                    validOpponentsCount++;
                }
            }

            if (validOpponentsCount > 0) {
                omwp = totalOpponentMwp / validOpponentsCount;
                ogwp = totalOpponentPgwp / validOpponentsCount;
            }
        }

        rows.push({
            participantId: stats.participantId,
            name: stats.name,
            rank: 0,
            matchPoints: stats.matchPoints,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            gameWins: stats.gameWins,
            gameLosses: stats.gameLosses,
            mwp: stats.mwp,
            omwp,
            pgwp: stats.pgwp,
            ogwp,
            dropped: stats.dropped,
        });
    }

    // Tri officiel Lorcana :
    // 1. Points de match (DESC)
    // 2. Opponents' Match Win Percentage - OMWP (DESC)
    // 3. Player Game Win Percentage - PGWP (DESC)
    // 4. Opponents' Game Win Percentage - OGWP (DESC)
    // 5. Départage déterministe (participantId ASC)
    rows.sort((a, b) => {
        if (b.matchPoints !== a.matchPoints) {
            return b.matchPoints - a.matchPoints;
        }
        if (Math.abs(b.omwp - a.omwp) > 1e-9) {
            return b.omwp - a.omwp;
        }
        if (Math.abs(b.pgwp - a.pgwp) > 1e-9) {
            return b.pgwp - a.pgwp;
        }
        if (Math.abs(b.ogwp - a.ogwp) > 1e-9) {
            return b.ogwp - a.ogwp;
        }
        return a.participantId.localeCompare(b.participantId);
    });

    // Attribution des rangs 1..N
    rows.forEach((row, index) => {
        row.rank = index + 1;
    });

    return rows;
}
