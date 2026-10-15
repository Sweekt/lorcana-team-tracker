import test from "node:test";
import assert from "node:assert/strict";
import {
    generatePkcePair,
    generateOAuthState,
    buildDuelsAuthorizeUrl,
    exchangeDuelsCode,
    resolveEffectiveToken,
} from "../duels-oauth";

test("generatePkcePair returns a 43-character base64url verifier and a matching SHA-256 challenge", () => {
    const pkce = generatePkcePair();
    assert.ok(pkce.verifier, "verifier should not be empty");
    assert.strictEqual(typeof pkce.verifier, "string");
    assert.ok(pkce.verifier.length >= 43 && pkce.verifier.length <= 128, "verifier length between 43 and 128");
    assert.ok(!pkce.verifier.includes("+") && !pkce.verifier.includes("/") && !pkce.verifier.includes("="), "verifier must be base64url");

    assert.ok(pkce.challenge, "challenge should not be empty");
    assert.strictEqual(typeof pkce.challenge, "string");
    assert.strictEqual(pkce.challenge.length, 43, "S256 base64url unpadded challenge is 43 chars");
    assert.ok(!pkce.challenge.includes("+") && !pkce.challenge.includes("/") && !pkce.challenge.includes("="), "challenge must be base64url");
});

test("generateOAuthState returns a secure random string of at least 32 characters", () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();
    assert.strictEqual(typeof state1, "string");
    assert.ok(state1.length >= 32, "state should be at least 32 chars");
    assert.notStrictEqual(state1, state2, "consecutive states should be unique");
});

test("buildDuelsAuthorizeUrl generates the exact Duels.ink OAuth authorization URL", () => {
    const urlString = buildDuelsAuthorizeUrl({
        clientId: "dapp_123456",
        redirectUri: "http://localhost:3000/api/oauth/duels/callback",
        state: "test_state_12345678",
        challenge: "test_challenge_abcdef",
        expiresInDays: 365,
    });

    const url = new URL(urlString);
    assert.strictEqual(url.origin, "https://duels.ink");
    assert.strictEqual(url.pathname, "/oauth/authorize");
    assert.strictEqual(url.searchParams.get("response_type"), "code");
    assert.strictEqual(url.searchParams.get("client_id"), "dapp_123456");
    assert.strictEqual(url.searchParams.get("redirect_uri"), "http://localhost:3000/api/oauth/duels/callback");
    assert.strictEqual(url.searchParams.get("scope"), "profile match_history:read");
    assert.strictEqual(url.searchParams.get("state"), "test_state_12345678");
    assert.strictEqual(url.searchParams.get("code_challenge"), "test_challenge_abcdef");
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256");
    assert.strictEqual(url.searchParams.get("expires_in_days"), "365");
});

test("resolveEffectiveToken gives priority to valid OAuth token", () => {
    const futureDate = new Date(Date.now() + 1000 * 3600);
    const result = resolveEffectiveToken({
        duelsAccessToken: "oauth_valid_token",
        duelsTokenExpiresAt: futureDate,
        lorcanaApiKey: "manual_fallback_key",
    });

    assert.deepStrictEqual(result, {
        token: "oauth_valid_token",
        isOAuth: true,
    });
});

test("resolveEffectiveToken falls back to manual lorcanaApiKey when OAuth token is expired", () => {
    const pastDate = new Date(Date.now() - 1000 * 3600);
    const result = resolveEffectiveToken({
        duelsAccessToken: "oauth_expired_token",
        duelsTokenExpiresAt: pastDate,
        lorcanaApiKey: "manual_fallback_key",
    });

    assert.deepStrictEqual(result, {
        token: "manual_fallback_key",
        isOAuth: false,
    });
});

test("resolveEffectiveToken returns null if neither OAuth nor API key is valid", () => {
    const pastDate = new Date(Date.now() - 1000 * 3600);
    const result = resolveEffectiveToken({
        duelsAccessToken: "oauth_expired_token",
        duelsTokenExpiresAt: pastDate,
        lorcanaApiKey: null,
    });

    assert.deepStrictEqual(result, {
        token: null,
        isOAuth: false,
    });
});

test("exchangeDuelsCode parses successful token response correctly", async () => {
    const mockFetch: typeof fetch = async (input, init) => {
        assert.strictEqual(input.toString(), "https://duels.ink/api/oauth/token");
        assert.strictEqual(init?.method, "POST");
        assert.strictEqual(init?.headers?.["Content-Type"], "application/x-www-form-urlencoded");

        return new Response(JSON.stringify({
            access_token: "9b2e1234567890",
            token_type: "Bearer",
            expires_in: 7776000,
            scope: "profile match_history:read",
            user: { id: "u_0190abc", name: "Ashe" }
        }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const result = await exchangeDuelsCode({
        code: "auth_code_123",
        verifier: "pkce_verifier_123",
        clientId: "dapp_123",
        clientSecret: "dsec_123",
        redirectUri: "http://localhost:3000/api/oauth/duels/callback",
        fetchFn: mockFetch,
    });

    assert.strictEqual(result.accessToken, "9b2e1234567890");
    assert.strictEqual(result.expiresIn, 7776000);
    assert.strictEqual(result.user.id, "u_0190abc");
    assert.strictEqual(result.user.name, "Ashe");
});

test("exchangeDuelsCode throws an error on invalid grant or client failure", async () => {
    const mockFetch: typeof fetch = async () => {
        return new Response(JSON.stringify({
            error: "invalid_grant",
            error_description: "The code is expired or invalid"
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    };

    await assert.rejects(
        async () => {
            await exchangeDuelsCode({
                code: "bad_code",
                verifier: "verifier",
                clientId: "dapp_123",
                clientSecret: "dsec_123",
                redirectUri: "http://localhost:3000/api/oauth/duels/callback",
                fetchFn: mockFetch,
            });
        },
        /invalid_grant/
    );
});
