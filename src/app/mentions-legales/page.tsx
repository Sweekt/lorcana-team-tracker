export default function MentionsLegalesPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 py-8 px-4 sm:px-8">
            <main className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600 mb-8">
                    Mentions Légales
                </h1>

                <section className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">

                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-2">1. Éditeur du site</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Le site Lorcana Team Tracker est un projet personnel et gratuit, édité par Benjamin Roy (alias Sweek).<br />
                            Pour toute question ou demande, vous pouvez contacter l'éditeur via les réseaux sociaux ou la plateforme de code source du projet.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-2">2. Hébergement</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Ce site est hébergé sur un serveur virtuel privé (VPS) fourni par la société OVH SAS :<br />
                            <strong>OVH SAS</strong><br />
                            2 rue Kellermann, 59100 Roubaix, France<br />
                            Site web : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">www.ovhcloud.com</a>
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-2">3. Propriété intellectuelle & Disclaimer</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Lorcana Team Tracker est une application non officielle développée par un fan. <br />
                            Ce site n'est en aucun cas affilié, sponsorisé, approuvé ou associé à Disney ou Ravensburger.
                            Les termes "Disney", "Lorcana", ainsi que toutes les illustrations, logos et noms liés au jeu de cartes à collectionner Disney Lorcana sont la propriété intellectuelle exclusive de The Walt Disney Company et Ravensburger AG.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-2">4. Données personnelles & Authentification</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            La connexion au site s'effectue via l'API sécurisée de Discord (OAuth2).
                            Lorcana Team Tracker récupère et stocke uniquement les informations strictement nécessaires au fonctionnement de l'application (Identifiant Discord, pseudo et avatar).<br /><br />
                            Ces données ne sont en aucun cas revendues ou utilisées à des fins commerciales. En tant qu'utilisateur, vous disposez d'un droit d'accès, de modification et de suppression de vos données. Cette demande peut être effectuée en supprimant votre compte directement depuis les paramètres de l'application ou en contactant l'éditeur.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-slate-100 mb-2">5. Cookies</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Ce site n'utilise que des cookies techniques dits "de session", strictement nécessaires au maintien de votre connexion sécurisée (via la librairie NextAuth.js). Aucun cookie de pistage publicitaire n'est utilisé.
                        </p>
                    </div>

                </section>
            </main>
        </div>
    );
}