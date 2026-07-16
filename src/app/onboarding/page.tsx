import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getCurrentTeamId } from "@/lib/current-team";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions);

    // 1. S'il n'est pas connecté, on le renvoie à l'accueil
    if (!session?.user?.id) {
        redirect("/");
    }

    // 2. LE VIDEUR EST LÀ : S'il a DÉJÀ une équipe, on l'empêche de voir cette page et on le renvoie au Dashboard
    const teamId = await getCurrentTeamId();
    if (teamId) {
        redirect("/");
    }

    // 3. S'il passe toutes les sécurités, on lui affiche le formulaire
    const firstName = session.user.name ? session.user.name.split(" ")[0] : "Joueur";

    return (
        <OnboardingForm
            userId={session.user.id}
            userName={firstName}
        />
    );
}