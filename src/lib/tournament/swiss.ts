import { computeStandings } from "./standings";
import { GeneratedMatch, StandingRow } from "./types";

export interface SwissParticipant {
    id: string;
    name?: string;
    seed?: number;
    dropped?: boolean;
    [key: string]: unknown;
}

export interface SwissMatch {
    roundNumber?: number;
    tableNumber?: number;
    p1Id: string;
    p2Id: string | null;
    p1Score?: number;
    p2Score?: number;
    winnerId?: string | null;
    isBye?: boolean;
    [key: string]: unknown;
}

function getPairKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}::${id2}` : `${id2}::${id1}`;
}

/**
 * Génère les appariements d'une ronde de système suisse (Swiss format).
 *
 * Règles :
 * - Exclut les participants avec `dropped: true`.
 * - Calcule le classement actuel via `computeStandings`.
 * - Si le nombre de participants actifs est impair :
 *   Attribue un Bye au joueur actif le plus bas au classement n'ayant PAS
 *   encore reçu de Bye dans les rondes précédentes (`isBye: true`).
 *   Un joueur ne peut pas recevoir plus d'un Bye.
 * - Système suisse hollandais (Dutch Swiss) :
 *   Regroupe les joueurs restants par score (score brackets), apparie dans chaque tranche
 *   en évitant les confrontations déjà disputées (rematch avoidance).
 *   Si un appariement sans rematch est impossible, apparie avec un nombre minimal
 *   de rematches plutôt que de planter.
 */
export function generateSwissRound(
    participants: SwissParticipant[],
    previousMatches: SwissMatch[] = [],
    roundNumber: number = 1
): GeneratedMatch[] {
    const active = participants.filter(p => !p.dropped);
    if (active.length === 0) {
        return [];
    }

    if (active.length === 1) {
        return [
            {
                tableNumber: 1,
                roundNumber,
                p1Id: active[0].id,
                p2Id: null,
                isBye: true,
            },
        ];
    }

    // 1. Calcul du classement actuel des joueurs
    const standings = computeStandings(participants, previousMatches);
    // Filtrer les standings pour ne conserver que les participants actifs
    const activeStandings = standings.filter(s =>
        active.some(p => p.id === s.participantId)
    );

    // Si les participants ont un 'seed' et que les points de match sont égaux,
    // on affine le classement par seed
    const seedMap = new Map<string, number>();
    for (const p of participants) {
        if (p.seed !== undefined) {
            seedMap.set(p.id, p.seed);
        }
    }
    if (seedMap.size > 0) {
        activeStandings.sort((a, b) => {
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
            const seedA = seedMap.get(a.participantId) ?? Number.MAX_SAFE_INTEGER;
            const seedB = seedMap.get(b.participantId) ?? Number.MAX_SAFE_INTEGER;
            if (seedA !== seedB) {
                return seedA - seedB;
            }
            return a.participantId.localeCompare(b.participantId);
        });
        activeStandings.forEach((row, idx) => {
            row.rank = idx + 1;
        });
    }

    // 2. Gestion du Bye en cas d'effectif impair
    let byeMatch: GeneratedMatch | null = null;
    let poolToPair = [...activeStandings];

    if (poolToPair.length % 2 === 1) {
        const playersWithPriorBye = new Set<string>();
        for (const match of previousMatches) {
            if (match.isBye || match.p2Id === null) {
                if (match.p1Id) playersWithPriorBye.add(match.p1Id);
                if (match.p2Id) playersWithPriorBye.add(match.p2Id);
            }
        }

        // Trouver le joueur actif le plus bas au classement n'ayant pas eu de Bye
        let byePlayerIndex = -1;
        for (let i = poolToPair.length - 1; i >= 0; i--) {
            const candidateId = poolToPair[i].participantId;
            if (!playersWithPriorBye.has(candidateId)) {
                byePlayerIndex = i;
                break;
            }
        }

        // Si tous les joueurs ont déjà eu un Bye, fallback sur le dernier
        if (byePlayerIndex === -1) {
            byePlayerIndex = poolToPair.length - 1;
        }

        const byePlayer = poolToPair[byePlayerIndex];
        poolToPair = poolToPair.filter((_, idx) => idx !== byePlayerIndex);

        byeMatch = {
            tableNumber: 0, // Sera ajusté avec le nombre total de tables
            roundNumber,
            p1Id: byePlayer.participantId,
            p2Id: null,
            isBye: true,
        };
    }

    // 3. Historique des confrontations directes
    const rematchesCount = new Map<string, number>();
    for (const match of previousMatches) {
        if (!match.isBye && match.p1Id && match.p2Id) {
            const key = getPairKey(match.p1Id, match.p2Id);
            rematchesCount.set(key, (rematchesCount.get(key) ?? 0) + 1);
        }
    }

    function calculateEdgeCost(
        p1: StandingRow,
        p2: StandingRow,
        bracketMid: number
    ): number {
        const rCount = rematchesCount.get(getPairKey(p1.participantId, p2.participantId)) ?? 0;
        const scoreDiff = Math.abs(p1.matchPoints - p2.matchPoints);
        const rankDiff = Math.abs(p1.rank - p2.rank);
        const rankPreference = scoreDiff === 0 ? Math.abs(rankDiff - bracketMid) : rankDiff;

        // Pénalité majeure pour rematch, moyenne pour écart de points, mineure pour l'ordre Dutch
        return rCount * 1_000_000 + scoreDiff * 10_000 + rankPreference;
    }

    // 4. Initialisation gloutonne (Greedy) pour garantir une solution valide immédiatement
    function greedyPairing(players: StandingRow[]): {
        pairs: [StandingRow, StandingRow][];
        cost: number;
    } {
        const remaining = [...players];
        const pairs: [StandingRow, StandingRow][] = [];
        let totalCost = 0;

        while (remaining.length >= 2) {
            const p1 = remaining.shift()!;
            const bracketPlayers = remaining.filter(p => p.matchPoints === p1.matchPoints);
            const mid = Math.max(1, Math.floor(bracketPlayers.length / 2));

            let bestIndex = 0;
            let bestCandidateCost = Number.MAX_SAFE_INTEGER;

            for (let i = 0; i < remaining.length; i++) {
                const c = calculateEdgeCost(p1, remaining[i], mid);
                if (c < bestCandidateCost) {
                    bestCandidateCost = c;
                    bestIndex = i;
                }
            }

            const p2 = remaining.splice(bestIndex, 1)[0];
            pairs.push([p1, p2]);
            totalCost += bestCandidateCost;
        }

        return { pairs, cost: totalCost };
    }

    const greedyResult = greedyPairing(poolToPair);
    let bestPairs = greedyResult.pairs;
    let bestCost = greedyResult.cost;

    // 5. Backtracking pour trouver l'appariement optimal avec élagage (Branch and Bound)
    if (bestCost > 0) {
        let searchSteps = 0;
        const MAX_STEPS = 20_000;

        function solve(
            remaining: StandingRow[],
            currentPairs: [StandingRow, StandingRow][],
            currentCost: number
        ): void {
            if (currentCost >= bestCost) {
                return;
            }
            if (remaining.length === 0) {
                bestCost = currentCost;
                bestPairs = [...currentPairs];
                return;
            }
            if (++searchSteps > MAX_STEPS) {
                return;
            }

            const p1 = remaining[0];
            const others = remaining.slice(1);
            const bracketPlayers = remaining.filter(p => p.matchPoints === p1.matchPoints);
            const mid = Math.max(1, Math.floor(bracketPlayers.length / 2));

            const candidates = others
                .map(p2 => ({
                    player: p2,
                    cost: calculateEdgeCost(p1, p2, mid),
                }))
                .sort((a, b) => a.cost - b.cost);

            for (const { player: p2, cost } of candidates) {
                if (currentCost + cost >= bestCost) {
                    continue;
                }
                const nextRemaining = others.filter(
                    p => p.participantId !== p2.participantId
                );
                solve(nextRemaining, [...currentPairs, [p1, p2]], currentCost + cost);
                if (bestCost === 0) {
                    return;
                }
            }
        }

        solve(poolToPair, [], 0);
    }

    // 6. Ordonnancement des tables de jeu
    // Table 1 pour les meilleurs joueurs / points les plus hauts
    const sortedPairs = [...bestPairs].sort((pairA, pairB) => {
        const maxPtsA = Math.max(pairA[0].matchPoints, pairA[1].matchPoints);
        const maxPtsB = Math.max(pairB[0].matchPoints, pairB[1].matchPoints);
        if (maxPtsB !== maxPtsA) {
            return maxPtsB - maxPtsA;
        }
        const minRankA = Math.min(pairA[0].rank, pairA[1].rank);
        const minRankB = Math.min(pairB[0].rank, pairB[1].rank);
        return minRankA - minRankB;
    });

    const generatedMatches: GeneratedMatch[] = [];
    let currentTable = 1;

    for (const [rowA, rowB] of sortedPairs) {
        const p1 = rowA.rank <= rowB.rank ? rowA : rowB;
        const p2 = rowA.rank <= rowB.rank ? rowB : rowA;

        generatedMatches.push({
            tableNumber: currentTable++,
            roundNumber,
            p1Id: p1.participantId,
            p2Id: p2.participantId,
            isBye: false,
        });
    }

    // Le match Bye est placé sur la dernière table s'il existe
    if (byeMatch) {
        byeMatch.tableNumber = currentTable++;
        generatedMatches.push(byeMatch);
    }

    return generatedMatches;
}
