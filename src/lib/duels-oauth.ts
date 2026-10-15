import { createHash, randomBytes } from "node:crypto";

export const DUELS_BASE_URL = "https://duels.ink";

export interface PkcePair {
    verifier: string;
    challenge: string;
}

export interface DuelsTokenExchangeResult {
    accessToken: string;
    expiresIn: number;
    scope: string;
    user: {
        id: string;
        name: string;
    };
}

export interface UserTokenFields {
    duelsAccessToken?: string | null;
    duelsTokenExpiresAt?: Date | null;
    lorcanaApiKey?: string | null;
}

export interface EffectiveTokenResult {
    token: string | null;
    isOAuth: boolean;
}

/**
 * Génère une paire PKCE (code_verifier et code_challenge SHA-256 en base64url sans padding).
 */
export function generatePkcePair(): PkcePair {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
}

/**
 * Génère un identifiant aléatoire d'état OAuth (state) anti-CSRF.
 */
export function generateOAuthState(): string {
    return randomBytes(24).toString("base64url");
}

/**
 * Construit l'URL d'autorisation vers Duels.ink.
 */
export function buildDuelsAuthorizeUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
    challenge: string;
    expiresInDays?: number;
}): string {
    const url = new URL("/oauth/authorize", DUELS_BASE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", params.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", "profile match_history:read");
    url.searchParams.set("state", params.state);
    url.searchParams.set("code_challenge", params.challenge);
    url.searchParams.set("code_challenge_method", "S256");

    if (params.expiresInDays) {
        url.searchParams.set("expires_in_days", String(params.expiresInDays));
    }

    return url.toString();
}

/**
 * Échange le code d'autorisation contre un access token auprès de Duels.ink.
 */
export async function exchangeDuelsCode(params: {
    code: string;
    verifier: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    fetchFn?: typeof fetch;
}): Promise<DuelsTokenExchangeResult> {
    const fetchToUse = params.fetchFn ?? fetch;

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: params.redirectUri,
        code_verifier: params.verifier,
        client_id: params.clientId,
        client_secret: params.clientSecret,
    });

    const response = await fetchToUse(`${DUELS_BASE_URL}/api/oauth/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.error) {
        const error = data?.error || `HTTP ${response.status}`;
        const description = data?.error_description ? `: ${data.error_description}` : "";
        throw new Error(`Duels.ink token exchange failed (${error}${description})`);
    }

    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        scope: data.scope,
        user: {
            id: data.user.id,
            name: data.user.name,
        },
    };
}

/**
 * Détermine le token effectif à utiliser en priorité (OAuth valide > clé manuelle).
 */
export function resolveEffectiveToken(user: UserTokenFields, now: Date = new Date()): EffectiveTokenResult {
    const isOAuthValid = Boolean(
        user.duelsAccessToken &&
        (!user.duelsTokenExpiresAt || new Date(user.duelsTokenExpiresAt).getTime() > now.getTime())
    );

    if (isOAuthValid && user.duelsAccessToken) {
        return {
            token: user.duelsAccessToken,
            isOAuth: true,
        };
    }

    if (user.lorcanaApiKey && user.lorcanaApiKey.trim().length > 0) {
        return {
            token: user.lorcanaApiKey.trim(),
            isOAuth: false,
        };
    }

    return {
        token: null,
        isOAuth: false,
    };
}

/**
 * Associe atomiquement un compte Duels.ink à un utilisateur Prisma,
 * en libérant tout autre utilisateur qui possédait déjà cet identifiant Duels (transfert).
 */
export async function linkDuelsAccountToUser(params: {
    prismaClient: {
        $transaction: (queries: any[]) => Promise<any>;
        user: {
            updateMany: (args: any) => Promise<any>;
            update: (args: any) => Promise<any>;
        };
    };
    currentUserId: string;
    duelsUser: { id: string; name: string };
    tokenData: { accessToken: string; expiresIn: number };
    now?: Date;
}) {
    const now = params.now ?? new Date();
    const expiresAt = new Date(now.getTime() + params.tokenData.expiresIn * 1000);

    const [, updatedUser] = await params.prismaClient.$transaction([
        params.prismaClient.user.updateMany({
            where: {
                duelsUserId: params.duelsUser.id,
                NOT: { id: params.currentUserId },
            },
            data: {
                duelsUserId: null,
                duelsUsername: null,
                duelsAccessToken: null,
                duelsTokenExpiresAt: null,
            },
        }),
        params.prismaClient.user.update({
            where: { id: params.currentUserId },
            data: {
                duelsUserId: params.duelsUser.id,
                duelsUsername: params.duelsUser.name,
                duelsAccessToken: params.tokenData.accessToken,
                duelsTokenExpiresAt: expiresAt,
            },
        }),
    ]);

    return updatedUser;
}

/**
 * Gère une réponse HTTP 401 lors d'une synchronisation :
 * si le token utilisé était OAuth, il est marqué expiré (new Date(0)).
 */
export async function handleSync401(
    userId: string,
    isOAuth: boolean,
    prismaClient: {
        user: {
            update: (args: any) => Promise<any>;
        };
    }
): Promise<void> {
    if (!isOAuth) return;

    try {
        await prismaClient.user.update({
            where: { id: userId },
            data: {
                duelsTokenExpiresAt: new Date(0),
            },
        });
    } catch (err) {
        console.error(`Failed to mark OAuth token expired for user ${userId}:`, err);
    }
}

/**
 * Recherche l'utilisateur de manière stricte par ID ou email (sans clause OR vide).
 */
export async function findUserForSession(
    prismaClient: {
        user: {
            findUnique: (args: any) => Promise<any>;
        };
    },
    sessionUser: { id?: string | null; email?: string | null }
) {
    if (sessionUser.id) {
        return prismaClient.user.findUnique({
            where: { id: sessionUser.id },
            select: { id: true },
        });
    }

    if (sessionUser.email) {
        return prismaClient.user.findUnique({
            where: { email: sessionUser.email },
            select: { id: true },
        });
    }

    return null;
}

/**
 * Normalise l'URL de base de l'application en supprimant tout slash final éventuel.
 */
export function normalizeAppUrl(url: string): string {
    return url.replace(/\/+$/, "");
}
