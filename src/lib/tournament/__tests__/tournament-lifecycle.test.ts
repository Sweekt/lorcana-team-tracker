import test from "node:test";
import assert from "node:assert/strict";
import { resolveDropForfeits } from "../tournament-lifecycle";

test("resolveDropForfeits awards 2-0 forfeit win to opponent if match is not yet finished", () => {
    const activeMatches = [
        { id: "m1", p1Id: "p1", p2Id: "p2", p1Score: 0, p2Score: 0, status: "IN_PROGRESS", isForfeit: false, winnerId: null },
    ];

    const updated = resolveDropForfeits(activeMatches, "p1");
    assert.strictEqual(updated[0].status, "FINISHED");
    assert.strictEqual(updated[0].isForfeit, true);
    assert.strictEqual(updated[0].p1Score, 0);
    assert.strictEqual(updated[0].p2Score, 2);
    assert.strictEqual(updated[0].winnerId, "p2");
});

test("resolveDropForfeits preserves existing score if match is already finished", () => {
    const finishedMatches = [
        { id: "m1", p1Id: "p1", p2Id: "p2", p1Score: 2, p2Score: 1, status: "FINISHED", isForfeit: false, winnerId: "p1" },
    ];

    const updated = resolveDropForfeits(finishedMatches, "p1");
    assert.strictEqual(updated[0].winnerId, "p1");
    assert.strictEqual(updated[0].p1Score, 2);
    assert.strictEqual(updated[0].p2Score, 1);
});

test("resolveDropForfeits awards 2-0 to p1 if p2 drops on an in-progress match", () => {
    const activeMatches = [
        { id: "m2", p1Id: "p1", p2Id: "p2", p1Score: 1, p2Score: 0, status: "IN_PROGRESS", isForfeit: false, winnerId: null },
    ];

    const updated = resolveDropForfeits(activeMatches, "p2");
    assert.strictEqual(updated[0].status, "FINISHED");
    assert.strictEqual(updated[0].isForfeit, true);
    assert.strictEqual(updated[0].p1Score, 2);
    assert.strictEqual(updated[0].p2Score, 0);
    assert.strictEqual(updated[0].winnerId, "p1");
});

test("resolveDropForfeits does not modify matches of other participants", () => {
    const matches = [
        { id: "m1", p1Id: "p1", p2Id: "p2", p1Score: 0, p2Score: 0, status: "PENDING", isForfeit: false, winnerId: null },
        { id: "m2", p1Id: "p3", p2Id: "p4", p1Score: 0, p2Score: 0, status: "PENDING", isForfeit: false, winnerId: null },
    ];

    const updated = resolveDropForfeits(matches, "p1");
    assert.strictEqual(updated[0].status, "FINISHED");
    assert.strictEqual(updated[0].winnerId, "p2");

    assert.strictEqual(updated[1].status, "PENDING");
    assert.strictEqual(updated[1].winnerId, null);
    assert.strictEqual(updated[1].isForfeit, false);
});

test("resolveDropForfeits supports prisma property names player1Id and player2Id", () => {
    const activeMatches = [
        { id: "m3", player1Id: "p1", player2Id: "p2", player1Score: 0, player2Score: 0, status: "IN_PROGRESS", isForfeit: false, winnerId: null },
    ];

    const updated = resolveDropForfeits(activeMatches, "p1");
    assert.strictEqual(updated[0].status, "FINISHED");
    assert.strictEqual(updated[0].isForfeit, true);
    assert.strictEqual(updated[0].player1Score, 0);
    assert.strictEqual(updated[0].player2Score, 2);
    assert.strictEqual(updated[0].winnerId, "p2");
});

test("areAllMatchesFinished returns true only when all matches are finished", () => {
    const { areAllMatchesFinished } = require("../tournament-lifecycle");
    assert.strictEqual(areAllMatchesFinished([]), false);
    assert.strictEqual(areAllMatchesFinished([{ status: "FINISHED" }, { status: "FINISHED" }]), true);
    assert.strictEqual(areAllMatchesFinished([{ status: "FINISHED" }, { status: "IN_PROGRESS" }]), false);
});

test("calculateDefaultSwissRounds returns correct round count for participants", () => {
    const { calculateDefaultSwissRounds } = require("../tournament-lifecycle");
    assert.strictEqual(calculateDefaultSwissRounds(2), 1);
    assert.strictEqual(calculateDefaultSwissRounds(4), 2);
    assert.strictEqual(calculateDefaultSwissRounds(8), 3);
    assert.strictEqual(calculateDefaultSwissRounds(16), 4);
    assert.strictEqual(calculateDefaultSwissRounds(32), 5);
});

test("canEditTournamentFormat allows format changes strictly in REGISTRATION status", () => {
    const { canEditTournamentFormat } = require("../tournament-lifecycle");
    assert.strictEqual(canEditTournamentFormat("REGISTRATION"), true);
    assert.strictEqual(canEditTournamentFormat("RUNNING"), false);
    assert.strictEqual(canEditTournamentFormat("TOP_CUT"), false);
    assert.strictEqual(canEditTournamentFormat("FINISHED"), false);
    assert.strictEqual(canEditTournamentFormat(""), false);
});

