"use server";

import prisma from "@/lib/prisma";

export async function getDeckDetails(decklist: { cardId: string; count: number }[]) {
    const enrichedDeck = [];

    for (const item of decklist) {
        let card = await prisma.card.findUnique({ where: { id: item.cardId } });

        if (!card) {
            const [set, num] = item.cardId.split("-");
            try {
                const res = await fetch(`https://api.lorcana-api.com/cards/fetch?search=Set_Num=${set};Card_Num=${num}`);
                const data = await res.json();

                if (data && data[0]) {
                    card = await prisma.card.create({
                        data: {
                            id: item.cardId,
                            name: data[0].Name || "Carte Inconnue",
                            imageUrl: data[0].Image || "",
                        }
                    });
                }
            } catch (e) {
                console.error("Erreur API Lorcana:", e);
            }
        }

        enrichedDeck.push({
            cardId: item.cardId,
            count: item.count,
            name: card?.name || "Carte Inconnue",
            imageUrl: card?.imageUrl || ""
        });
    }

    return enrichedDeck;
}