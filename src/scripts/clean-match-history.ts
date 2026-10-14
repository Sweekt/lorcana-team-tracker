import prisma from "../lib/prisma";

/**
 * Script de maintenance sécurisé pour la production.
 *
 * Ce script :
 * 1. Supprime UNIQUEMENT les enregistrements des tables Game et UserQueueStat.
 * 2. Préserve INTÉGRALEMENT les tables User, Team, TeamMember, Account, Session et Card.
 * 3. Met à jour les files d'attente actives (activeQueues) de toutes les équipes pour y inclure le Set 14.
 */
async function main() {
    console.log("=== DÉBUT DE LA MAINTENANCE DUEL TRACKER ===");

    const existingGamesCount = await prisma.game.count();
    const existingStatsCount = await prisma.userQueueStat.count();

    console.log(`Données actuelles à réinitialiser :`);
    console.log(`- Parties (Game) : ${existingGamesCount}`);
    console.log(`- Statistiques de files (UserQueueStat) : ${existingStatsCount}`);

    console.log("\nPurge des parties et des statistiques de files en cours...");

    const deleteStatsResult = await prisma.userQueueStat.deleteMany();
    console.log(`✓ ${deleteStatsResult.count} statistiques supprimées.`);

    const deleteGamesResult = await prisma.game.deleteMany();
    console.log(`✓ ${deleteGamesResult.count} parties supprimées.`);

    console.log("\nMise à jour des équipes avec les files du Set 14...");
    const teams = await prisma.team.findMany();
    let updatedTeamsCount = 0;

    const set14Queues = ["Core BO1 - Set 14", "Core BO3 - Set 14"];

    for (const team of teams) {
        const currentQueues = new Set(team.activeQueues || []);
        let hasChanges = false;

        for (const q of set14Queues) {
            if (!currentQueues.has(q)) {
                currentQueues.add(q);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await prisma.team.update({
                where: { id: team.id },
                data: { activeQueues: Array.from(currentQueues) }
            });
            updatedTeamsCount++;
            console.log(`✓ Équipe "${team.name}" mise à jour avec les files Set 14 (${Array.from(currentQueues).join(", ")})`);
        } else {
            console.log(`- Équipe "${team.name}" a déjà les files Set 14 configurées.`);
        }
    }

    console.log("\n=== RÉSUMÉ DE L'OPÉRATION ===");
    console.log(`✓ ${deleteGamesResult.count} parties purgées`);
    console.log(`✓ ${deleteStatsResult.count} stats de files purgées`);
    console.log(`✓ ${updatedTeamsCount}/${teams.length} équipes mises à jour avec le Set 14`);
    console.log("✓ Utilisateurs, comptes, sessions, équipes et membres préservés à 100%");
    console.log("\nVous pouvez maintenant déclencher une synchronisation depuis l'application pour recharger les historiques propres ! 🎉");
}

main()
    .catch((e) => {
        console.error("Erreur lors de la maintenance :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
