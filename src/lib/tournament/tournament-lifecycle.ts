// Logique du cycle de vie des tournois : abandons, forfaits et transitions de rondes

export interface LifecycleMatch {
    id: string;
    p1Id: string;
    p2Id: string | null;
    p1Score: number;
    p2Score: number;
    status: string;
    isForfeit: boolean;
    winnerId: string | null;
    [key: string]: unknown;
}

/**
 * Résout les forfaits lorsqu'un joueur abandonne le tournoi.
 *
 * Règles :
 * - Si le match n'est pas terminé (status !== "FINISHED") :
 *   - Attribue une victoire 2-0 par forfait à l'adversaire (winnerId = opponentId, pOppScore = 2, pDropScore = 0).
 *   - Marque status: "FINISHED" et isForfeit: true.
 *   - Si les deux joueurs sont déclarés abandonnés ou si aucun adversaire n'est présent (Bye),
 *     winnerId est null ou ajusté en conséquence.
 * - Si le match est déjà terminé (status === "FINISHED") :
 *   - Conserve intégralement le score et le vainqueur déjà enregistrés.
 */
export function resolveDropForfeits<T extends Record<string, any>>(
    matches: T[],
    droppedParticipantId: string
): T[] {
    return matches.map(match => {
        const p1 = match.p1Id ?? match.player1Id;
        const p2 = match.p2Id ?? match.player2Id;

        const isP1 = p1 === droppedParticipantId;
        const isP2 = p2 === droppedParticipantId;

        // Si le match ne concerne pas le joueur qui abandonne, on ne touche à rien
        if (!isP1 && !isP2) {
            return { ...match };
        }

        // Si le match est déjà terminé, préserver le résultat existant
        if (match.status === "FINISHED") {
            return { ...match };
        }

        // Le match n'est pas terminé : application du forfait
        if (isP1 && isP2) {
            return {
                ...match,
                status: "FINISHED",
                isForfeit: true,
                p1Score: 0,
                p2Score: 0,
                player1Score: 0,
                player2Score: 0,
                winnerId: null,
            };
        }

        if (isP1) {
            const opponentId = p2 || null;
            return {
                ...match,
                status: "FINISHED",
                isForfeit: true,
                p1Score: 0,
                p2Score: opponentId ? 2 : 0,
                player1Score: 0,
                player2Score: opponentId ? 2 : 0,
                winnerId: opponentId,
            };
        }

        // isP2
        const opponentId = p1 || null;
        return {
            ...match,
            status: "FINISHED",
            isForfeit: true,
            p1Score: opponentId ? 2 : 0,
            p2Score: 0,
            player1Score: opponentId ? 2 : 0,
            player2Score: 0,
            winnerId: opponentId,
        };
    });
}

/**
 * Vérifie si tous les matchs d'une ronde sont terminés.
 */
export function areAllMatchesFinished(matches: { status: string }[]): boolean {
    return matches.length > 0 && matches.every(m => m.status === "FINISHED");
}

/**
 * Calcule le nombre recommandé de rondes suisses en fonction du nombre de joueurs actifs.
 * Règle standard : ceil(log2(n)), minimum 3 rondes si n >= 4.
 */
export function calculateDefaultSwissRounds(activeParticipantsCount: number): number {
    if (activeParticipantsCount <= 2) return 1;
    if (activeParticipantsCount <= 4) return 2;
    if (activeParticipantsCount <= 8) return 3;
    if (activeParticipantsCount <= 16) return 4;
    if (activeParticipantsCount <= 32) return 5;
    if (activeParticipantsCount <= 64) return 6;
    if (activeParticipantsCount <= 128) return 7;
    return Math.ceil(Math.log2(activeParticipantsCount));
}

/**
 * Détermine si le format ou les paramètres d'un tournoi peuvent être modifiés.
 * Seule la phase d'inscriptions (REGISTRATION) autorise la modification de format.
 */
export function canEditTournamentFormat(status: string): boolean {
    return status === "REGISTRATION";
}
