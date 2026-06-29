import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import HistoryTable from "@/components/HistoryTable";
import MmrChart from "@/components/MmrChart";
import PlayerViewController from "@/components/PlayerViewController";
import PlayerStatsView from "@/components/PlayerStatsView";
import Pagination from "@/components/Pagination";

type Props = {
    params: Promise<{ name: string }>;
    searchParams: Promise<{ queue?: string; tab?: string; page?: string }>;
};

export default async function PlayerProfilePage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    const playerName = decodeURIComponent(params.name);
    const currentQueue = searchParams.queue || "ALL";
    const currentTab = searchParams.tab || "history";

    // 1. Cherche le joueur
    const player = await prisma.player.findFirst({ where: { name: playerName } });
    if (!player) notFound();

    // 2. Récupère les queues jouées ET actives
    const rawQueues = await prisma.game.findMany({
        where: { playerId: player.id, queueId: { not: null } },
        distinct: ["queueId"],
        select: { queueId: true }
    });

    // On va chercher les queues désactivées par l'admin
    const configs = await prisma.queueConfig.findMany({ where: { isActive: false } });
    const disabledQueues = new Set(configs.map(c => c.id));

    // On filtre pour ne garder que les queues autorisées
    const playerQueues = rawQueues
        .map(q => q.queueId as string)
        .filter(queueId => !disabledQueues.has(queueId));

    // 3. Données pour le Graphique MMR (Restreintes aux queues actives)
    const allGamesAsc = await prisma.game.findMany({
        where: {
            playerId: player.id,
            mmrAfter: { not: null },
            queueId: { in: playerQueues } // NOUVEAU : On filtre la DB directement !
        },
        orderBy: { startedAt: "asc" },
        select: { startedAt: true, queueId: true, mmrAfter: true }
    });

    const chartData = allGamesAsc.map(g => ({
        date: new Date(g.startedAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' }),
        [g.queueId as string]: g.mmrAfter
    }));

    // 4. Données pour l'onglet bas (Historique / Stats)
    const whereClause: any = { playerId: player.id };
    if (currentQueue !== "ALL") {
        whereClause.queueId = currentQueue;
    } else {
        whereClause.queueId = { in: playerQueues };
    }

    // --- LOGIQUE CONDITIONNELLE ---
    const PAGE_SIZE = 10;
    const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10));

    let tabContent;

    if (currentTab === "stats") {
        // ONGLET STATS : On charge TOUTES les parties (nécessaire pour un winrate exact)
        const allStatsGames = await prisma.game.findMany({
            where: whereClause,
            select: { result: true, wentFirst: true, myDeckColors: true } // Optimisation
        });
        tabContent = <PlayerStatsView games={allStatsGames} />;
    }
    else {
        // ONGLET HISTORIQUE : On compte le total pour la pagination, puis on charge les 20 bonnes
        const totalGamesCount = await prisma.game.count({ where: whereClause });
        const totalPages = Math.ceil(totalGamesCount / PAGE_SIZE) || 1;

        const historyGames = await prisma.game.findMany({
            where: whereClause,
            orderBy: { startedAt: "desc" },
            skip: (currentPage - 1) * PAGE_SIZE, // Saute les parties des pages précédentes
            take: PAGE_SIZE,                     // N'en prend que 20
            include: { player: { select: { name: true } } }
        });

        tabContent = (
            <div className="space-y-6">
                <HistoryTable games={historyGames}/>
                <Pagination currentPage={currentPage} totalPages={totalPages}/>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            <main className="max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-8">

                {/* Navigation */}
                <div className="pt-2">
                    <Link href="/" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-2">
                        ← Retour au Leaderboard
                    </Link>
                </div>

                {/* PARTIE HAUTE : PROFIL & GRAPH */}
                <section className="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-800/80 pb-8">
                        {/* Photo de profil conditionnelle */}
                        {player.avatarUrl ? (
                            <img
                                src={player.avatarUrl}
                                alt={player.name}
                                className="w-24 h-24 rounded-2xl object-cover p-1 bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shrink-0"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-1 shadow-lg shrink-0">
                                <div className="w-full h-full bg-slate-950 rounded-[0.85rem] flex items-center justify-center text-4xl font-black text-indigo-400">
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}

                        <div className="text-center sm:text-left space-y-3 my-auto w-full">
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight">{player.name}</h1>
                                <p className="text-slate-400 text-sm mt-1">Profil compétitif Lorcana • {allGamesAsc.length} matchs enregistrés</p>
                            </div>

                            {/* Bouton Dreamborn.ink (s'affiche uniquement si renseigné) */}
                            {player.dreambornUrl && (
                                <a
                                    href={player.dreambornUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-all text-sm font-medium text-slate-300"
                                >
                                    <span>📓 Voir les Decks sur Dreamborn</span>
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">📈 Évolution du MMR</h2>
                        <MmrChart data={chartData} queues={playerQueues} />
                    </div>
                </section>

                {/* PARTIE BASSE : CONTRÔLLEUR & ONGLETS */}
                <PlayerViewController
                    queues={playerQueues}
                    currentQueue={currentQueue}
                    currentTab={currentTab}
                    playerName={player.name}
                />

                {/* Contenu dynamique (Historique paginé ou Stats globales) */}
                <section className="transition-all">
                    {tabContent}
                </section>

            </main>
        </div>
    );
}