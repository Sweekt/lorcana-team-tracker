"use server";

import prisma from "@/lib/prisma";

export async function getDeckDetails(decklist: { cardId: string; count: number }[]) {
    const enrichedDeck = [];

    const cardIds = decklist.map(item => item.cardId);

    const existingCards = await prisma.card.findMany({
        where: { id: { in: cardIds } }
    });

    const cardsMap = new Map(existingCards.map(c => [c.id, c]));

    for (const item of decklist) {
        let card = cardsMap.get(item.cardId);

        if (!card || card.type === null || card.cost === null) {
            const [set, num] = item.cardId.split("-");
            try {
                const res = await fetch(`https://api.lorcana-api.com/cards/fetch?search=Set_Num=${set};Card_Num=${num}`);
                const data = await res.json();

                if (data && data[0]) {
                    const cardData = {
                        name: data[0].Name || "Carte Inconnue",
                        imageUrl: data[0].Image || "",
                        type: data[0].Type || "Unknown",
                        cost: data[0].Cost || 0,
                    };

                    if (card) {
                        // Met à jour en base
                        card = await prisma.card.update({
                            where: { id: item.cardId },
                            data: cardData
                        });
                    } else {
                        // Crée en base
                        card = await prisma.card.create({
                            data: { id: item.cardId, ...cardData }
                        });
                    }
                }
            } catch (e) {
                console.error("Erreur API Lorcana:", e);
            }
        }

        enrichedDeck.push({
            cardId: item.cardId,
            count: item.count,
            name: card?.name || "Carte Inconnue",
            imageUrl: card?.imageUrl || "",
            type: card?.type || "Unknown",
            cost: card?.cost || 0
        });
    }

    const typeOrder: Record<string, number> = {
        "Character": 1,
        "Action": 2,
        "Item": 3,
        "Location": 4
    };

    enrichedDeck.sort((a, b) => {
        const orderA = typeOrder[a.type] || 5;
        const orderB = typeOrder[b.type] || 5;

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.cost - b.cost;
    });

    return enrichedDeck;
}