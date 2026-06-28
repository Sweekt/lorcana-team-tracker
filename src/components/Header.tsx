import Link from "next/link";

export default function Header() {
    return (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
            <div>
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
                    Lorcana Team Tracker
                </h1>
                <p className="text-slate-400 text-sm mt-1">Suivez le classement et l'historique de l'équipe.</p>
            </div>
            <Link href="/admin" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">
                ⚙️ Administration
            </Link>
        </header>
    );
}