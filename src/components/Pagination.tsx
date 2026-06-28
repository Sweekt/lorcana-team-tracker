"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function Pagination({
                                       currentPage,
                                       totalPages
                                   }: {
    currentPage: number;
    totalPages: number;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    if (totalPages <= 1) return null;

    const changePage = (newPage: number) => {
        // On clone les paramètres actuels (pour garder la queue et l'onglet)
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());

        // scroll: false permet d'éviter que la page remonte tout en haut à chaque clic
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex items-center justify-center gap-4 mt-6">
            <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                ← Précédent
            </button>

            <span className="text-sm font-medium text-slate-400">
        Page <span className="text-indigo-400">{currentPage}</span> sur {totalPages}
      </span>

            <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Suivant →
            </button>
        </div>
    );
}