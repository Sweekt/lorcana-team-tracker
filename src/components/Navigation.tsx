"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LeaderboardIcon from "@/assets/ic_leaderboard.svg"
import RosterIcon from "@/assets/ic_roster.svg"
import AdminIcon from "@/assets/ic_admin.svg"
import { signIn, signOut, useSession } from "next-auth/react";

export default function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const navItems = [
        { name: "Leaderboard", icon: <LeaderboardIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/" },
        { name: "Roster", icon: <RosterIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/player" },
        { name: "Administration", icon: <AdminIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/admin" },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

                {/* Logo / Titre abrégé */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 hover:opacity-80 transition-opacity">
                        <span className="sm:hidden">Lorcana</span>
                        <span className="hidden sm:inline">Lorcana Tracker</span>
                    </Link>

                    {/* Zone de test d'authentification */}
                    {session ? (
                        <div className="flex items-center gap-2">
                            <img src={session.user?.image || ""} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                            <button onClick={() => signOut()} className="text-xs text-red-400 hover:underline">Déconnexion</button>
                        </div>
                    ) : (
                        <button onClick={() => signIn("discord")} className="text-xs bg-[#5865F2] text-white px-3 py-1.5 rounded hover:bg-[#4752C4] transition-colors">
                            Connexion Discord
                        </button>
                    )}
                </div>

                {/* Liens de navigation */}
                <div className="flex items-center gap-2 sm:gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                // On ajoute un peu plus de padding sur mobile (p-3) pour que la zone de clic soit confortable
                                className={`flex items-center justify-center gap-2 p-3 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                    isActive
                                        ? "bg-indigo-500/10 text-indigo-400"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                }`}
                                title={item.name} // Pratique au survol si le texte est caché
                            >
                                {item.icon}
                                {/* C'est ici que la magie opère : caché sur mobile, affiché à partir de l'écran "sm" */}
                                <span className="hidden sm:inline">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

            </div>
        </nav>
    );
}