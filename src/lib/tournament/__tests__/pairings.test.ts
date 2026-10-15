// src/lib/tournament/__tests__/pairings.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { generateSwissRound } from "../swiss";
import { generateSingleEliminationRound } from "../single-elimination";
import { generateRoundRobinRounds } from "../round-robin";

test("generateSwissRound assigns Bye to lowest ranked active player without prior Bye when odd", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: false },
        { id: "p3", dropped: false },
    ];
    // Ronde 1 : p3 a déjà eu un Bye
    const pastMatches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 1, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p3", p2Id: null, p1Score: 2, p2Score: 0, winnerId: "p3", isBye: true },
    ];
    // En ronde 2 (3 joueurs actifs) : p3 ne peut PAS avoir de 2e Bye. Le Bye doit aller à p2 (dernier sans Bye).
    const r2Matches = generateSwissRound(participants, pastMatches, 2);
    const byeMatch = r2Matches.find(m => m.isBye);
    assert.ok(byeMatch);
    assert.strictEqual(byeMatch.p1Id, "p2");
    assert.strictEqual(byeMatch.p2Id, null);
    assert.strictEqual(byeMatch.roundNumber, 2);
});

test("generateSwissRound excludes dropped players from pairings and byes", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: true }, // dropped!
        { id: "p3", dropped: false },
        { id: "p4", dropped: false },
    ];
    // 3 active players: p1, p3, p4
    const r1Matches = generateSwissRound(participants, [], 1);
    assert.strictEqual(r1Matches.length, 2); // 1 match + 1 bye
    const playersInMatches = r1Matches.flatMap(m => [m.p1Id, m.p2Id]).filter(Boolean);
    assert.ok(!playersInMatches.includes("p2"));
});

test("generateSwissRound avoids rematches when possible", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: false },
        { id: "p3", dropped: false },
        { id: "p4", dropped: false },
    ];
    // Round 1: p1 beat p2, p3 beat p4
    const r1Matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p3", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p3", isBye: false },
    ];
    // In round 2: winners p1 (3pts) and p3 (3pts) should play; losers p2 (0pts) and p4 (0pts) should play.
    const r2Matches = generateSwissRound(participants, r1Matches, 2);
    assert.strictEqual(r2Matches.length, 2);

    const m1 = r2Matches.find(m => m.p1Id === "p1" || m.p2Id === "p1")!;
    const p1Opponent = m1.p1Id === "p1" ? m1.p2Id : m1.p1Id;
    assert.strictEqual(p1Opponent, "p3"); // p1 plays p3, avoiding rematch with p2

    const m2 = r2Matches.find(m => m.p1Id === "p2" || m.p2Id === "p2")!;
    const p2Opponent = m2.p1Id === "p2" ? m2.p2Id : m2.p1Id;
    assert.strictEqual(p2Opponent, "p4"); // p2 plays p4, avoiding rematch with p1
});

test("generateSwissRound falls back to minimal rematches when rematch-free pairing is impossible", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: false },
        { id: "p3", dropped: false },
        { id: "p4", dropped: false },
    ];
    // Everyone has already played everyone (3 rounds completed)
    const pastMatches = [
        // R1: p1-p2, p3-p4
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p3", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p3", isBye: false },
        // R2: p1-p3, p2-p4
        { roundNumber: 2, p1Id: "p1", p2Id: "p3", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 2, p1Id: "p2", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p2", isBye: false },
        // R3: p1-p4, p2-p3
        { roundNumber: 3, p1Id: "p1", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 3, p1Id: "p2", p2Id: "p3", p1Score: 2, p2Score: 0, winnerId: "p2", isBye: false },
    ];
    // Round 4: rematch is unavoidable. Should not crash and should produce 2 matches.
    const r4Matches = generateSwissRound(participants, pastMatches, 4);
    assert.strictEqual(r4Matches.length, 2);
    assert.strictEqual(r4Matches.filter(m => !m.isBye).length, 2);
});

test("generateSingleEliminationRound handles non-power-of-2 by assigning top seed Byes in round 1", () => {
    // 5 joueurs dans un arbre de 8 : 3 Byes au 1er tour pour les têtes de série 1, 2, 3
    const participants = [
        { id: "p1", seed: 1, dropped: false },
        { id: "p2", seed: 2, dropped: false },
        { id: "p3", seed: 3, dropped: false },
        { id: "p4", seed: 4, dropped: false },
        { id: "p5", seed: 5, dropped: false },
    ];
    const r1 = generateSingleEliminationRound(participants, 1, []);
    assert.strictEqual(r1.length, 4); // 4 tables pour un quart de finale
    const byes = r1.filter(m => m.isBye);
    assert.strictEqual(byes.length, 3);

    // Verify seeds 1, 2, 3 got the Byes
    const byePlayers = byes.map(m => m.p1Id).sort();
    assert.deepStrictEqual(byePlayers, ["p1", "p2", "p3"]);

    // The single active match should be seed 4 vs seed 5
    const activeMatch = r1.find(m => !m.isBye)!;
    assert.ok(activeMatch);
    const activeMatchPlayers = [activeMatch.p1Id, activeMatch.p2Id].sort();
    assert.deepStrictEqual(activeMatchPlayers, ["p4", "p5"]);
});

test("generateSingleEliminationRound pairs round 2+ winners according to bracket positions", () => {
    const participants = [
        { id: "p1", seed: 1, dropped: false },
        { id: "p2", seed: 2, dropped: false },
        { id: "p3", seed: 3, dropped: false },
        { id: "p4", seed: 4, dropped: false },
    ];
    // Bracket of 4:
    // R1: Table 1: p1 vs p4 (p1 wins)
    //     Table 2: p2 vs p3 (p2 wins)
    const r1Matches = [
        { tableNumber: 1, roundNumber: 1, p1Id: "p1", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { tableNumber: 2, roundNumber: 1, p1Id: "p2", p2Id: "p3", p1Score: 2, p2Score: 1, winnerId: "p2", isBye: false },
    ];

    // Round 2 (Final): Winner of Table 1 (p1) vs Winner of Table 2 (p2)
    const r2Matches = generateSingleEliminationRound(participants, 2, r1Matches);
    assert.strictEqual(r2Matches.length, 1);
    assert.strictEqual(r2Matches[0].tableNumber, 1);
    assert.strictEqual(r2Matches[0].roundNumber, 2);
    assert.strictEqual(r2Matches[0].isBye, false);
    assert.strictEqual(r2Matches[0].p1Id, "p1");
    assert.strictEqual(r2Matches[0].p2Id, "p2");
});

test("generateRoundRobinRounds plans exactly N-1 rounds for N players (even)", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: false },
        { id: "p3", dropped: false },
        { id: "p4", dropped: false },
    ];
    const allRounds = generateRoundRobinRounds(participants);
    assert.strictEqual(allRounds.length, 3);
    assert.strictEqual(allRounds[0].length, 2);
    assert.strictEqual(allRounds[1].length, 2);
    assert.strictEqual(allRounds[2].length, 2);

    // Verify all 6 pairs (p1-p2, p1-p3, p1-p4, p2-p3, p2-p4, p3-p4) appear exactly once
    const pairsSeen = new Set<string>();
    for (const round of allRounds) {
        for (const match of round) {
            assert.strictEqual(match.isBye, false);
            assert.ok(match.p1Id && match.p2Id);
            const key = [match.p1Id, match.p2Id].sort().join("-");
            assert.ok(!pairsSeen.has(key), `Duplicate matchup: ${key}`);
            pairsSeen.add(key);
        }
    }
    assert.strictEqual(pairsSeen.size, 6);
});

test("generateRoundRobinRounds plans exactly N rounds for N odd players with 1 Bye per round", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: false },
        { id: "p3", dropped: false },
    ];
    const allRounds = generateRoundRobinRounds(participants);
    assert.strictEqual(allRounds.length, 3);

    const byeRecipients = new Set<string>();
    for (const round of allRounds) {
        // 1 normal match and 1 Bye match per round
        assert.strictEqual(round.length, 2);
        const byeMatch = round.find(m => m.isBye);
        assert.ok(byeMatch);
        assert.strictEqual(byeMatch.p2Id, null);
        assert.ok(!byeRecipients.has(byeMatch.p1Id), `Player ${byeMatch.p1Id} got more than 1 Bye`);
        byeRecipients.add(byeMatch.p1Id);
    }
    // Each of the 3 players got exactly 1 Bye
    assert.strictEqual(byeRecipients.size, 3);
});
