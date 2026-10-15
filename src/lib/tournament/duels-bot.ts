// Client API Duels.ink pour l'organisation automatique des tournois (Bot Organisateur)

export interface BuildTableCreatePayloadParams {
    p1DuelsId: string;
    p2DuelsId: string;
    matchFormat?: string;
    timerPreset?: string;
    p1Deck?: string | string[];
    p2Deck?: string | string[];
}

export type DuelsPlayerEntry = string | { player: string; deck?: string | string[] };

export interface DuelsTableCreatePayload {
    asSpectator: boolean;
    players: DuelsPlayerEntry[];
    gameMode: string;
    matchFormat: string;
    visibility: string;
    timerPreset: string;
}

export interface DuelsTableCreateResult {
    tableId: string;
    url: string;
}

export interface DuelsTableStatusResult {
    status: string;
    finished: boolean;
    winnerDuelsId?: string;
}

/**
 * Construit le payload JSON pour l'appel `POST /api/table/create` de Duels.ink.
 * Configure le bot en tant que spectateur (`asSpectator: true`), réserve les sièges
 * des deux joueurs et verrouille leurs decklists si fournies.
 */
export function buildTableCreatePayload(params: BuildTableCreatePayloadParams): DuelsTableCreatePayload {
    const { p1DuelsId, p2DuelsId, matchFormat, timerPreset, p1Deck, p2Deck } = params;

    const p1Entry: DuelsPlayerEntry = p1Deck
        ? { player: p1DuelsId, deck: p1Deck }
        : p1DuelsId;

    const p2Entry: DuelsPlayerEntry = p2Deck
        ? { player: p2DuelsId, deck: p2Deck }
        : p2DuelsId;

    return {
        asSpectator: true,
        players: [p1Entry, p2Entry],
        gameMode: "constructed",
        matchFormat: (matchFormat || "bo3").toLowerCase(),
        visibility: "private",
        timerPreset: timerPreset || "standard",
    };
}

/**
 * Crée une table privée Duels.ink pour un match de tournoi via l'API Duels.ink.
 * Utilise la clé API d'organisation `DUELS_ORGANIZER_API_KEY`.
 * En cas d'absence de clé ou d'échec API, retourne null avec log sans bloquer le tournoi.
 */
export async function createDuelsTableForMatch(
    params: BuildTableCreatePayloadParams
): Promise<DuelsTableCreateResult | null> {
    if (!params.p1DuelsId?.trim() || !params.p2DuelsId?.trim()) {
        console.warn("[DuelsBot] Identifiants joueurs manquants ou invalides.");
        return null;
    }

    const apiKey = process.env.DUELS_ORGANIZER_API_KEY?.trim();
    if (!apiKey) {
        console.warn("[DuelsBot] DUELS_ORGANIZER_API_KEY non configurée. Impossible de créer la table privée.");
        return null;
    }

    try {
        const payload = buildTableCreatePayload(params);
        const response = await fetch("https://duels.ink/api/table/create", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(`[DuelsBot] Échec de création de table (${response.status}): ${errorText}`);
            return null;
        }

        const data = await response.json();
        if (!data || !data.tableId) {
            console.error("[DuelsBot] Réponse API invalide: tableId manquant", data);
            return null;
        }

        return {
            tableId: data.tableId,
            url: data.url || `https://duels.ink/table/${data.tableId}`,
        };
    } catch (error) {
        console.error("[DuelsBot] Erreur inattendue lors de la création de la table:", error);
        return null;
    }
}

/**
 * Consulte le statut en direct d'une table Duels.ink via `GET /api/table/${tableId}/view`.
 * Retourne le statut de la table, si la partie est terminée, et le gagnant si disponible.
 */
export async function checkDuelsTableStatus(
    tableId: string
): Promise<DuelsTableStatusResult | null> {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        const apiKey = process.env.DUELS_ORGANIZER_API_KEY?.trim();
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const response = await fetch(`https://duels.ink/api/table/${tableId}/view`, {
            headers,
        });

        if (!response.ok) {
            console.error(`[DuelsBot] Impossible de récupérer le statut de la table ${tableId} (${response.status})`);
            return null;
        }

        const data = await response.json();
        const view = data?.view || data;

        if (!view || typeof view.status !== "string") {
            console.error("[DuelsBot] Structure de réponse inattendue pour table status", data);
            return null;
        }

        const status = view.status;
        const finished = view.game ? view.game.status === "finished" : status === "cancelled";
        const winnerDuelsId = view.game?.winnerUserId || undefined;

        return {
            status,
            finished,
            winnerDuelsId,
        };
    } catch (error) {
        console.error(`[DuelsBot] Erreur lors de la vérification de la table ${tableId}:`, error);
        return null;
    }
}
