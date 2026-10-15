import { GeneratedMatch } from "./types";

export interface RoundRobinParticipant {
    id: string;
    name?: string;
    dropped?: boolean;
    [key: string]: unknown;
}

/**
 * Génère toutes les rondes d'un tournoi toutes rondes (Round Robin)
 * en utilisant l'algorithme du cercle (Berger tables).
 *
 * Règles :
 * - Les joueurs avec `dropped: true` sont exclus.
 * - Si N est pair : exactement N - 1 rondes de N / 2 matchs.
 * - Si N est impair : exactement N rondes de (N - 1) / 2 matchs + 1 Bye par ronde.
 *   Chaque joueur reçoit exactement 1 Bye au cours du tournoi.
 */
export function generateRoundRobinRounds(
    participants: RoundRobinParticipant[]
): GeneratedMatch[][] {
    const active = participants.filter(p => !p.dropped);
    const n = active.length;

    if (n < 2) {
        return [];
    }

    const isOdd = n % 2 === 1;
    // Si impair, on ajoute un participant fantôme (null) pour le Bye
    const pool: Array<RoundRobinParticipant | null> = [...active];
    if (isOdd) {
        pool.push(null);
    }

    const m = pool.length; // Garanti pair (m >= 2)
    const roundsCount = m - 1;
    const matchesPerRound = m / 2;

    const allRounds: GeneratedMatch[][] = [];

    // L'élément pool[0] reste fixe, les autres tournent
    let currentPlayers = [...pool];

    for (let r = 0; r < roundsCount; r++) {
        const roundNumber = r + 1;
        const roundMatches: GeneratedMatch[] = [];
        let tableNumber = 1;

        for (let i = 0; i < matchesPerRound; i++) {
            const pA = currentPlayers[i];
            const pB = currentPlayers[m - 1 - i];

            if (pA === null && pB === null) {
                continue;
            }

            if (pA === null && pB !== null) {
                // pB reçoit un Bye
                roundMatches.push({
                    tableNumber: tableNumber++,
                    roundNumber,
                    p1Id: pB.id,
                    p2Id: null,
                    isBye: true,
                });
            } else if (pB === null && pA !== null) {
                // pA reçoit un Bye
                roundMatches.push({
                    tableNumber: tableNumber++,
                    roundNumber,
                    p1Id: pA.id,
                    p2Id: null,
                    isBye: true,
                });
            } else if (pA !== null && pB !== null) {
                roundMatches.push({
                    tableNumber: tableNumber++,
                    roundNumber,
                    p1Id: pA.id,
                    p2Id: pB.id,
                    isBye: false,
                });
            }
        }

        allRounds.push(roundMatches);

        // Rotation du cercle : on conserve currentPlayers[0] fixe, et on fait pivoter les indices 1..m-1
        const fixed = currentPlayers[0];
        const rotating = currentPlayers.slice(1);
        const last = rotating.pop()!;
        rotating.unshift(last);
        currentPlayers = [fixed, ...rotating];
    }

    return allRounds;
}
