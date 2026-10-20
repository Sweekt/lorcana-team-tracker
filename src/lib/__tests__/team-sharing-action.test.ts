import test from "node:test";
import assert from "node:assert/strict";
import { validateTeamSharingPermission } from "../team-sharing";

test("validateTeamSharingPermission fails when unauthenticated", () => {
    assert.deepStrictEqual(validateTeamSharingPermission(null, "user-1"), { allowed: false, error: "Non autorisé" });
});

test("validateTeamSharingPermission fails when user is not member of team", () => {
    assert.deepStrictEqual(validateTeamSharingPermission("user-1", null), { allowed: false, error: "Vous n'êtes pas membre de cette équipe." });
});

test("validateTeamSharingPermission succeeds when user is the team member", () => {
    assert.deepStrictEqual(validateTeamSharingPermission("user-1", "user-1"), { allowed: true });
});
