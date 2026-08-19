import prisma from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

function getCardUniqueId(cardData: any): string {

    if (cardData.promoGrouping) {
        return `${cardData.setCode}-${cardData.promoGrouping}-${cardData.number}`;
    }
    return `${cardData.setCode}-${cardData.number}`;
}

async function main() {
    const filePath = path.join(__dirname, "../../allCards.json");

    if (!fs.existsSync(filePath)) {
        console.error("Fichier allSets.json introuvable à l'emplacement :", filePath);
        return;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    const cardsData = jsonData.cards;

    if (!Array.isArray(cardsData)) {
        console.error("Le format du JSON est invalide : la liste des cartes est introuvable.");
        return;
    }

    console.log("Suppression des anciennes cartes en base de données...");
    await prisma.card.deleteMany();

    console.log(`Importation de ${cardsData.length} cartes en cours...`);

    for (const card of cardsData) {
        const cardId = getCardUniqueId(card);

        await prisma.card.upsert({
            where: { id: cardId },
            update: {
                name: card.fullName || card.name || "Carte Inconnue",
                imageUrl: card.images?.thumbnail || "",
                type: card.type || "Unknown",
                cost: card.cost || 0,
            },
            create: {
                id: cardId,
                name: card.fullName || card.name || "Carte Inconnue",
                imageUrl: card.images?.thumbnail || "",
                type: card.type || "Unknown",
                cost: card.cost || 0,
            },
        });
    }

    console.log("Importation terminée avec succès ! 🎉");
}

main()
    .catch((e) => {
        console.error("Erreur lors de l'importation :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });