import test from "node:test";
import assert from "node:assert/strict";
import { linkDuelsAccountToUser } from "../duels-oauth";

test("linkDuelsAccountToUser executes atomic transfer clearing old user and assigning to new user", async () => {
    const updateManyCalls: any[] = [];
    const updateCalls: any[] = [];

    const mockPrisma = {
        $transaction: async (queries: any[]) => {
            return Promise.all(queries);
        },
        user: {
            updateMany: async (args: any) => {
                updateManyCalls.push(args);
                return { count: 1 };
            },
            update: async (args: any) => {
                updateCalls.push(args);
                return { id: args.where.id, ...args.data };
            },
        },
    };

    const fixedNow = new Date("2026-10-15T12:00:00Z");

    const result = await linkDuelsAccountToUser({
        prismaClient: mockPrisma as any,
        currentUserId: "user_discord_2",
        duelsUser: { id: "u_duels_ashe", name: "Ashe" },
        tokenData: { accessToken: "token_abc_123", expiresIn: 3600 },
        now: fixedNow,
    });

    assert.strictEqual(updateManyCalls.length, 1, "updateMany called once for collision clearing");
    assert.deepStrictEqual(updateManyCalls[0], {
        where: {
            duelsUserId: "u_duels_ashe",
            NOT: { id: "user_discord_2" }
        },
        data: {
            duelsUserId: null,
            duelsUsername: null,
            duelsAccessToken: null,
            duelsTokenExpiresAt: null,
        }
    });

    assert.strictEqual(updateCalls.length, 1, "update called once for target user");
    assert.deepStrictEqual(updateCalls[0], {
        where: { id: "user_discord_2" },
        data: {
            duelsUserId: "u_duels_ashe",
            duelsUsername: "Ashe",
            duelsAccessToken: "token_abc_123",
            duelsTokenExpiresAt: new Date("2026-10-15T13:00:00Z"),
        }
    });

    assert.strictEqual(result.duelsUserId, "u_duels_ashe");
    assert.strictEqual(result.duelsUsername, "Ashe");
});

test("findUserForSession queries strictly by id when id is present", async () => {
    let queriedWhere: any = null;
    const mockPrisma = {
        user: {
            findUnique: async (args: any) => {
                queriedWhere = args.where;
                return { id: args.where.id };
            },
        },
    };

    const user = await (import("../duels-oauth") as any).then((m: any) =>
        m.findUserForSession(mockPrisma, { id: "user_target_id", email: null })
    );

    assert.deepStrictEqual(queriedWhere, { id: "user_target_id" });
    assert.strictEqual(user?.id, "user_target_id");
});

test("normalizeAppUrl removes trailing slashes", async () => {
    const { normalizeAppUrl } = await import("../duels-oauth") as any;
    assert.strictEqual(normalizeAppUrl("https://tracker.com/"), "https://tracker.com");
    assert.strictEqual(normalizeAppUrl("https://tracker.com///"), "https://tracker.com");
    assert.strictEqual(normalizeAppUrl("http://localhost:3000"), "http://localhost:3000");
});

