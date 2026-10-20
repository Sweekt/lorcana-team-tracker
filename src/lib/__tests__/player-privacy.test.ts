import test from "node:test";
import assert from "node:assert/strict";
import { canViewPlayerStats } from "../team-sharing";

test("Player can always view their own stats even if shareData is false", () => {
    assert.strictEqual(canViewPlayerStats({
        sessionUserId: "user-1",
        targetUserId: "user-1",
        shareData: false
    }), true);
});

test("Teammates cannot view stats when shareData is false", () => {
    assert.strictEqual(canViewPlayerStats({
        sessionUserId: "user-2",
        targetUserId: "user-1",
        shareData: false
    }), false);
});

test("Teammates can view stats when shareData is true", () => {
    assert.strictEqual(canViewPlayerStats({
        sessionUserId: "user-2",
        targetUserId: "user-1",
        shareData: true
    }), true);
});

test("Unauthenticated user cannot view stats when shareData is false", () => {
    assert.strictEqual(canViewPlayerStats({
        sessionUserId: null,
        targetUserId: "user-1",
        shareData: false
    }), false);
});
