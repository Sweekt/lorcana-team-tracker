import test from "node:test";
import assert from "node:assert/strict";
import { computeTournamentStats, normalizeDeckColors } from "../stats";

test("computeTournamentStats aggregates winrates by ink combination and wentFirst rate", () => {
    const matches = [
        {
            p1DeckColors: ["ruby", "amethyst"],
            p2DeckColors: ["amber", "steel"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "p1",
            wentFirstWinner: true,
        },
        {
            p1DeckColors: ["ruby", "amethyst"],
            p2DeckColors: ["emerald", "steel"],
            p1Score: 0,
            p2Score: 2,
            winnerId: "p2",
            wentFirstWinner: false,
        },
    ];

    const stats = computeTournamentStats(matches);
    const rubyAmethyst = stats.inkCombos.find((c) => c.name === "Ruby / Amethyst")!;
    assert.ok(rubyAmethyst, "Ruby / Amethyst combo should exist");
    assert.strictEqual(rubyAmethyst.gamesPlayed, 5); // 3 manches + 2 manches
    assert.strictEqual(rubyAmethyst.matchesWon, 1);
    assert.strictEqual(rubyAmethyst.matchesPlayed, 2);
    assert.strictEqual(rubyAmethyst.matchWinrate, 50);
    assert.strictEqual(rubyAmethyst.gamesWon, 2);
    assert.strictEqual(rubyAmethyst.gameWinrate, 40);
    assert.deepStrictEqual(rubyAmethyst.inks, ["Ruby", "Amethyst"]);

    // wentFirst metrics
    assert.strictEqual(stats.wentFirst.totalGames, 2);
    assert.strictEqual(stats.wentFirst.firstPlayerWins, 1);
    assert.strictEqual(stats.wentFirst.firstPlayerWinrate, 50);
    assert.strictEqual(stats.wentFirst.secondPlayerWins, 1);
    assert.strictEqual(stats.wentFirst.secondPlayerWinrate, 50);
    assert.strictEqual(stats.wentFirstRate, 50);

    // Totals
    assert.strictEqual(stats.totalMatches, 2);
    assert.strictEqual(stats.totalGamesDecided, 5);
});

test("normalizeDeckColors normalizes ink combinations regardless of initial order", () => {
    const forward = normalizeDeckColors(["ruby", "amethyst"]);
    const reverse = normalizeDeckColors(["amethyst", "ruby"]);

    assert.ok(forward);
    assert.ok(reverse);
    assert.strictEqual(forward.name, "Ruby / Amethyst");
    assert.strictEqual(reverse.name, "Ruby / Amethyst");
    assert.deepStrictEqual(forward.inks, ["Ruby", "Amethyst"]);
    assert.deepStrictEqual(reverse.inks, ["Ruby", "Amethyst"]);

    // French names and case insensitivity
    const french = normalizeDeckColors(["rubis", "améthyste"]);
    assert.ok(french);
    assert.strictEqual(french.name, "Ruby / Amethyst");

    // Single color
    const mono = normalizeDeckColors(["steel"]);
    assert.ok(mono);
    assert.strictEqual(mono.name, "Steel");
    assert.deepStrictEqual(mono.inks, ["Steel"]);

    // Empty or invalid
    assert.strictEqual(normalizeDeckColors([]), null);
    assert.strictEqual(normalizeDeckColors(null), null);
    assert.strictEqual(normalizeDeckColors(undefined), null);
});

test("computeTournamentStats groups inverse order ink combinations under the same canonical name", () => {
    const matches = [
        {
            p1DeckColors: ["ruby", "amethyst"],
            p2DeckColors: ["steel", "amber"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p1",
            wentFirstWinner: true,
        },
        {
            p1DeckColors: ["amethyst", "ruby"],
            p2DeckColors: ["amber", "steel"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "p1",
            wentFirstWinner: true,
        },
    ];

    const stats = computeTournamentStats(matches);
    const rubyAmethyst = stats.inkCombos.find((c) => c.name === "Ruby / Amethyst")!;
    assert.ok(rubyAmethyst);
    assert.strictEqual(rubyAmethyst.matchesPlayed, 2);
    assert.strictEqual(rubyAmethyst.matchesWon, 2);
    assert.strictEqual(rubyAmethyst.matchWinrate, 100);

    const amberSteel = stats.inkCombos.find((c) => c.name === "Amber / Steel")!;
    assert.ok(amberSteel);
    assert.strictEqual(amberSteel.matchesPlayed, 2);
    assert.strictEqual(amberSteel.matchesWon, 0);
    assert.strictEqual(amberSteel.matchWinrate, 0);
});

test("computeTournamentStats sorts inkCombos by matchesPlayed DESC then matchWinrate DESC", () => {
    const matches = [
        // Deck A (Ruby / Sapphire): 2 matches played, 2 won (100%)
        {
            p1DeckColors: ["ruby", "sapphire"],
            p2DeckColors: ["amber", "amethyst"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p1",
        },
        {
            p1DeckColors: ["ruby", "sapphire"],
            p2DeckColors: ["amber", "amethyst"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p1",
        },
        // Deck B (Emerald / Steel): 3 matches played, 1 won (33%)
        {
            p1DeckColors: ["emerald", "steel"],
            p2DeckColors: ["amber", "amethyst"],
            p1Score: 0,
            p2Score: 2,
            winnerId: "p2",
        },
        {
            p1DeckColors: ["emerald", "steel"],
            p2DeckColors: ["amber", "amethyst"],
            p1Score: 0,
            p2Score: 2,
            winnerId: "p2",
        },
        {
            p1DeckColors: ["emerald", "steel"],
            p2DeckColors: ["amber", "ruby"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p1",
        },
    ];

    const stats = computeTournamentStats(matches);
    // Amber / Amethyst: 4 matches played (all lost except 2 won: 2-2 -> 50%)
    // Emerald / Steel: 3 matches played (1 won -> 33%)
    // Ruby / Sapphire: 2 matches played (2 won -> 100%)
    // Amber / Ruby: 1 match played (0 won -> 0%)

    assert.strictEqual(stats.inkCombos[0].name, "Amber / Amethyst");
    assert.strictEqual(stats.inkCombos[0].matchesPlayed, 4);

    assert.strictEqual(stats.inkCombos[1].name, "Emerald / Steel");
    assert.strictEqual(stats.inkCombos[1].matchesPlayed, 3);

    assert.strictEqual(stats.inkCombos[2].name, "Ruby / Sapphire");
    assert.strictEqual(stats.inkCombos[2].matchesPlayed, 2);
    assert.strictEqual(stats.inkCombos[2].matchWinrate, 100);
});

test("computeTournamentStats handles mirror matches accurately", () => {
    const matches = [
        {
            p1DeckColors: ["ruby", "amethyst"],
            p2DeckColors: ["ruby", "amethyst"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "p1",
            wentFirstWinner: true,
        },
    ];

    const stats = computeTournamentStats(matches);
    const rubyAmethyst = stats.inkCombos.find((c) => c.name === "Ruby / Amethyst")!;
    assert.ok(rubyAmethyst);
    assert.strictEqual(rubyAmethyst.matchesPlayed, 2); // 2 pilots
    assert.strictEqual(rubyAmethyst.matchesWon, 1);
    assert.strictEqual(rubyAmethyst.matchWinrate, 50);
    assert.strictEqual(rubyAmethyst.gamesPlayed, 6); // 3 games per player
    assert.strictEqual(rubyAmethyst.gamesWon, 3); // 2 + 1
    assert.strictEqual(rubyAmethyst.gameWinrate, 50);
    assert.strictEqual(stats.totalMatches, 1);
    assert.strictEqual(stats.totalGamesDecided, 3);
});

test("computeTournamentStats handles empty list and missing deck colors gracefully (no NaN)", () => {
    const emptyStats = computeTournamentStats([]);
    assert.deepStrictEqual(emptyStats, {
        inkCombos: [],
        wentFirst: {
            totalGames: 0,
            firstPlayerWins: 0,
            firstPlayerWinrate: 0,
            secondPlayerWins: 0,
            secondPlayerWinrate: 0,
        },
        wentFirstRate: 0,
        totalMatches: 0,
        totalGamesDecided: 0,
    });

    // Matches with undefined/missing deck colors
    const partialMatches = [
        {
            p1Score: 2,
            p2Score: 0,
            winnerId: "p1",
        },
        {
            p1DeckColors: ["ruby", "amethyst"],
            // p2DeckColors missing
            p1Score: 2,
            p2Score: 1,
            winnerId: "p1",
            wentFirstWinner: null,
        },
    ];

    const stats = computeTournamentStats(partialMatches);
    assert.strictEqual(stats.inkCombos.length, 1);
    assert.strictEqual(stats.inkCombos[0].name, "Ruby / Amethyst");
    assert.strictEqual(stats.inkCombos[0].matchesPlayed, 1);
    assert.strictEqual(stats.inkCombos[0].matchesWon, 1);
    assert.strictEqual(stats.inkCombos[0].matchWinrate, 100);
    assert.strictEqual(stats.totalMatches, 2);
    assert.strictEqual(stats.totalGamesDecided, 5);
    assert.strictEqual(stats.wentFirst.totalGames, 0);
    assert.strictEqual(stats.wentFirst.firstPlayerWinrate, 0);
    assert.strictEqual(stats.wentFirstRate, 0);
});

test("computeTournamentStats supports player UUIDs and score fallbacks", () => {
    const matches = [
        {
            p1Id: "player-alpha",
            p2Id: "player-beta",
            p1DeckColors: ["sapphire", "steel"],
            p2DeckColors: ["amber", "steel"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "player-alpha",
            wentFirstWinner: false,
        },
        // Match without winnerId, score fallback
        {
            p1Id: "player-alpha",
            p2Id: "player-gamma",
            p1DeckColors: ["sapphire", "steel"],
            p2DeckColors: ["emerald", "steel"],
            p1Score: 1,
            p2Score: 2,
            winnerId: null,
            wentFirstWinner: true,
        },
    ];

    const stats = computeTournamentStats(matches);
    const saphSteel = stats.inkCombos.find((c) => c.name === "Sapphire / Steel")!;
    assert.ok(saphSteel);
    assert.strictEqual(saphSteel.matchesPlayed, 2);
    assert.strictEqual(saphSteel.matchesWon, 1);
    assert.strictEqual(saphSteel.matchWinrate, 50);

    assert.strictEqual(stats.wentFirst.totalGames, 2);
    assert.strictEqual(stats.wentFirst.firstPlayerWins, 1);
    assert.strictEqual(stats.wentFirst.secondPlayerWins, 1);
    assert.strictEqual(stats.wentFirst.firstPlayerWinrate, 50);
});
