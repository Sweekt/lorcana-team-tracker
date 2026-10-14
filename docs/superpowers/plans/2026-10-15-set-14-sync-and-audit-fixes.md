# Set 14 Transition, Sync & MMR Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct season/queue handling, fix the BO3 null MMR leaderboard/sync bugs, update default settings and teams to Set 14, safeguard Docker prod startup against data loss, and provide a safe match data purge & resync script while preserving all production users and teams.

**Architecture:** 
1. Patch Prisma queries in `leaderboard/page.tsx` and `actions/sync.ts` to strictly select games where `mmrAfter` is non-null for MMR computation, preventing BO3 game 1/2 from resetting player MMR to 1000.
2. Update season defaults to `"Core BO1 - Set 14"` in `.env.example`, `src/actions/team.ts`, and `src/app/leaderboard/page.tsx`.
3. Improve `GameRow.tsx` and `QueueSelector.tsx` for null resilience and URL parameter encoding.
4. Implement `src/scripts/clean-match-history.ts` using Prisma transaction to purge only `Game` and `UserQueueStat` and add Set 14 queues to existing teams without touching user/team structures.
5. Remove dangerous `--accept-data-loss` in `Dockerfile`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Prisma 7, PostgreSQL.

**Spec:** User request and audit findings from 2026-10-15.

## Global Constraints

- Never drop or alter schema tables in a way that destroys `User`, `Team`, `TeamMember`, `Account`, `Session`, or `Card` records.
- Preserve existing comments and docstrings in edited files.
- Ensure all Next.js build and TypeScript type-checks pass.

## Review Focus

1. BO3 non-deciding games with `mmrAfter: null` do not overwrite player MMR to 1000 on the leaderboard.
2. `UserQueueStat` upsert in `sync.ts` correctly selects the latest match with non-null `mmrAfter`.
3. Match deletion script only deletes `Game` and `UserQueueStat` records, keeping `User`, `Team`, `TeamMember`, `Account`, `Session`, and `Card` intact.
4. `QueueSelector.tsx` handles player names with spaces/special characters with proper encoding.
5. `Dockerfile` does not risk data loss with `--accept-data-loss`.

---

### Task 1: Fix BO3 MMR Queries in Leaderboard and Sync

**Files:**
- Modify: `src/app/leaderboard/page.tsx:26-49`
- Modify: `src/actions/sync.ts:108-128`

**Interfaces:**
- `getLeaderboard(queueId: string, teamId: string)`: filters games by `where: { queueId, mmrAfter: { not: null } }`
- `syncTeamHistory()`: finds latest game with `where: { userId: user.id, queueId: queue, mmrAfter: { not: null } }`

- [ ] **Step 1: Update `getLeaderboard` in `src/app/leaderboard/page.tsx`**
Ensure `games` select includes `where: { queueId, mmrAfter: { not: null } }` so that non-deciding BO3 games do not cause MMR to fall back to 1000.

- [ ] **Step 2: Update `latestGame` query in `src/actions/sync.ts`**
Ensure `latestGame` in queue stats update selects `where: { userId: user.id, queueId: queue, mmrAfter: { not: null } }`.

- [ ] **Step 3: Verification**
Verify TypeScript types for `getLeaderboard` and `syncTeamHistory`.

---

### Task 2: Robust UI Handling in GameRow and QueueSelector

**Files:**
- Modify: `src/components/GameRow.tsx:68-118`
- Modify: `src/components/QueueSelector.tsx:14-25`

**Interfaces:**
- `GameRow`: handles `mmrBefore` and `mmrDelta` when null cleanly without displaying `WIN (+)` or `()`
- `QueueSelector`: properly encodes `playerName` using `encodeURIComponent`

- [ ] **Step 1: Fix null MMR display in `src/components/GameRow.tsx`**
Update result badge: if `game.mmrDelta !== null && game.mmrDelta !== undefined`, display `WIN (+X)` or `LOSS (X)`, otherwise display `WIN` or `LOSS`.
Update player MMR: only render `({game.mmrBefore})` if `game.mmrBefore !== null && game.mmrBefore !== undefined`.

- [ ] **Step 2: Fix URL encoding in `src/components/QueueSelector.tsx`**
Use `encodeURIComponent(playerName)` when constructing player route so special characters or spaces in player names do not corrupt URLs.

---

### Task 3: Set 14 Default Season Configuration

**Files:**
- Modify: `.env.example:20`
- Modify: `src/app/leaderboard/page.tsx:94`
- Modify: `src/actions/team.ts:16`

**Interfaces:**
- `process.env.NEXT_PUBLIC_DEFAULT_SEASON_QUEUE`: defaults to `"Core BO1 - Set 14"`

- [ ] **Step 1: Update `.env.example`**
Change `NEXT_PUBLIC_DEFAULT_SEASON_QUEUE="Core BO1 - Set 13"` to `NEXT_PUBLIC_DEFAULT_SEASON_QUEUE="Core BO1 - Set 14"`.

- [ ] **Step 2: Update fallback in `src/app/leaderboard/page.tsx` and `src/actions/team.ts`**
Change fallback string `"Core BO1 - Set 13"` to `"Core BO1 - Set 14"`.

---

### Task 4: Safe Production Maintenance Script (Purge Matches & Activate Set 14)

**Files:**
- Create: `src/scripts/clean-match-history.ts`
- Modify: `package.json:scripts`

**Interfaces:**
- `npm run clean:matches`: runs `tsx src/scripts/clean-match-history.ts`
- Deletes all records in `Game` and `UserQueueStat`
- Updates all `Team` records to ensure `"Core BO1 - Set 14"` and `"Core BO3 - Set 14"` are present in `activeQueues`
- Does NOT delete or alter `User`, `Team`, `TeamMember`, `Account`, `Session`, `Card`

- [ ] **Step 1: Create `src/scripts/clean-match-history.ts`**
Script connects to Prisma, executes transaction:
1. `prisma.userQueueStat.deleteMany()`
2. `prisma.game.deleteMany()`
3. For each team in `prisma.team.findMany()`: appends Set 14 queues (`"Core BO1 - Set 14"`, `"Core BO3 - Set 14"`) if not already present.
Logs exact counts of deleted games and updated teams.

- [ ] **Step 2: Add script to `package.json`**
Add `"clean:matches": "tsx src/scripts/clean-match-history.ts"` to `scripts`.

---

### Task 5: Production Security in Dockerfile

**Files:**
- Modify: `Dockerfile:24`

**Interfaces:**
- Safe startup command without `--accept-data-loss`

- [ ] **Step 1: Update `Dockerfile`**
Replace `CMD npx prisma db push --accept-data-loss && npm start` with `CMD npx prisma db push && npm start` or safe deployment command.

---

### Task 6: Build Verification & Validation

**Files:**
- Test: Full Next.js build and type check

- [ ] **Step 1: Run type checking and build test**
Verify with `npx next build` or `npm run build` that there are no syntax errors, type errors, or broken imports.
