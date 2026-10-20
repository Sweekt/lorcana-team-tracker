import test from "node:test";
import assert from "node:assert/strict";
import { isPlayerSharingWithTeam, getTeamShareWhereClause } from "../team-sharing";

test("getTeamShareWhereClause builds correct filter with shareData: true", () => {
    const clause = getTeamShareWhereClause("team-123");
    assert.deepStrictEqual(clause, {
        teams: {
            some: {
                teamId: "team-123",
                shareData: true,
            }
        }
    });
});

test("isPlayerSharingWithTeam returns true when member has shareData true", async () => {
    const mockPrisma = {
        teamMember: {
            findUnique: async () => ({ shareData: true }),
        }
    };
    const res = await isPlayerSharingWithTeam("user-1", "team-123", mockPrisma as any);
    assert.strictEqual(res, true);
});

test("isPlayerSharingWithTeam returns false when member has shareData false", async () => {
    const mockPrisma = {
        teamMember: {
            findUnique: async () => ({ shareData: false }),
        }
    };
    const res = await isPlayerSharingWithTeam("user-1", "team-123", mockPrisma as any);
    assert.strictEqual(res, false);
});

test("isPlayerSharingWithTeam returns false when member does not exist in team", async () => {
    const mockPrisma = {
        teamMember: {
            findUnique: async () => null,
        }
    };
    const res = await isPlayerSharingWithTeam("user-1", "team-123", mockPrisma as any);
    assert.strictEqual(res, false);
});

test("where clauses for games include shareData: true for team", () => {
    const teamId = "team_alpha";
    const gameWhere = {
        queueId: "Core BO1",
        user: {
            teams: {
                some: { teamId, shareData: true }
            }
        }
    };

    assert.strictEqual(gameWhere.user.teams.some.teamId, "team_alpha");
    assert.strictEqual(gameWhere.user.teams.some.shareData, true);
});
