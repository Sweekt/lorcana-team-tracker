"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import ColorDots from "@/components/ColorDots";
import { getDeckDetails } from "@/actions/cards";

interface EnrichedCard {
    cardId: string;
    count: number;
    name: string;
    imageUrl: string;
    type: string;
    cost: number;
}

interface DecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    playerName: string;
    decklist: string | null;
    deckColors?: string[];
}

export default function DecklistModal({
    isOpen,
    onClose,
    playerName,
    decklist,
    deckColors = [],
}: DecklistModalProps) {
    const parsedJson = useMemo(() => {
        if (!decklist) return null;
        try {
            const parsed = JSON.parse(decklist);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
                return parsed as { cardId: string; count: number }[];
            }
        } catch {
            return null;
        }
        return null;
    }, [decklist]);

    const [isLoading, setIsLoading] = useState(() => Boolean(parsedJson && parsedJson.length > 0));
    const [cards, setCards] = useState<EnrichedCard[]>([]);

    const rawText = !parsedJson && decklist ? decklist : "";

    useEffect(() => {
        if (!parsedJson || parsedJson.length === 0) return;

        let isCancelled = false;

        getDeckDetails(parsedJson)
            .then((details) => {
                if (!isCancelled) setCards(details);
            })
            .catch((err) => {
                console.error("[DecklistModal] Erreur chargement détails:", err);
            })
            .finally(() => {
                if (!isCancelled) setIsLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [parsedJson]);

    if (!isOpen) return null;

    const totalCardsCount = cards.length > 0
        ? cards.reduce((acc, c) => acc + c.count, 0)
        : rawText.split("\n").filter(Boolean).length;

    const copyToClipboard = () => {
        if (!decklist) return;
        let textToCopy = decklist;

        if (cards.length > 0) {
            textToCopy = cards.map((c) => `${c.count} ${c.name}`).join("\n");
        }

        navigator.clipboard.writeText(textToCopy);
        toast.success("Decklist copiée dans le presse-papier !");
    };

    const colorString = deckColors && deckColors.length > 0 ? deckColors.join(" / ") : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60 shrink-0">
                    <div className="flex items-center gap-3">
                        {colorString && <ColorDots colors={colorString} />}
                        <div>
                            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <span>Decklist de {playerName}</span>
                                {totalCardsCount > 0 && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        {totalCardsCount} cartes
                                    </span>
                                )}
                            </h3>
                            {colorString && (
                                <p className="text-xs text-slate-400 mt-0.5">{colorString}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copier</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Contenu de la decklist */}
                <div className="p-6 overflow-y-auto grow bg-slate-950/30">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            <p className="text-sm text-slate-400 animate-pulse">
                                Chargement des détails des cartes Lorcana...
                            </p>
                        </div>
                    ) : cards.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {cards.map((card, idx) => (
                                <div
                                    key={idx}
                                    className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
                                >
                                    <div className="relative aspect-2.5/3.5 bg-slate-950 overflow-hidden">
                                        {card.imageUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={card.imageUrl}
                                                alt={card.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-slate-500 font-medium">
                                                {card.name}
                                            </div>
                                        )}
                                        {/* Badge quantité */}
                                        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-700/80 text-indigo-400 font-extrabold text-xs backdrop-blur-xs">
                                            x{card.count}
                                        </div>
                                        {/* Badge coût encre */}
                                        {card.cost !== undefined && card.cost !== null && (
                                            <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-slate-950/85 border border-amber-500/50 text-amber-400 font-black text-xs flex items-center justify-center backdrop-blur-xs">
                                                {card.cost}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5 flex flex-col gap-0.5">
                                        <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                                            {card.name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            {card.type}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : rawText ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {rawText}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                            <svg className="w-12 h-12 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="font-medium">Aucune decklist enregistrée pour ce joueur.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
