import { GeneratedMatch } from "./types";

export interface SingleEliminationParticipant {
    id: string;
    seed?: number;
    dropped?: boolean;
    [key: string]: unknown;
}

export interface SingleEliminationMatch {
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

/**
 * Construit les appariements de têtes de série d'un arbre d'élimination directe
 * pour une puissance de 2 donnée M = 2^k.
 *
 * Propriété : chaque tête de série s est opposée à (M + 1 - s).
 * Pour tout N < M, les M - N joueurs manquants sont les têtes de série > N,
 * ce qui attribue exactement les Byes aux têtes de série 1, 2, ..., M - N.
 * De plus, les vainqueurs des tables 2i - 1 et 2i se rencontrent à la table i du tour suivant.
 */
function getBracketPairs(bracketSize: number): [number, number][] {
    let pairs: [number, number][] = [[1, 2]];
    let currentSize = 2;

    while (currentSize < bracketSize) {
        currentSize *= 2;
        const sum = currentSize + 1;
        const nextPairs: [number, number][] = [];
        for (const [s1, s2] of pairs) {
            nextPairs.push([s1, sum - s1]);
            nextPairs.push([s2, sum - s2]);
        }
        pairs = nextPairs;
    }

    return pairs;
}

function getMatchWinner(match: SingleEliminationMatch): string {
    if (match.winnerId) {
        return match.winnerId;
    }
    if (match.isBye || match.p2Id === null) {
        return match.p1Id;
    }
    const p1Score = Number(match.p1Score ?? 0);
    const p2Score = Number(match.p2Score ?? 0);
    if (p1Score > p2Score) {
        return match.p1Id;
    }
    if (p2Score > p1Score && match.p2Id) {
        return match.p2Id;
    }
    return match.p1Id;
}

/**
 * Génère une ronde d'élimination directe (Single Elimination).
 *
 * - Ronde 1 :
 *   Calcule la prochaine puissance de 2 M = 2^ceil(log2(N)).
 *   Si N n'est pas une puissance de 2, les M - N meilleures têtes de série
 *   reçoivent un Bye au premier tour.
 * - Ronde 2+ :
 *   Apparie les vainqueurs de la ronde précédente dans l'ordre de l'arbre
 *   (vainqueur table 2i - 1 contre vainqueur table 2i).
 */
export function generateSingleEliminationRound(
    participants: SingleEliminationParticipant[],
    currentRoundNumber: number,
    previousMatches: SingleEliminationMatch[] = []
): GeneratedMatch[] {
    const active = participants.filter(p => !p.dropped);
    if (active.length === 0) {
        return [];
    }

    if (currentRoundNumber === 1) {
        // Trier les participants actifs par tête de série (seed) si spécifié
        const sorted = [...active].sort((a, b) => {
            const seedA = a.seed !== undefined ? a.seed : Number.MAX_SAFE_INTEGER;
            const seedB = b.seed !== undefined ? b.seed : Number.MAX_SAFE_INTEGER;
            return seedA - seedB;
        });

        const n = sorted.length;
        let bracketSize = 1;
        while (bracketSize < n) {
            bracketSize *= 2;
        }
        if (bracketSize < 2) {
            bracketSize = 2;
        }

        const seedPairs = getBracketPairs(bracketSize);
        const generated: GeneratedMatch[] = [];

        for (let i = 0; i < seedPairs.length; i++) {
            const [seedA, seedB] = seedPairs[i];
            const tableNumber = i + 1;

            const playerA = seedA <= n ? sorted[seedA - 1] : null;
            const playerB = seedB <= n ? sorted[seedB - 1] : null;

            if (!playerA && !playerB) {
                continue;
            }

            if (playerA && !playerB) {
                generated.push({
                    tableNumber,
                    roundNumber: 1,
                    p1Id: playerA.id,
                    p2Id: null,
                    isBye: true,
                });
            } else if (playerB && !playerA) {
                generated.push({
                    tableNumber,
                    roundNumber: 1,
                    p1Id: playerB.id,
                    p2Id: null,
                    isBye: true,
                });
            } else if (playerA && playerB) {
                generated.push({
                    tableNumber,
                    roundNumber: 1,
                    p1Id: playerA.id,
                    p2Id: playerB.id,
                    isBye: false,
                });
            }
        }

        return generated;
    }

    // Ronde 2+ : apparier les vainqueurs de la ronde précédente (currentRoundNumber - 1)
    const prevRoundMatches = previousMatches
        .filter(m => m.roundNumber === currentRoundNumber - 1)
        .sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0));

    if (prevRoundMatches.length === 0) {
        return [];
    }

    const nextMatches: GeneratedMatch[] = [];
    let nextTable = 1;

    for (let i = 0; i < prevRoundMatches.length; i += 2) {
        const m1 = prevRoundMatches[i];
        const m2 = prevRoundMatches[i + 1];

        const winner1 = getMatchWinner(m1);
        const winner2 = m2 ? getMatchWinner(m2) : null;

        if (!winner2) {
            nextMatches.push({
                tableNumber: nextTable++,
                roundNumber: currentRoundNumber,
                p1Id: winner1,
                p2Id: null,
                isBye: true,
            });
        } else {
            nextMatches.push({
                tableNumber: nextTable++,
                roundNumber: currentRoundNumber,
                p1Id: winner1,
                p2Id: winner2,
                isBye: false,
            });
        }
    }

    return nextMatches;
}
