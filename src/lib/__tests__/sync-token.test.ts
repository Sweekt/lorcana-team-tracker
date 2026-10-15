import test from "node:test";
import assert from "node:assert/strict";
import { resolveEffectiveToken, handleSync401 } from "../duels-oauth";

test("resolveEffectiveToken selects OAuth token when active", () => {
    const future = new Date(Date.now() + 60000);
    const user = {
        duelsAccessToken: "oauth_valid",
        duelsTokenExpiresAt: future,
        lorcanaApiKey: "manual_key",
    };

    const res = resolveEffectiveToken(user);
    assert.strictEqual(res.token, "oauth_valid");
    assert.strictEqual(res.isOAuth, true);
});

test("resolveEffectiveToken falls back to lorcanaApiKey if OAuth is expired", () => {
    const past = new Date(Date.now() - 60000);
    const user = {
        duelsAccessToken: "oauth_expired",
        duelsTokenExpiresAt: past,
        lorcanaApiKey: "manual_key",
    };

    const res = resolveEffectiveToken(user);
    assert.strictEqual(res.token, "manual_key");
    assert.strictEqual(res.isOAuth, false);
});

test("handleSync401 marks OAuth token as expired in DB when isOAuth is true", async () => {
    let updateCalledWith: any = null;
    const mockPrisma = {
        user: {
            update: async (args: any) => {
                updateCalledWith = args;
                return args;
            },
        },
    };

    await handleSync401("user_123", true, mockPrisma as any);

    assert.ok(updateCalledWith, "prisma.user.update should have been called");
    assert.strictEqual(updateCalledWith.where.id, "user_123");
    assert.strictEqual(updateCalledWith.data.duelsTokenExpiresAt.getTime(), new Date(0).getTime());
});

test("handleSync401 does not touch duelsTokenExpiresAt when isOAuth is false", async () => {
    let updateCalledWith: any = null;
    const mockPrisma = {
        user: {
            update: async (args: any) => {
                updateCalledWith = args;
                return args;
            },
        },
    };

    await handleSync401("user_123", false, mockPrisma as any);
    assert.strictEqual(updateCalledWith, null, "prisma.user.update should not be called for manual API key");
});
