export default function ColorDots({ colors }: { colors: string | null }) {
    if (!colors) return <span className="text-slate-500 text-xs font-medium">?</span>;

    const colorList = colors.split(/[\/\s,]+/).filter(Boolean);

    const getColorClass = (c: string) => {
        const lower = c.toLowerCase();
        if (lower.includes("amber") || lower.includes("ambre")) return "bg-amber-400 shadow-amber-400/30";
        if (lower.includes("amethyst") || lower.includes("amethyste") || lower.includes("améthyste")) return "bg-purple-500 shadow-purple-500/30";
        if (lower.includes("emerald") || lower.includes("emeraude") || lower.includes("émeraude")) return "bg-emerald-500 shadow-emerald-500/30";
        if (lower.includes("ruby") || lower.includes("rubis")) return "bg-rose-600 shadow-rose-600/30";
        if (lower.includes("sapphire") || lower.includes("saphir")) return "bg-sky-500 shadow-sky-500/30";
        if (lower.includes("steel") || lower.includes("acier")) return "bg-slate-400 shadow-slate-400/30";
        return "bg-slate-600 shadow-slate-600/30";
    };

    return (
        <div className="flex -space-x-1.5 items-center">
            {colorList.map((c, i) => (
                <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 border-slate-900 shadow-sm ring-1 ring-white/10 ${getColorClass(c)}`}
                    title={c}
                />
            ))}
        </div>
    );
}