"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { NavItem } from "@/components/Navigation";

interface Props {
    navItems: NavItem[];
    pathname: string;
    session: any; // Type 'Session' de next-auth
}

export default function MenuDesktop({ navItems, pathname, session }: Props) {
    return (
        <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            }`}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="w-px h-6 bg-slate-800 mx-2"></div>

            <div className="flex items-center gap-3">
                {session.user?.image ? (
                    <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700 shadow-sm" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs border border-slate-700">
                        {session.user?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    title="Se déconnecter"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-xs font-medium">Déconnexion</span>
                </button>
            </div>
        </div>
    );
}