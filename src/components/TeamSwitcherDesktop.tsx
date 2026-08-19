"use client";

import { useState, useRef, useEffect } from "react";

type Team = { id: string; name: string };

interface Props {
    teams: Team[];
    activeTeam: Team | undefined;
    handleTeamSwitch: (teamId: string) => void;
    isPending: boolean;
}

export default function TeamSwitcherDesktop({ teams, activeTeam, handleTeamSwitch, isPending }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (teams.length === 0) return null;

    const onSwitch = (teamId: string) => {
        handleTeamSwitch(teamId);
        setIsOpen(false);
    };

    return (
        <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 transition-colors text-sm font-medium ${isPending ? 'opacity-50 cursor-wait' : 'text-slate-200'}`}
            >
                <span className="truncate max-w-[120px]">{activeTeam?.name || "Sélectionner..."}</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                    {teams.map((team) => (
                        <button
                            key={team.id}
                            onClick={() => onSwitch(team.id)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                team.id === activeTeam?.id
                                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                            }`}
                        >
                            {team.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}