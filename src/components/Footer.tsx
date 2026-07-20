import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t border-slate-800/60 bg-slate-950/50 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="text-slate-500 text-sm flex items-center gap-2">
                    by
                    <a
                        href="https://github.com/Sweekt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                    >
                        Sweek
                    </a>
                    - Team Wardens
                </div>

                <div className="flex gap-4 text-sm text-slate-500">
                    <Link href="/mentions-legales" className="hover:text-slate-300 transition-colors">Mentions Légales</Link>
                </div>
            </div>
        </footer>
    );
}