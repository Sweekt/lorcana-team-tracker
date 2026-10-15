import test from "node:test";
import assert from "node:assert/strict";
import { computeStandings } from "../standings";

test("computeStandings awards 3 points per win and ranks by points then OMWP", () => {
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
        { id: "p3", name: "Charlie", dropped: false },
        { id: "p4", name: "David", dropped: false },
    ];
    // R1: Alice bat Bob (2-0), Charlie bat David (2-1)
    // R2: Alice bat Charlie (2-1), Bob bat David (2-0)
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p3", p2Id: "p4", p1Score: 2, p2Score: 1, winnerId: "p3", isBye: false },
        { roundNumber: 2, p1Id: "p1", p2Id: "p3", p1Score: 2, p2Score: 1, winnerId: "p1", isBye: false },
        { roundNumber: 2, p1Id: "p2", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p2", isBye: false },
    ];

    const standings = computeStandings(participants, matches);

    assert.strictEqual(standings[0].participantId, "p1");
    assert.strictEqual(standings[0].matchPoints, 6);
    assert.strictEqual(standings[0].wins, 2);

    // Bob et Charlie ont 3 points chacun (1V-1D). Bob a affronté Alice (2V) et David (0V). Charlie a affronté David (0V) et Alice (2V).
    assert.strictEqual(standings[1].matchPoints, 3);
    assert.strictEqual(standings[2].matchPoints, 3);
    assert.strictEqual(standings[3].participantId, "p4");
    assert.strictEqual(standings[3].matchPoints, 0);
});

test("computeStandings handles Byes correctly with 3 points and 2-0 game score", () => {
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
        { id: "p3", name: "Charlie", dropped: false },
    ];
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p3", p2Id: null, p1Score: 2, p2Score: 0, winnerId: "p3", isBye: true },
    ];

    const standings = computeStandings(participants, matches);
    const charlie = standings.find(s => s.participantId === "p3")!;
    assert.strictEqual(charlie.matchPoints, 3);
    assert.strictEqual(charlie.gameWins, 2);
    assert.strictEqual(charlie.gameLosses, 0);
});

test("computeStandings breaks ties with OMWP", () => {
    // 4 players: Alice (2-0), Bob (1-1), Charlie (1-1), David (0-2)
    // Bob faced Alice (2-0) -> opponent is strong
    // Charlie faced David (0-2) -> opponent is weak
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
        { id: "p3", name: "Charlie", dropped: false },
        { id: "p4", name: "David", dropped: false },
    ];
    // R1: Alice bat Bob (2-0), Charlie bat David (2-0)
    // R2: Alice bat Charlie (2-0), Bob bat David (2-0)
    // Alice played Bob (1-1 -> MWP 0.5) and Charlie (1-1 -> MWP 0.5)
    // David played Charlie (1-1 -> MWP 0.5) and Bob (1-1 -> MWP 0.5)
    // Wait, let's create an asymmetry between Bob and Charlie's opponents:
    // Let's add extra players so Bob's opponents have higher MWP than Charlie's opponents
    const p = [
        { id: "p1", name: "P1", dropped: false },
        { id: "p2", name: "P2", dropped: false },
        { id: "p3", name: "P3", dropped: false },
        { id: "p4", name: "P4", dropped: false },
        { id: "p5", name: "P5", dropped: false },
        { id: "p6", name: "P6", dropped: false },
    ];
    // P1 and P2 both have 3 points (1-0).
    // P1 defeated P3 (who is 1-1, 3 pts)
    // P2 defeated P4 (who is 0-2, 0 pts -> MWP floored at 0.33)
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p3", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p2", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p2", isBye: false },
        { roundNumber: 1, p1Id: "p5", p2Id: "p6", p1Score: 2, p2Score: 0, winnerId: "p5", isBye: false },
        { roundNumber: 2, p1Id: "p3", p2Id: "p5", p1Score: 2, p2Score: 0, winnerId: "p3", isBye: false }, // P3 is now 1-1 (MWP 0.5)
        { roundNumber: 2, p1Id: "p6", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p6", isBye: false }, // P4 is now 0-2 (MWP 0.33 floor)
    ];

    const standings = computeStandings(p, matches);
    // P1 and P2 both have 3 points from 1 match.
    // P1's opponent is P3 (MWP = 0.5). P1's OMWP = 0.5.
    // P2's opponent is P4 (MWP = 0.33). P2's OMWP = 0.33.
    // Therefore P1 must rank ahead of P2!
    const p1Row = standings.find(s => s.participantId === "p1")!;
    const p2Row = standings.find(s => s.participantId === "p2")!;
    assert.strictEqual(p1Row.matchPoints, 3);
    assert.strictEqual(p2Row.matchPoints, 3);
    assert.ok(p1Row.omwp > p2Row.omwp);
    assert.ok(p1Row.rank < p2Row.rank);
});

test("computeStandings breaks ties with PGWP when matchPoints and OMWP are equal", () => {
    // Both players have identical opponents with identical records,
    // but P1 won 2-0 and P2 won 2-1
    const participants = [
        { id: "p1", name: "P1", dropped: false },
        { id: "p2", name: "P2", dropped: false },
        { id: "p3", name: "P3", dropped: false },
        { id: "p4", name: "P4", dropped: false },
    ];
    // R1: P1 bat P3 (2-0), P2 bat P4 (2-1)
    // P3 and P4 have identical records (0-1, MWP = 0.33 floor)
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p3", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p2", p2Id: "p4", p1Score: 2, p2Score: 1, winnerId: "p2", isBye: false },
    ];

    const standings = computeStandings(participants, matches);
    const p1Row = standings.find(s => s.participantId === "p1")!;
    const p2Row = standings.find(s => s.participantId === "p2")!;

    assert.strictEqual(p1Row.matchPoints, 3);
    assert.strictEqual(p2Row.matchPoints, 3);
    assert.strictEqual(p1Row.omwp, p2Row.omwp);
    // P1 PGWP = 2/2 = 1.0; P2 PGWP = 2/3 = 0.6667
    assert.ok(p1Row.pgwp > p2Row.pgwp);
    assert.ok(p1Row.rank < p2Row.rank);
});

test("computeStandings breaks ties with OGWP when matchPoints, OMWP, and PGWP are equal", () => {
    // P1 and P2 have identical points, identical OMWP, identical PGWP,
    // but P1's opponent won more games than P2's opponent
    const participants = [
        { id: "p1", name: "P1", dropped: false },
        { id: "p2", name: "P2", dropped: false },
        { id: "p3", name: "P3", dropped: false },
        { id: "p4", name: "P4", dropped: false },
        { id: "p5", name: "P5", dropped: false },
        { id: "p6", name: "P6", dropped: false },
    ];
    // P1 played P3; P2 played P4.
    // In R1: P1 bat P3 (2-0), P2 bat P4 (2-0) -> P1 and P2 both 3 pts, 2-0 games (PGWP 1.0)
    // In R2: P3 bat P5 (2-0); P4 bat P6 (2-1)
    // Both P3 and P4 are 1-1 (3 pts, MWP 0.5) -> P1 and P2 have identical OMWP (0.5)
    // But P3 game record: 2-2 (PGWP 0.5)
    // P4 game record: 2-3 (PGWP 0.4)
    // Therefore P1's OGWP (0.5) > P2's OGWP (0.4)
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p3", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
        { roundNumber: 1, p1Id: "p2", p2Id: "p4", p1Score: 2, p2Score: 0, winnerId: "p2", isBye: false },
        { roundNumber: 2, p1Id: "p3", p2Id: "p5", p1Score: 2, p2Score: 0, winnerId: "p3", isBye: false },
        { roundNumber: 2, p1Id: "p4", p2Id: "p6", p1Score: 2, p2Score: 1, winnerId: "p4", isBye: false },
    ];

    const standings = computeStandings(participants, matches);
    const p1Row = standings.find(s => s.participantId === "p1")!;
    const p2Row = standings.find(s => s.participantId === "p2")!;

    assert.strictEqual(p1Row.matchPoints, 3);
    assert.strictEqual(p2Row.matchPoints, 3);
    assert.strictEqual(p1Row.omwp, p2Row.omwp);
    assert.strictEqual(p1Row.pgwp, p2Row.pgwp);
    assert.ok(p1Row.ogwp > p2Row.ogwp);
    assert.ok(p1Row.rank < p2Row.rank);
});

test("computeStandings handles draws awarding 1 point to each player", () => {
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
    ];
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 1, p2Score: 1, winnerId: null, isBye: false },
    ];

    const standings = computeStandings(participants, matches);
    assert.strictEqual(standings[0].matchPoints, 1);
    assert.strictEqual(standings[0].draws, 1);
    assert.strictEqual(standings[1].matchPoints, 1);
    assert.strictEqual(standings[1].draws, 1);
});

test("computeStandings applies MWP floor of 0.33 to winless players", () => {
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
    ];
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
    ];

    const standings = computeStandings(participants, matches);
    const bob = standings.find(s => s.participantId === "p2")!;
    assert.strictEqual(bob.matchPoints, 0);
    assert.strictEqual(bob.mwp, 0.33); // 0 / 3 = 0, floored to 0.33
});

test("computeStandings preserves dropped status and ranks all participants", () => {
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: true },
    ];
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 0, winnerId: "p1", isBye: false },
    ];

    const standings = computeStandings(participants, matches);
    assert.strictEqual(standings.length, 2);
    assert.strictEqual(standings[0].rank, 1);
    assert.strictEqual(standings[0].dropped, false);
    assert.strictEqual(standings[1].rank, 2);
    assert.strictEqual(standings[1].dropped, true);
});

test("computeStandings ignores matches with non-finished status", () => {
    const participants = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
    ];
    const matches = [
        { roundNumber: 1, p1Id: "p1", p2Id: "p2", p1Score: 1, p2Score: 0, winnerId: null, isBye: false, status: "IN_PROGRESS" },
    ];

    const standings = computeStandings(participants, matches);
    assert.strictEqual(standings[0].matchPoints, 0);
    assert.strictEqual(standings[1].matchPoints, 0);
    assert.strictEqual(standings[0].wins, 0);
});
