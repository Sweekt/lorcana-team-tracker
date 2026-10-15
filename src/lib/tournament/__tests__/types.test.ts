import test from "node:test";
import assert from "node:assert/strict";
import { TOURNAMENT_FORMATS, TOURNAMENT_STATUSES, MATCH_STATUSES } from "../types";

test("Tournament constants contain all required game formats and statuses", () => {
    assert.deepStrictEqual(TOURNAMENT_FORMATS, ["SWISS", "SWISS_TOP_CUT", "SINGLE_ELIMINATION", "ROUND_ROBIN"]);
    assert.deepStrictEqual(TOURNAMENT_STATUSES, ["REGISTRATION", "RUNNING", "TOP_CUT", "FINISHED"]);
    assert.deepStrictEqual(MATCH_STATUSES, ["PENDING", "IN_PROGRESS", "FINISHED"]);
});
