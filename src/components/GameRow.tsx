"use client";

import { useState } from "react";

// On type rapidement ce dont on a besoin
type GameRowProps = {
    game: {
        id: string;
        result: string;
        wentFirst: boolean | null;
        myDeckColors: string | null;
        oppDeckColors: string | null;
        oppDisplayName: string;
        replayUrl: string | null;
        yourDecklist: string | null;
        startedAt: Date;
        player: { name: string }; // On inclut le joueur pour l'historique global
    };
};

export default function GameRow({ game }: GameRowProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isWin = game.result === "win";

    // Parse sécurisé de la decklist
    let decklist: { cardId: string; count: number }[] = [];
    try {
        if (game.yourDecklist) {
            decklist = JSON.parse(game.yourDecklist);
        }
    } catch (e) {
        console.error("Erreur de parsing de la decklist");
    }

    return (
        <>
            <tr className="hover:bg-indigo-500/5 transition-colors group">
                {/* Résultat */}
                <td className="py-3 px-4">
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
        isWin ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
    }`}>
      {isWin ? "VICTOIRE" : "DÉFAITE"}
    </span>
                </td>
                <td className="py-3 px-4 font-medium text-slate-200">{game.player.name}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{game.wentFirst ? "Oui 🎲" : "Non"}</td>
                <td className="py-3 px-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-300">{game.myDeckColors || "Inconnu"}</span>
                        <span className="text-slate-500 text-xs">vs {game.oppDeckColors || "Inconnu"} ({game.oppDisplayName})</span>
                    </div>
                </td>
                <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                        {decklist.length > 0 && (
                            <button onClick={() => setIsModalOpen(true)} className="text-xs bg-slate-800 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                🃏 Deck
                            </button>
                        )}
                        {game.replayUrl ? (
                            <a href={game.replayUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm">
                                ▶️ Replay
                            </a>
                        ) : (
                            <span className="text-xs text-slate-500 px-3 py-1.5">Pas de replay</span>
                        )}
                    </div>
                </td>
            </tr>

            {/* Remplacer le Modal (isModalOpen) par cette version sombre : */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="font-bold text-slate-200">Deck de {game.player.name}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 text-xl font-bold px-2">&times;</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <ul className="space-y-2">
                                {decklist.map((card, idx) => (
                                    <li key={idx} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2 last:border-0">
                                        <span className="text-slate-400 font-mono">ID: {card.cardId}</span>
                                        <span className="font-bold text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded">x{card.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}