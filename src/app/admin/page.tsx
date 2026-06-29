import prisma from "@/lib/prisma";
import { addPlayer, deletePlayer, toggleQueue, updatePlayerSettings } from "@/actions/admin";
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
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            <main className="max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-12">

                {/* EN-TÊTE */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
                            Dashboard Admin
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Gérez votre équipe et les paramètres globaux.</p>
                    </div>
                    <Link
                        href="/"
                        className="text-sm font-medium text-slate-300 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-800 hover:text-indigo-400 transition-all shadow-sm"
                    >
                        ← Retour au Classement
                    </Link>
                </header>

                {/* SECTION : JOUEURS */}
                <section className="bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-200">Membres de l'équipe</h2>
                        <p className="text-slate-400 text-sm">Ajoutez des joueurs ou modifiez leurs informations (photos, liens).</p>
                    </div>

                    {/* Formulaire d'ajout (Nouveau design sombre) */}
                    <form action={addPlayer} className="flex flex-col sm:flex-row gap-4 mb-8 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
                        <input
                            type="text"
                            name="name"
                            placeholder="Pseudo"
                            required
                            className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                        />
                        <input
                            type="password"
                            name="apiToken"
                            placeholder="Token API Duels.ink"
                            required
                            className="flex-[2] bg-slate-950 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                        />
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:bg-indigo-500 hover:-translate-y-0.5 transition-all whitespace-nowrap"
                        >
                            + Ajouter
                        </button>
                    </form>

                    {/* Liste des joueurs */}
                    <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/20">
                        <ul className="divide-y divide-slate-800/80">
                            {players.length === 0 ? (
                                <li className="p-8 text-center text-slate-500 italic">Aucun joueur pour le moment.</li>
                            ) : (
                                players.map(player => (
                                    <li key={player.id} className="p-5 hover:bg-slate-800/30 transition-colors group">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-4">
                                                {player.avatarUrl ? (
                                                    <img src={player.avatarUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-slate-600 shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold shadow-inner border border-slate-700">
                                                        {player.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-slate-200 text-lg">{player.name}</span>
                                            </div>

                                            {/* Suppression */}
                                            <form action={deletePlayer}>
                                                <input type="hidden" name="id" value={player.id} />
                                                <button
                                                    type="submit"
                                                    className="text-slate-500 hover:text-red-400 bg-transparent hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                                >
                                                    Retirer
                                                </button>
                                            </form>
                                        </div>

                                        {/* Formulaire d'édition (Photos et Dreamborn) */}
                                        <form action={updatePlayerSettings} className="flex flex-col sm:flex-row gap-3 sm:pl-14">
                                            <input type="hidden" name="id" value={player.id} />
                                            <input
                                                type="url"
                                                name="avatarUrl"
                                                defaultValue={player.avatarUrl || ""}
                                                placeholder="/avatars/pseudo.jpg ou URL web"
                                                className="flex-1 text-sm bg-slate-950 border border-slate-700 text-slate-300 px-3 py-2 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                                            />
                                            <input
                                                type="url"
                                                name="dreambornUrl"
                                                defaultValue={player.dreambornUrl || ""}
                                                placeholder="URL du profil Dreamborn.ink"
                                                className="flex-1 text-sm bg-slate-950 border border-slate-700 text-slate-300 px-3 py-2 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                                            />
                                            <button type="submit" className="text-sm bg-slate-800 border border-slate-700 text-indigo-400 px-4 py-2 rounded-md hover:bg-slate-700 hover:text-indigo-300 transition-colors">
                                                Sauvegarder
                                            </button>
                                        </form>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </section>

                {/* SECTION : QUEUES (FORMATS) */}
                <section className="bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-200">Formats de Jeu</h2>
                        <p className="text-slate-400 text-sm">Contrôlez les files d'attente visibles sur le classement public.</p>
                    </div>

                    <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/20">
                        <ul className="divide-y divide-slate-800/80">
                            {allQueues.length === 0 ? (
                                <li className="p-8 text-center text-slate-500 italic">Aucun format détecté. Lancez une synchronisation.</li>
                            ) : (
                                allQueues.map(queue => (
                                    <li key={queue.id} className="flex justify-between items-center p-4 hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {/* Indicateur visuel d'état */}
                                            <span className="relative flex h-3 w-3">
                        {queue.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>}
                                                <span className={`relative inline-flex rounded-full h-3 w-3 ${queue.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                      </span>

                                            <span className={`font-medium ${!queue.isActive ? 'text-slate-500' : 'text-slate-300'}`}>
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
                                                        ? 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
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