import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getCurrentTeamId } from "@/lib/current-team";

import HistoryTable from "@/components/HistoryTable";
import MmrChart from "@/components/MmrChart";
import PlayerViewController from "@/components/PlayerViewController";
import PlayerStatsView from "@/components/PlayerStatsView";
import Pagination from "@/components/Pagination";
import SyncButton from "@/components/SyncButton";
import StarIcon from "@/assets/ic_star.svg";
import GraphIcon from "@/assets/ic_graph.svg";

type Props = {
    params: Promise<{ name: string }>;
    searchParams: Promise<{ queue?: string; tab?: string; page?: string }>;
};

export default async function PlayerProfilePage(props: Props) {
    const session = await getServerSession(authOptions);
    const teamId = await getCurrentTeamId();

    if (!session?.user || !teamId) {
        redirect("/");
    }

    const params = await props.params;
    const searchParams = await props.searchParams;

    const playerName = decodeURIComponent(params.name);
    const currentQueue = searchParams.queue || "ALL";
    const currentTab = searchParams.tab || "history";

    const targetUser = await prisma.user.findFirst({
        where: {
            name: playerName,
            teams: { some: { teamId: teamId } }
        }
    });

    if (!targetUser) notFound();

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { activeQueues: true }
    });
    const teamQueues = new Set(team?.activeQueues || []);

    const rawQueues = await prisma.game.findMany({
        where: { userId: targetUser.id, queueId: { not: null } },
        distinct: ["queueId"],
        select: { queueId: true }
    });

    const playerQueues = rawQueues
        .map(q => q.queueId as string)
        .filter(queueId => teamQueues.has(queueId));

    const allGamesAsc = await prisma.game.findMany({
        where: {
            userId: targetUser.id,
            mmrAfter: { not: null },
            queueId: { in: playerQueues }
        },
        orderBy: { startedAt: "asc" },
        select: { startedAt: true, queueId: true, mmrAfter: true }
    });

    const chartData = allGamesAsc.map(g => ({
        date: new Date(g.startedAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' }),
        [g.queueId as string]: g.mmrAfter
    }));

    const whereClause: any = { userId: targetUser.id };
    if (currentQueue !== "ALL") {
        whereClause.queueId = currentQueue;
    } else if (playerQueues.length > 0) {
        whereClause.queueId = { in: playerQueues };
    }

    const PAGE_SIZE = 10;
    const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10));

    let tabContent;

    if (currentTab === "stats") {
        const allStatsGames = await prisma.game.findMany({
            where: whereClause,
            select: { result: true, wentFirst: true, myDeckColors: true, oppDeckColors: true }
        });
        tabContent = <PlayerStatsView games={allStatsGames} />;
    }
    else {
        const totalGamesCount = await prisma.game.count({ where: whereClause });
        const totalPages = Math.ceil(totalGamesCount / PAGE_SIZE) || 1;

        const historyGames = await prisma.game.findMany({
            where: whereClause,
            orderBy: { startedAt: "desc" },
            skip: (currentPage - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { user: { select: { name: true, image: true } } }
        });

        tabContent = (
            <div className="space-y-6">
                <HistoryTable games={historyGames}/>
                <Pagination currentPage={currentPage} totalPages={totalPages}/>
            </div>
        );
    }

    const displayName = targetUser.name ? targetUser.name.charAt(0).toUpperCase() + targetUser.name.slice(1) : "Joueur Inconnu";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-4">
            <main className="max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-8">
                <section className="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-800/80 pb-8">
                        {targetUser.image ? (
                            <img
                                src={targetUser.image}
                                alt={displayName}
                                className="w-24 h-24 rounded-2xl object-cover p-1 bg-linear-to-tr from-indigo-600 to-violet-500 shadow-lg shrink-0"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-500 p-1 shadow-lg shrink-0">
                                <div className="w-full h-full bg-slate-950 rounded-[0.85rem] flex items-center justify-center text-4xl font-black text-indigo-400">
                                    {displayName.charAt(0)}
                                </div>
                            </div>
                        )}

                        <div className="text-center sm:text-left space-y-3 my-auto w-full">
                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                <h1 className="text-3xl font-extrabold tracking-tight">{displayName}</h1>
                                <div className="flex ml-auto">
                                    <SyncButton targetUserId={targetUser.id} />
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mt-1">Profil Duels.ink • {allGamesAsc.length} matchs enregistrés</p>

                            {targetUser.dreambornUrl && (
                                <a
                                    href={targetUser.dreambornUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-all text-sm font-medium text-slate-300"
                                >
                                    <StarIcon className="w-4 h-4" />
                                    <span>Voir les Decks sur Dreamborn</span>
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="inline-flex items-center justify-center gap-2 mb-1">
                            <GraphIcon className="w-4 h-4 text-slate-400" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Évolution du MMR</h2>
                        </div>
                        <MmrChart data={chartData} queues={playerQueues} />
                    </div>
                </section>

                <PlayerViewController
                    queues={playerQueues}
                    currentQueue={currentQueue}
                    currentTab={currentTab}
                    playerName={targetUser.name || ""}
                />

                <section className="transition-all">
                    {tabContent}
                </section>

            </main>
        </div>
    );
}