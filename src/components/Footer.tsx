import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Crédits et Branding */}
                <div className="flex flex-col items-center md:items-start gap-1.5 text-center md:text-left">
                    <div className="text-slate-400 text-sm flex items-center gap-1.5 flex-wrap justify-center">
                        <span>Créé par</span>
                        <a
                            href="https://sweek.ovh"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors inline-flex items-center gap-1 hover:underline"
                        >
                            Sweek
                        </a>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-medium">Team Wardens</span>
                    </div>
                    <p className="text-slate-600 text-xs max-w-md">
                        LoreTracker n'est pas affilié à Disney ou Ravensburger. Disney Lorcana est une marque déposée de Disney et Ravensburger.
                    </p>
                </div>

                {/* Liens sociaux et mentions légales */}
                <div className="flex items-center gap-4 flex-wrap justify-center">
                    {/* Réseaux sociaux */}
                    <div className="flex items-center gap-2">
                        {/* GitHub */}
                        <a
                            href="https://github.com/Sweekt"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Profil GitHub de Sweek"
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all shadow-sm"
                            title="GitHub"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                        </a>

                        {/* X (Twitter) */}
                        <a
                            href="https://x.com/BenSweek"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Profil X (Twitter) de Sweek"
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all shadow-sm"
                            title="X (Twitter)"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>

                        {/* Site web sweek.ovh */}
                        <a
                            href="https://sweek.ovh"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Site personnel de Sweek"
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-slate-800 transition-all shadow-sm"
                            title="Site web (sweek.ovh)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </a>

                        {/* Ko-fi */}
                        <a
                            href="https://ko-fi.com/sweek"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Soutenir le serveur sur Ko-fi"
                            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-slate-800 transition-all shadow-sm inline-flex items-center gap-1.5 text-xs font-medium leading-4"
                            title="Participer aux frais du serveur sur Ko-fi"
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>Soutenir le serveur</span>
                        </a>
                    </div>

                    <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

                    {/* Mentions Légales */}
                    <Link
                        href="/mentions-legales"
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        Mentions Légales
                    </Link>
                </div>

            </div>
        </footer>
    );
}