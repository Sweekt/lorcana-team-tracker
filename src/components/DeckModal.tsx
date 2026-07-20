import ColorDots from "@/components/ColorDots";
import MatchIcon from "@/assets/ic_duel.svg";
import StatIcon from "@/assets/ic_leaderboard.svg";
export default function DeckModal({ deck, onClose }: { deck: any, onClose: () => void }) {
    const renderCell = (wins: number, total: number) => {
        if (total === 0) return <span className="text-slate-600 font-medium">-</span>;
        const wr = (wins / total) * 100;
        return (
            <div className="flex flex-col items-center">
                <span className={`font-bold ${wr >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {wr.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5">({wins}/{total})</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>

            {/* Le conteneur principal de la modale */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* En-tête fixe */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <ColorDots colors={deck.color} />
                        <div>
                            <h2 className="text-2xl font-black text-slate-100">{deck.color}</h2>
                            <p className="text-slate-400 text-sm font-medium">{deck.total} parties analysées</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Contenu défilant */}
                <div className="p-6 overflow-y-auto grow bg-slate-950/30">

                    {/* Section Globale */}
                    <div className="mb-10">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <StatIcon className="w-4 h-4" /> Statistiques Globales
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Win Rate</span>
                                {renderCell(deck.wins, deck.total)}
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">En premier (Play)</span>
                                {renderCell(deck.otpWins, deck.otpTotal)}
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">En second (Draw)</span>
                                {renderCell(deck.otdWins, deck.otdTotal)}
                            </div>
                        </div>
                    </div>

                    {/* Section Matchups */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MatchIcon className="w-4 h-4" /> Matchups (Contre)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {deck.matchups.map((m: any, i: number) => (
                                <div key={i} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 hover:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800/60">
                                        <ColorDots colors={m.opponent} />
                                        <h4 className="font-bold text-slate-200 text-sm truncate">{m.opponent}</h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col items-center bg-slate-950/50 p-2 rounded-xl">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">WR</span>
                                            {renderCell(m.wins, m.total)}
                                        </div>
                                        <div className="flex flex-col items-center bg-slate-950/50 p-2 rounded-xl">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Play</span>
                                            {renderCell(m.otpWins, m.otpTotal)}
                                        </div>
                                        <div className="flex flex-col items-center bg-slate-950/50 p-2 rounded-xl">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Draw</span>
                                            {renderCell(m.otdWins, m.otdTotal)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}