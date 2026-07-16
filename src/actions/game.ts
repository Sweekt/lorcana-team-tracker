"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function recordGame(formData: FormData, userId: string, teamId: string) {
    const queueId = formData.get("queueId") as string;
    const result = formData.get("result") as string; // Normalement "win" ou "loss"
    const oppDisplayName = formData.get("oppDisplayName") as string;
    const wentFirst = formData.get("wentFirst") === "true";
    const myDeckColors = formData.get("myDeckColors") as string;
    const oppDeckColors = formData.get("oppDeckColors") as string;

    if (!queueId || !result || !oppDisplayName) {
        return { error: "Des champs obligatoires sont manquants." };
    }

    try {
        const gameRecord = await prisma.$transaction(async (tx) => {

            const currentStat = await tx.userQueueStat.findUnique({
                where: {
                    userId_queueId: { userId, queueId }
                }
            });

            const currentMmr = currentStat?.mmr ?? 1000;
            const currentGamesPlayed = currentStat?.gamesPlayed ?? 0;

            const mmrChange = result === "win" ? 25 : -25;
            const newMmr = Math.max(0, currentMmr + mmrChange); // On empêche le MMR de tomber sous zéro

            const newGame = await tx.game.create({
                data: {
                    result,
                    oppDisplayName,
                    queueId,
                    mmrAfter: newMmr,
                    wentFirst,
                    myDeckColors,
                    oppDeckColors,
                    userId,
                    teamId,
                }
            });

            await tx.userQueueStat.upsert({
                where: {
                    userId_queueId: { userId, queueId }
                },
                update: {
                    mmr: newMmr,
                    gamesPlayed: currentGamesPlayed + 1
                },
                create: {
                    userId,
                    queueId,
                    mmr: newMmr,
                    gamesPlayed: 1
                }
            });

            return newGame;
        });

        revalidatePath("/");

        return { success: true, gameId: gameRecord.id };

    } catch (error) {
        console.error("Erreur lors de l'enregistrement de la partie:", error);
        return { error: "Impossible d'enregistrer la partie." };
    }
}