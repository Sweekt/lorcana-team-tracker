"use client";

import { useEffect, useState } from "react";
import { getCardImage } from "@/actions/cards";

export default function CardImage({ cardId }: { cardId: string }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        getCardImage(cardId).then(setUrl);
    }, [cardId]);

    return (
        <div className="relative w-16 h-24 bg-slate-800 rounded border border-slate-700 overflow-hidden shadow-sm">
            {url ? (
                <img src={url} alt={`Card ${cardId}`} className="object-cover w-full h-full" />
            ) : (
                <div className="flex items-center justify-center h-full text-[8px] text-slate-500 text-center">
                    Chargement...
                </div>
            )}
        </div>
    );
}