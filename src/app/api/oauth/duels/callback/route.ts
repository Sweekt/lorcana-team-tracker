import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { exchangeDuelsCode, linkDuelsAccountToUser, findUserForSession, normalizeAppUrl } from "@/lib/duels-oauth";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const appUrl = normalizeAppUrl(process.env.NEXTAUTH_URL || request.nextUrl.origin);
    const settingsUrl = new URL("/settings", appUrl);

    if (!session?.user?.email && !session?.user?.id) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const codeParam = searchParams.get("code");

    // Nettoyage systématique du cookie OAuth à la fin
    const clearCookie = (res: NextResponse) => {
        res.cookies.set("duels_oauth_state", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });
        return res;
    };

    // Gestion de l'annulation par l'utilisateur
    if (errorParam === "access_denied") {
        settingsUrl.searchParams.set("duels_cancelled", "true");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    if (errorParam) {
        settingsUrl.searchParams.set("duels_error", errorParam);
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    // Validation du state et verifier depuis le cookie
    const stateCookie = request.cookies.get("duels_oauth_state")?.value;
    if (!stateCookie) {
        settingsUrl.searchParams.set("duels_error", "missing_state_cookie");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    let parsedState: { state?: string; verifier?: string } = {};
    try {
        parsedState = JSON.parse(stateCookie);
    } catch {
        settingsUrl.searchParams.set("duels_error", "corrupted_state_cookie");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    if (!stateParam || stateParam !== parsedState.state || !parsedState.verifier) {
        settingsUrl.searchParams.set("duels_error", "invalid_state");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    if (!codeParam) {
        settingsUrl.searchParams.set("duels_error", "missing_code");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    const clientId = process.env.DUELS_CLIENT_ID;
    const clientSecret = process.env.DUELS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        settingsUrl.searchParams.set("duels_error", "missing_server_credentials");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }

    const redirectUri = `${appUrl}/api/oauth/duels/callback`;

    try {
        // Échange du code d'autorisation contre le token d'accès
        const tokenResult = await exchangeDuelsCode({
            code: codeParam,
            verifier: parsedState.verifier,
            clientId,
            clientSecret,
            redirectUri,
        });

        // Récupération de l'ID utilisateur en base de manière stricte
        const user = await findUserForSession(prisma, session.user);

        if (!user) {
            settingsUrl.searchParams.set("duels_error", "user_not_found");
            return clearCookie(NextResponse.redirect(settingsUrl));
        }

        // Transfert atomique du compte Duels.ink vers l'utilisateur actif
        await linkDuelsAccountToUser({
            prismaClient: prisma,
            currentUserId: user.id,
            duelsUser: tokenResult.user,
            tokenData: {
                accessToken: tokenResult.accessToken,
                expiresIn: tokenResult.expiresIn,
            },
        });

        settingsUrl.searchParams.set("duels_linked", "true");
        return clearCookie(NextResponse.redirect(settingsUrl));
    } catch (err) {
        console.error("Error during Duels.ink OAuth callback:", err);
        settingsUrl.searchParams.set("duels_error", "exchange_failed");
        return clearCookie(NextResponse.redirect(settingsUrl));
    }
}
