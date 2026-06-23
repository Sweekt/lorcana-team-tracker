import prisma from "@/lib/prisma";
import { addPlayer, deletePlayer, toggleQueue } from "@/actions/admin";
import Link from "next/link";

export default async function AdminPage() {
    const players = await prisma.player.findMany();

    const distinctGames = await prisma.game.findMany({
        where: { queueId: { not: null } },
        distinct: ["queueId"],
        select: { queueId: true },
    });

    const queueConfigs = await prisma.queueConfig.findMany();
    const configMap = new Map(queueConfigs.map(c => [c.id, c.isActive]));

    const allQueues = distinctGames.map(g => ({
        id: g.queueId as string,
        isActive: configMap.has(g.queueId as string) ? configMap.get(g.queueId as string) : true
    }));

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <main className="max-w-4xl mx-auto p-8 space-y-8">

                {/* EN-TÊTE */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
                            Dashboard Admin
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Gérez votre équipe et les formats de tournoi.</p>
                    </div>
                    <Link
                        href="/"
                        className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
                    >
                        ← Retour au Classement
                    </Link>
                </header>

                {/* SECTION : JOUEURS */}
                <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Membres de l'équipe</h2>
                        <p className="text-slate-500 text-sm">Ajoutez de nouveaux joueurs pour suivre leurs statistiques.</p>
                    </div>

                    {/* Formulaire d'ajout */}
                    <form action={addPlayer} className="flex flex-col sm:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <input
                            type="text"
                            name="name"
                            placeholder="Pseudo"
                            required
                            className="flex-1 bg-white border border-slate-200 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                        <input
                            type="password"
                            name="apiToken"
                            placeholder="Token d'API Duels.ink"
                            required
                            className="flex-[2] bg-white border border-slate-200 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:bg-blue-700 hover:-translate-y-0.5 transition-all whitespace-nowrap"
                        >
                            + Ajouter
                        </button>
                    </form>

                    {/* Liste des joueurs */}
                    <div className="overflow-hidden border border-slate-100 rounded-xl">
                        <ul className="divide-y divide-slate-100">
                            {players.length === 0 ? (
                                <li className="p-8 text-center text-slate-500 italic">Aucun joueur pour le moment.</li>
                            ) : (
                                players.map(player => (
                                    <li key={player.id} className="flex justify-between items-center p-4 hover:bg-slate-50/80 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            {/* Faux Avatar généré avec la 1ère lettre */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-inner">
                                                {player.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-slate-700">{player.name}</span>
                                        </div>
                                        <form action={deletePlayer}>
                                            <input type="hidden" name="id" value={player.id} />
                                            <button
                                                type="submit"
                                                className="text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-transparent hover:border-red-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Supprimer ce joueur"
                                            >
                                                Retirer
                                            </button>
                                        </form>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </section>

                {/* SECTION : QUEUES (FORMATS) */}
                <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Formats de Jeu</h2>
                            <p className="text-slate-500 text-sm">Contrôlez les files d'attente visibles sur le classement public.</p>
                        </div>
                    </div>

                    <div className="overflow-hidden border border-slate-100 rounded-xl">
                        <ul className="divide-y divide-slate-100">
                            {allQueues.length === 0 ? (
                                <li className="p-8 text-center text-slate-500 italic">Aucun format détecté. Lancez une synchronisation.</li>
                            ) : (
                                allQueues.map(queue => (
                                    <li key={queue.id} className="flex justify-between items-center p-4 hover:bg-slate-50/80 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {/* Indicateur visuel d'état */}
                                            <span className="relative flex h-3 w-3">
                        {queue.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>}
                                                <span className={`relative inline-flex rounded-full h-3 w-3 ${queue.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      </span>

                                            <span className={`font-medium ${!queue.isActive ? 'text-slate-400' : 'text-slate-700'}`}>
                        {queue.id}
                      </span>
                                        </div>

                                        <form action={toggleQueue}>
                                            <input type="hidden" name="id" value={queue.id} />
                                            <input type="hidden" name="isActive" value={queue.isActive?.toString()} />
                                            <button
                                                type="submit"
                                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                                                    queue.isActive
                                                        ? 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                                        : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700 hover:shadow-md'
                                                }`}
                                            >
                                                {queue.isActive ? 'Désactiver' : 'Activer'}
                                            </button>
                                        </form>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </section>

            </main>
        </div>
    );
}