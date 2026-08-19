"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentTeamId } from "@/lib/current-team";

export async function syncTeamHistory(targetUserId?: string) {
    try {
        const teamId = await getCurrentTeamId();

        if (!teamId) {
            return { success: false, message: "Vous devez faire partie d'une équipe pour synchroniser." };
        }

        const usersToSync = await prisma.user.findMany({
            where: {
                teams: { some: { teamId: teamId } },
                ...(targetUserId ? { id: targetUserId } : {}),
                lorcanaApiKey: { not: null }
            }
        });

        if (usersToSync.length === 0) {
            return { success: false, message: "Aucun joueur avec une clé API valide n'a été trouvé." };
        }

        let totalInserted = 0;

        for (const user of usersToSync) {
            let hasMore = true;
            let cursor: string | null = null;
            let userInsertedCount = 0;
            const queuesUpdated = new Set<string>();

            while (hasMore) {
                const url = new URL("https://duels.ink/api/account/history");
                if (cursor) url.searchParams.append("cursor", cursor);

                const response = await fetch(url.toString(), {
                    headers: {
                        "Authorization": `Bearer ${user.lorcanaApiKey}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    console.error(`Erreur de synchro pour le joueur ${user.name}: ${response.status}`);
                    break;
                }

                const data = await response.json();
                const games = data.games || [];

                // 1. LE FILTRE CORRIGÉ : On utilise isMatchmaking (issu du nouveau format JSON)
                const matchmakingGames = games.filter((g: any) => g.isMatchmaking === true);

                if (matchmakingGames.length > 0) {
                    const gamesToInsert = matchmakingGames.map((game: any) => ({
                        id: game.id || game.gameId,
                        userId: user.id,
                        teamId: teamId,
                        startedAt: new Date(game.createdAt),
                        queueId: game.queueSeasonName || game.queueId,
                        wentFirst: game.wentFirst,
                        result: game.result,
                        endReason: game.status,
                        myLore: game.myLore,
                        oppLore: game.opponentLore,
                        mmrBefore: game.myMmrBefore,
                        mmrAfter: game.myMmrAfter,

                        // Si le delta n'est plus fourni, on le calcule nous-mêmes
                        mmrDelta: (game.myMmrAfter && game.myMmrBefore)
                            ? (game.myMmrAfter - game.myMmrBefore)
                            : null,

                        myDeckColors: game.myColors,
                        yourDecklist: game.myDeckCardIds ? JSON.stringify(game.myDeckCardIds) : null,
                        oppDisplayName: game.opponentName,
                        oppDeckColors: game.opponentColors,

                        // Si replayUrl n'existe plus directement, on le reconstruit avec replayId
                        replayUrl: game.replayId ? `https://duels.ink/replay/${game.replayId}` : null
                    }));

                    const existingGames = await prisma.game.findMany({
                        where: { id: { in: gamesToInsert.map((g: any) => g.id) } },
                        select: { id: true }
                    });

                    const existingIds = new Set(existingGames.map(g => g.id));
                    const filteredGamesToInsert = gamesToInsert.filter((g: any) => !existingIds.has(g.id));

                    if (filteredGamesToInsert.length > 0) {
                        const insertResult = await prisma.game.createMany({
                            data: filteredGamesToInsert,
                        });
                        userInsertedCount += insertResult.count;
                        totalInserted += insertResult.count;

                        filteredGamesToInsert.forEach((g: any) => {
                            if (g.queueId) queuesUpdated.add(g.queueId);
                        });
                    }

                    if (existingGames.length > 0) {
                        break;
                    }
                }

                cursor = data.next_cursor;
                if (!cursor) {
                    hasMore = false;
                }
            }

            if (userInsertedCount > 0 && queuesUpdated.size > 0) {
                for (const queue of Array.from(queuesUpdated)) {
                    const latestGame = await prisma.game.findFirst({
                        where: { userId: user.id, queueId: queue },
                        orderBy: { startedAt: "desc" }
                    });

                    const totalGames = await prisma.game.count({
                        where: { userId: user.id, queueId: queue }
                    });

                    if (latestGame && latestGame.mmrAfter !== null) {
                        await prisma.userQueueStat.upsert({
                            where: { userId_queueId: { userId: user.id, queueId: queue } },
                            update: { mmr: Math.round(latestGame.mmrAfter), gamesPlayed: totalGames },
                            create: { userId: user.id, queueId: queue, mmr: Math.round(latestGame.mmrAfter), gamesPlayed: totalGames }
                        });
                    }
                }
            }
        }

        revalidatePath("/");
        if (targetUserId) {
            revalidatePath(`/profile/${targetUserId}`);
        }

        return { success: true, message: `${totalInserted} nouvelles parties synchronisées !` };

    } catch (error) {
        console.error("Erreur lors de la synchronisation:", error);
        return { success: false, message: "Une erreur est survenue lors de la synchronisation." };
    }
}