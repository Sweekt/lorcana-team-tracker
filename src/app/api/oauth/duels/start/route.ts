import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { generatePkcePair, generateOAuthState, buildDuelsAuthorizeUrl, normalizeAppUrl } from "@/lib/duels-oauth";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const clientId = process.env.DUELS_CLIENT_ID;
    if (!clientId) {
        console.error("DUELS_CLIENT_ID is not configured in environment variables.");
        return NextResponse.redirect(new URL("/settings?duels_error=missing_config", request.url));
    }

    const appUrl = normalizeAppUrl(process.env.NEXTAUTH_URL || request.nextUrl.origin);
    const redirectUri = `${appUrl}/api/oauth/duels/callback`;

    const { verifier, challenge } = generatePkcePair();
    const state = generateOAuthState();

    const authorizeUrl = buildDuelsAuthorizeUrl({
        clientId,
        redirectUri,
        state,
        challenge,
        expiresInDays: 365,
    });

    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set("duels_oauth_state", JSON.stringify({ state, verifier }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
    });

    return response;
}
