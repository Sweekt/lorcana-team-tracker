"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
    const pathname = usePathname();

    // Liste de tes liens
    const navItems = [
        { name: "🏆 Leaderboard", path: "/" },
        { name: "👥 Roster", path: "/player" },
        { name: "⚙️ Administration", path: "/admin" },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

                {/* Logo / Titre abrégé */}
                <div className="flex items-center">
                    <Link href="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 hover:opacity-80 transition-opacity">
                        Lorcana Tracker
                    </Link>
                </div>

                {/* Liens de navigation */}
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                    {navItems.map((item) => {
                        // Vérifie si le lien est actif (Gère aussi les sous-pages comme /player/sweek)
                        const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                    isActive
                                        ? "bg-indigo-500/10 text-indigo-400"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

            </div>
        </nav>
    );
}