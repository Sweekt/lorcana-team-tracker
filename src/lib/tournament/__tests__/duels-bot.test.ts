import test from "node:test";
import assert from "node:assert/strict";
import {
    buildTableCreatePayload,
    createDuelsTableForMatch,
    checkDuelsTableStatus,
} from "../duels-bot";

test("buildTableCreatePayload reserves both seats for players and configures spectator bot", () => {
    const payload = buildTableCreatePayload({
        p1DuelsId: "u_alice",
        p2DuelsId: "u_bob",
        matchFormat: "bo3",
    });

    assert.strictEqual(payload.asSpectator, true);
    assert.deepStrictEqual(payload.players, ["u_alice", "u_bob"]);
    assert.strictEqual(payload.gameMode, "constructed");
    assert.strictEqual(payload.matchFormat, "bo3");
    assert.strictEqual(payload.visibility, "private");
    assert.strictEqual(payload.timerPreset, "standard");
});

test("buildTableCreatePayload formats player entries when decklists are provided", () => {
    const payloadWithP1Deck = buildTableCreatePayload({
        p1DuelsId: "u_alice",
        p2DuelsId: "u_bob",
        p1Deck: "4 Elsa\n4 Anna",
    });

    assert.deepStrictEqual(payloadWithP1Deck.players, [
        { player: "u_alice", deck: "4 Elsa\n4 Anna" },
        "u_bob",
    ]);

    const payloadWithBothDecks = buildTableCreatePayload({
        p1DuelsId: "u_alice",
        p2DuelsId: "u_bob",
        p1Deck: ["4 Elsa", "4 Anna"],
        p2Deck: "4 Robin Hood",
        matchFormat: "BO1",
        timerPreset: "blitz",
    });

    assert.deepStrictEqual(payloadWithBothDecks.players, [
        { player: "u_alice", deck: ["4 Elsa", "4 Anna"] },
        { player: "u_bob", deck: "4 Robin Hood" },
    ]);
    assert.strictEqual(payloadWithBothDecks.matchFormat, "bo1");
    assert.strictEqual(payloadWithBothDecks.timerPreset, "blitz");
});

test("createDuelsTableForMatch returns null with warning when DUELS_ORGANIZER_API_KEY is missing", async () => {
    const oldKey = process.env.DUELS_ORGANIZER_API_KEY;
    delete process.env.DUELS_ORGANIZER_API_KEY;

    try {
        const result = await createDuelsTableForMatch({
            p1DuelsId: "u_alice",
            p2DuelsId: "u_bob",
        });
        assert.strictEqual(result, null);
    } finally {
        if (oldKey !== undefined) {
            process.env.DUELS_ORGANIZER_API_KEY = oldKey;
        }
    }
});

test("createDuelsTableForMatch creates a table successfully and returns tableId and url", async () => {
    const oldKey = process.env.DUELS_ORGANIZER_API_KEY;
    const oldFetch = globalThis.fetch;
    process.env.DUELS_ORGANIZER_API_KEY = "test_bot_key_123";

    let interceptedUrl = "";
    let interceptedAuth = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        interceptedUrl = url.toString();
        interceptedAuth = (init?.headers as Record<string, string>)?.["Authorization"] || "";
        interceptedBody = JSON.parse(init?.body as string);

        return new Response(
            JSON.stringify({
                tableId: "table_abc_123",
                url: "https://duels.ink/table/table_abc_123",
                view: { status: "assembling" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }) as any;

    try {
        const result = await createDuelsTableForMatch({
            p1DuelsId: "u_alice",
            p2DuelsId: "u_bob",
            matchFormat: "bo3",
        });

        assert.deepStrictEqual(result, {
            tableId: "table_abc_123",
            url: "https://duels.ink/table/table_abc_123",
        });
        assert.strictEqual(interceptedUrl, "https://duels.ink/api/table/create");
        assert.strictEqual(interceptedAuth, "Bearer test_bot_key_123");
        assert.strictEqual(interceptedBody.asSpectator, true);
        assert.deepStrictEqual(interceptedBody.players, ["u_alice", "u_bob"]);
    } finally {
        globalThis.fetch = oldFetch;
        if (oldKey !== undefined) {
            process.env.DUELS_ORGANIZER_API_KEY = oldKey;
        } else {
            delete process.env.DUELS_ORGANIZER_API_KEY;
        }
    }
});

test("createDuelsTableForMatch returns null on API error without throwing", async () => {
    const oldKey = process.env.DUELS_ORGANIZER_API_KEY;
    const oldFetch = globalThis.fetch;
    process.env.DUELS_ORGANIZER_API_KEY = "test_bot_key_123";

    globalThis.fetch = (async () => {
        return new Response("Bad Request: invalid player", { status: 400 });
    }) as any;

    try {
        const result = await createDuelsTableForMatch({
            p1DuelsId: "u_alice",
            p2DuelsId: "u_bob",
        });
        assert.strictEqual(result, null);
    } finally {
        globalThis.fetch = oldFetch;
        if (oldKey !== undefined) {
            process.env.DUELS_ORGANIZER_API_KEY = oldKey;
        } else {
            delete process.env.DUELS_ORGANIZER_API_KEY;
        }
    }
});

test("createDuelsTableForMatch returns null on network exception without throwing", async () => {
    const oldKey = process.env.DUELS_ORGANIZER_API_KEY;
    const oldFetch = globalThis.fetch;
    process.env.DUELS_ORGANIZER_API_KEY = "test_bot_key_123";

    globalThis.fetch = (async () => {
        throw new Error("Network unreachable");
    }) as any;

    try {
        const result = await createDuelsTableForMatch({
            p1DuelsId: "u_alice",
            p2DuelsId: "u_bob",
        });
        assert.strictEqual(result, null);
    } finally {
        globalThis.fetch = oldFetch;
        if (oldKey !== undefined) {
            process.env.DUELS_ORGANIZER_API_KEY = oldKey;
        } else {
            delete process.env.DUELS_ORGANIZER_API_KEY;
        }
    }
});

test("checkDuelsTableStatus returns table status and completion info", async () => {
    const oldKey = process.env.DUELS_ORGANIZER_API_KEY;
    const oldFetch = globalThis.fetch;
    process.env.DUELS_ORGANIZER_API_KEY = "test_bot_key_123";

    let fetchedUrl = "";

    globalThis.fetch = (async (url: string | URL | Request) => {
        fetchedUrl = url.toString();
        return new Response(
            JSON.stringify({
                view: {
                    id: "table_abc_123",
                    status: "completed",
                    game: {
                        status: "finished",
                        winnerUserId: "u_bob",
                        victoryReason: "lore",
                    },
                },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }) as any;

    try {
        const status = await checkDuelsTableStatus("table_abc_123");
        assert.strictEqual(fetchedUrl, "https://duels.ink/api/table/table_abc_123/view");
        assert.deepStrictEqual(status, {
            status: "completed",
            finished: true,
            winnerDuelsId: "u_bob",
        });
    } finally {
        globalThis.fetch = oldFetch;
        if (oldKey !== undefined) {
            process.env.DUELS_ORGANIZER_API_KEY = oldKey;
        } else {
            delete process.env.DUELS_ORGANIZER_API_KEY;
        }
    }
});

test("checkDuelsTableStatus returns null on 404 or network failure", async () => {
    const oldFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response("Not Found", { status: 404 });
    }) as any;

    try {
        const status = await checkDuelsTableStatus("invalid_id");
        assert.strictEqual(status, null);
    } finally {
        globalThis.fetch = oldFetch;
    }
});
