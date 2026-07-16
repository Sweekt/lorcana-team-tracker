"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getDeckDetails } from "@/actions/cards";
import ColorDots from "@/components/ColorDots";
import Link from "next/link";
import {toast} from "sonner";

// Types
type GameRowProps = {
    game: {
        id: string; result: string; wentFirst: boolean | null;
        myDeckColors: string | null; oppDeckColors: string | null;
        oppDisplayName: string; replayUrl: string | null;
        yourDecklist: string | null; startedAt: Date;
        player: { name: string };
    };
};

export default function GameRow({ game }: GameRowProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [deckDetails, setDeckDetails] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const isWin = game.result === "win";

    const formattedDate = new Date(game.startedAt).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).replace(':', 'h');

    let decklist: { cardId: string; count: number }[] = [];
    try { if (game.yourDecklist) decklist = JSON.parse(game.yourDecklist); }
    catch (e) {}

    useEffect(() => setMounted(true), []);

    const handleOpenDeck = async () => {
        setIsModalOpen(true);
        if (deckDetails.length === 0) {
            setIsLoading(true);
            const details = await getDeckDetails(decklist);
            setDeckDetails(details);
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        const text = deckDetails.map(c => `${c.count}x ${c.name}`).join("\n");
        navigator.clipboard.writeText(text);

        toast.success("Decklist copiée dans le presse-papier !");
    };

    return (
        <>
            <tr className="hover:bg-slate-800/30 transition-colors group">

                {/* Résultat */}
                <td className="py-3 px-4">
          <span
              className={`px-2.5 py-1 rounded-md text-xs font-bold border ${isWin ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
            {isWin ? "VICTOIRE" : "DÉFAITE"}
          </span>
                </td>

                {/* OTP / OTD */}
                <td className="py-3 px-4 text-center">
                    <span
                        className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold border ${
                            game.wentFirst
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                : "bg-slate-800 text-slate-500 border-slate-700"
                        }`}>
                        {game.wentFirst ? "OTP" : "OTD"}
                    </span>
                </td>

                {/* Date */}
                <td className="py-3 px-4 text-sm text-slate-400 font-mono">
                    {formattedDate}
                </td>

                {/* Joueur */}
                <td className="py-3 px-4 font-medium">
                    <Link
                        href={`/player/${encodeURIComponent(game.user?.name)}`}
                        className={`text-slate-200 hover:text-indigo-400 hover:underline transition-colors`}
                    >
                        {game.user?.name}
                    </Link>
                </td>

                {/* Matchup (Pastilles) */}
                <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-3">
                        <ColorDots colors={game.myDeckColors}/>
                        <span className="text-slate-600 text-[10px] font-black uppercase">VS</span>
                        <ColorDots colors={game.oppDeckColors}/>
                    </div>
                </td>

                {/* Adversaire */}
                <td className="py-3 px-4 font-medium text-slate-200">
                    {game.oppDisplayName}
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                        {decklist.length > 0 && (
                            <button onClick={handleOpenDeck}
                                    className="text-xs bg-slate-800 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                🃏 Deck
                            </button>
                        )}
                        {game.replayUrl && (
                            <a href={game.replayUrl} target="_blank" rel="noopener noreferrer"
                               className="text-xs bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm">
                                ▶️ Replay
                            </a>
                        )}
                    </div>
                </td>
            </tr>

            {/* PORTAL DU MODAL (Inchangé) */}
            {mounted && isModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div
                        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">

                        <div
                            className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="font-bold text-slate-200">Deck de {game.player.name}</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={copyToClipboard}
                                    disabled={isLoading}
                                    className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                >
                                    📋 Copier le deck
                                </button>
                                <button onClick={() => setIsModalOpen(false)}
                                        className="text-slate-500 hover:text-slate-300 text-2xl font-bold leading-none">&times;</button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div
                                        className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-sm animate-pulse">Chargement des cartes...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {deckDetails.map((card, idx) => (
                                        <div key={idx} className="flex flex-col items-center group relative">
                                            <div
                                                className="relative w-full aspect-[2.5/3.5] bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-sm">
                                                {card.imageUrl ? (
                                                    <img src={card.imageUrl} alt={card.name}
                                                         className="object-cover w-full h-full"/>
                                                ) : (
                                                    <div
                                                        className="flex items-center justify-center h-full text-xs text-slate-500 p-2 text-center">{card.name}</div>
                                                )}
                                                <div
                                                    className="absolute top-1 right-1 bg-slate-950/80 border border-slate-700 text-indigo-400 font-bold text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
                                                    x{card.count}
                                                </div>
                                            </div>
                                            <span
                                                className="text-[10px] font-medium text-slate-400 mt-2 text-center line-clamp-1 group-hover:text-slate-200 transition-colors"
                                                title={card.name}>
                        {card.name}
                      </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
}