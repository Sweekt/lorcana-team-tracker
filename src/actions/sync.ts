"use server";

import prisma from "@/lib/prisma";

export async function syncTeamHistory() {
    try {
        // 1. Récupérer tous les joueurs de l'équipe
        const players = await prisma.player.findMany();
        let totalInserted = 0;

        for (const player of players) {
            let hasMore = true;
            let cursor: string | null = null;

            while (hasMore) {
                // Construction de l'URL avec le curseur de pagination si nécessaire
                const url = new URL("https://duels.ink/api/me/match-history");
                if (cursor) url.searchParams.append("cursor", cursor);

                // 2. Appel à l'API (à adapter si l'auth se fait via un header spécifique plutôt que Bearer)
                const response = await fetch(url.toString(), {
                    headers: {
                        "Authorization": `Bearer ${player.apiToken}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    console.error(`Erreur de synchro pour le joueur ${player.name}: ${response.status}`);
                    break; // On passe au joueur suivant en cas d'erreur
                }

                const data = await response.json();
                const games = data.games || [];

                // 3. Filtrer uniquement le matchmaking
                const matchmakingGames = games.filter((g: any) => g.mode === "matchmaking");

                if (matchmakingGames.length > 0) {
                    // Préparation du payload pour Prisma
                    const gamesToInsert = matchmakingGames.map((game: any) => ({
                        id: game.game_id,
                        playerId: player.id,
                        startedAt: new Date(game.started_at),
                        queueId: game.queue_id,
                        wentFirst: game.went_first,
                        result: game.result,
                        endReason: game.end_reason,
                        myLore: game.your_lore,
                        oppLore: game.opp_lore,
                        mmrBefore: game.mmr_before,
                        mmrAfter: game.mmr_after,
                        mmrDelta: game.mmr_delta,
                        myDeckColors: game.your_deck_colors,
                        yourDecklist: game.your_decklist ? JSON.stringify(game.your_decklist) : null,
                        oppDisplayName: game.opp_display_name,
                        oppDeckColors: game.opp_deck_colors,
                        replayUrl: game.replay_url
                    }));

                    // 4. Vérification du point d'arrêt
// On cherche quelles parties parmi celles reçues sont DÉJÀ en base de données
                    const existingGames = await prisma.game.findMany({
                        where: { id: { in: gamesToInsert.map((g: any) => g.id) } },
                        select: { id: true }
                    });

                    const existingIds = new Set(existingGames.map(g => g.id));

// On ne garde que les parties qui n'existent PAS encore en base
                    const filteredGamesToInsert = gamesToInsert.filter((g: any) => !existingIds.has(g.id));

                    let insertedCount = 0;

// 5. Insertion uniquement s'il y a des nouveautés
                    if (filteredGamesToInsert.length > 0) {
                        const insertResult = await prisma.game.createMany({
                            data: filteredGamesToInsert,
                            // On a retiré skipDuplicates ici car on a filtré manuellement au-dessus !
                        });
                        insertedCount = insertResult.count;
                        totalInserted += insertedCount;
                    }

// Si on a croisé des games qui existaient déjà, on a fini pour ce joueur (point d'arrêt)
                    if (existingGames.length > 0) {
                        break;
                    }
                }

                // 6. Gestion de la pagination
                cursor = data.next_cursor;
                if (!cursor) {
                    hasMore = false;
                }
            }
        }

        return { success: true, message: `${totalInserted} nouvelles parties synchronisées !` };

    } catch (error) {
        console.error("Erreur lors de la synchronisation:", error);
        return { success: false, message: "Une erreur est survenue lors de la synchronisation." };
    }
}