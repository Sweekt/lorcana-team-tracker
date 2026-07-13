export default function ColorDots({ colors }: { colors: string | null }) {
    if (!colors) return <span className="text-slate-500 text-xs font-medium">?</span>;

    const colorList = colors.split(/[\/\s,]+/).filter(Boolean);

    const getColorClass = (c: string) => {
        const lower = c.toLowerCase();
        if (lower.includes("amber") || lower.includes("ambre")) return "bg-amber-400";
        if (lower.includes("amethyst") || lower.includes("amethyste") || lower.includes("améthyste")) return "bg-purple-600";
        if (lower.includes("emerald") || lower.includes("emeraude") || lower.includes("émeraude")) return "bg-emerald-500";
        if (lower.includes("ruby") || lower.includes("rubis")) return "bg-red-600";
        if (lower.includes("sapphire") || lower.includes("saphir")) return "bg-blue-500";
        if (lower.includes("steel") || lower.includes("acier")) return "bg-slate-400";
        return "bg-slate-700";
    };

    return (
        <div className="flex -space-x-1.5">
            {colorList.map((c, i) => (
                <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 border-slate-900 shadow-sm ${getColorClass(c)}`}
                    title={c}
                />
            ))}
        </div>
    );
}