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
            <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                {/* Résultat */}
                <td className="py-3 px-4">
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
              isWin ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {isWin ? "VICTOIRE" : "DÉFAITE"}
          </span>
                </td>

                {/* Joueur de la team */}
                <td className="py-3 px-4 font-medium text-slate-800">
                    {game.player.name}
                </td>

                {/* Qui a commencé */}
                <td className="py-3 px-4 text-sm text-slate-600">
                    {game.wentFirst ? "Oui 🎲" : "Non"}
                </td>

                {/* Matchup (Couleurs) */}
                <td className="py-3 px-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-700">{game.myDeckColors || "Inconnu"}</span>
                        <span className="text-slate-400 text-xs">vs {game.oppDeckColors || "Inconnu"} ({game.oppDisplayName})</span>
                    </div>
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                        {decklist.length > 0 && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-xs bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition-colors border border-slate-200"
                            >
                                🃏 Deck
                            </button>
                        )}

                        {game.replayUrl ? (
                            <a
                                href={game.replayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-slate-800 text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                ▶️ Replay
                            </a>
                        ) : (
                            <span className="text-xs text-slate-400 px-3 py-1.5">Pas de replay</span>
                        )}
                    </div>
                </td>
            </tr>

            {/* MODAL POUR LE DECK */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Deck de {game.player.name}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <ul className="space-y-2">
                                {decklist.map((card, idx) => (
                                    <li key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                                        <span className="text-slate-600 font-mono">Carte ID: {card.cardId}</span>
                                        <span className="font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">x{card.count}</span>
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