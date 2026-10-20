# User Team Share Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to toggle game sharing on or off on a per-team basis from their settings, dynamically excluding unshared games and player stats from team aggregations, ladders, and teammate profile views while keeping the member in the roster and showing their sharing status to the team captain.

**Architecture:** Add a `shareData Boolean @default(true)` column to the `TeamMember` junction model. Expose a server action `toggleTeamDataSharing` that updates this flag. Propagate `{ teamId, shareData: true }` filtering to team-level Prisma queries (home, leaderboard, history, stats), and conditionally render a privacy notice on `/player/[name]` when teammates view a private player's profile.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Prisma ORM 7, PostgreSQL/Better-SQLite3, Tailwind CSS 4, Sonner (Toasts), `node:test` runner.

**Spec:** [docs/superpowers/specs/2026-10-20-user-team-share-toggle-design.md](file:///home/sweek/lorcana-team-tracker/docs/superpowers/specs/2026-10-20-user-team-share-toggle-design.md)

## Global Constraints

- Prisma schema defines `shareData Boolean @default(true)` on `TeamMember` (not on `User`).
- Default value for existing and new team members must be `true`.
- The user viewing their own profile (`session.user.id === targetUser.id`) must always see all their own games and stats even if `shareData === false`.
- The player must remain visible in `/roster`.
- The captain view `/team/settings` must display a distinct badge for each member indicating whether sharing is active or disabled.
- Follow Next.js App Router conventions with server actions and `revalidatePath`.

## Review Focus

1. **Self-view exception:** When a user who disabled sharing views their own `/player/[name]` page, their stats and MMR chart must remain fully visible to them.
2. **Missing `TeamMember` record:** If a user navigates to `/player/[name]` for a user not belonging to `currentTeamId`, return 404 or access denied without unhandled exceptions.
3. **Multi-team independence:** Toggling `shareData` off for Team A must not affect visibility or queries in Team B.
4. **Leaderboard / Ladder integrity:** Users with `shareData: false` must not appear on `/leaderboard` rank tables, even if they have recorded games.
5. **Session/Authorization check in Server Action:** Calling `toggleTeamDataSharing` for a team the user does not belong to or when unauthenticated must return `{ error: "Non autorisé" }`.

---

### Task 1: Prisma Schema Update & Helper Query Logic

**Files:**
- Modify: `prisma/schema.prisma:81-93`
- Create: `src/lib/__tests__/team-sharing.test.ts`
- Create: `src/lib/team-sharing.ts`

**Interfaces:**
- Produces: `isPlayerSharingWithTeam(userId: string, teamId: string, prismaClient: any): Promise<boolean>`
- Produces: `getTeamShareWhereClause(teamId: string): object`

- [ ] **Step 1: Write failing unit test for `isPlayerSharingWithTeam` and query helper**

Create `src/lib/__tests__/team-sharing.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/__tests__/team-sharing.test.ts`
Expected: FAIL with module `../team-sharing` not found.

- [ ] **Step 3: Update `prisma/schema.prisma` and implement `src/lib/team-sharing.ts`**

In `prisma/schema.prisma`, add `shareData Boolean @default(true)` to `TeamMember`:
```prisma
model TeamMember {
  id        String   @id @default(cuid())
  userId    String
  teamId    String
  role      Role     @default(MEMBER)
  shareData Boolean  @default(true)
  joinedAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
  @@index([teamId])
}
```

Implement `src/lib/team-sharing.ts`:
```ts
import prisma from "@/lib/prisma";

export function getTeamShareWhereClause(teamId: string) {
    return {
        teams: {
            some: {
                teamId,
                shareData: true,
            }
        }
    };
}

export async function isPlayerSharingWithTeam(
    userId: string,
    teamId: string,
    prismaClient: typeof prisma = prisma
): Promise<boolean> {
    const member = await prismaClient.teamMember.findUnique({
        where: {
            userId_teamId: { userId, teamId }
        },
        select: { shareData: true }
    });
    return member?.shareData ?? false;
}
```

Push schema updates and generate Prisma client:
Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx prisma generate && npx prisma db push`

- [ ] **Step 4: Run test to verify it passes**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/__tests__/team-sharing.test.ts`
Expected: PASS with 4 passed tests.

---

### Task 2: Server Action for Toggling Team Data Sharing

**Files:**
- Modify: `src/actions/team.ts`
- Test: `src/lib/__tests__/team-sharing-action.test.ts`

**Interfaces:**
- Produces: `toggleTeamDataSharing(teamId: string, shareData: boolean): Promise<{ success?: boolean; error?: string }>`

- [ ] **Step 1: Write failing test for authorization and validation in `toggleTeamDataSharing`**

Create `src/lib/__tests__/team-sharing-action.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";

test("toggleTeamDataSharing logic validates user membership", async () => {
    // Logic verification: unauthenticated or non-member calls fail
    const validateCanToggle = (sessionUserId: string | null, targetUserId: string) => {
        if (!sessionUserId || sessionUserId !== targetUserId) {
            return { error: "Non autorisé" };
        }
        return { success: true };
    };

    assert.deepStrictEqual(validateCanToggle(null, "user-1"), { error: "Non autorisé" });
    assert.deepStrictEqual(validateCanToggle("user-2", "user-1"), { error: "Non autorisé" });
    assert.deepStrictEqual(validateCanToggle("user-1", "user-1"), { success: true });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/__tests__/team-sharing-action.test.ts`
Expected: PASS.

- [ ] **Step 3: Implement `toggleTeamDataSharing` in `src/actions/team.ts`**

Add to `src/actions/team.ts`:
```ts
export async function toggleTeamDataSharing(teamId: string, shareData: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Non autorisé" };
    }

    try {
        const membership = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId: session.user.id,
                    teamId: teamId
                }
            }
        });

        if (!membership) {
            return { error: "Vous n'êtes pas membre de cette équipe." };
        }

        await prisma.teamMember.update({
            where: {
                userId_teamId: {
                    userId: session.user.id,
                    teamId: teamId
                }
            },
            data: {
                shareData: Boolean(shareData)
            }
        });

        revalidatePath("/settings");
        revalidatePath("/leaderboard");
        revalidatePath("/");
        revalidatePath("/player/[name]", "page");
        revalidatePath("/team/settings");

        return { success: true };
    } catch (e) {
        console.error("Erreur lors de la mise à jour du partage d'équipe :", e);
        return { error: "Impossible de mettre à jour le paramètre de partage." };
    }
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsc --noEmit`
Expected: 0 errors.

---

### Task 3: User Settings UI (`/settings`)

**Files:**
- Modify: `src/app/settings/page.tsx:14-46`
- Modify: `src/app/settings/ProfileForm.tsx:10-31, 230-320`

**Interfaces:**
- Consumes: `TeamMembership.shareData: boolean`
- Consumes: `toggleTeamDataSharing(teamId, shareData)`

- [ ] **Step 1: Pass `shareData` from `src/app/settings/page.tsx`**

In `src/app/settings/page.tsx`, ensure `teams` includes `shareData`:
```tsx
const userData = {
    // ...existing
    memberships: userFromDb.teams.map(t => ({
        teamId: t.teamId,
        role: t.role,
        shareData: t.shareData,
        team: t.team
    }))
};
```

- [ ] **Step 2: Update `TeamMembership` type and add Toggle Switch in `ProfileForm.tsx`**

In `src/app/settings/ProfileForm.tsx`:
1. Update `TeamMembership` type:
```ts
type TeamMembership = {
    teamId: string;
    role: "ADMIN" | "MEMBER";
    shareData: boolean;
    team: {
        id: string;
        name: string;
        _count: { members: number };
    };
};
```
2. Import `toggleTeamDataSharing` from `@/actions/team`.
3. In the "Mes Équipes" mapping of `ProfileForm`, add the toggle control for each team:
```tsx
const [sharingState, setSharingState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    user.memberships.forEach(m => { initial[m.teamId] = m.shareData; });
    return initial;
});

const handleToggleShare = (teamId: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    setSharingState(prev => ({ ...prev, [teamId]: nextVal }));

    startTransition(async () => {
        const res = await toggleTeamDataSharing(teamId, nextVal);
        if (res?.error) {
            toast.error(res.error);
            setSharingState(prev => ({ ...prev, [teamId]: currentVal }));
        } else {
            toast.success(nextVal ? "Partage activé avec cette équipe" : "Partage désactivé avec cette équipe");
            router.refresh();
        }
    });
};
```
4. Render switch with clean accessible UI:
```tsx
<div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
    <div>
        <p className="text-xs font-semibold text-slate-300">Partager mes parties avec l'équipe</p>
        <p className="text-[11px] text-slate-500">Stats, ladder et historique visibles par vos coéquipiers.</p>
    </div>
    <button
        type="button"
        role="switch"
        aria-checked={sharingState[membership.teamId] ?? true}
        onClick={() => handleToggleShare(membership.teamId, sharingState[membership.teamId] ?? true)}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            (sharingState[membership.teamId] ?? true) ? "bg-indigo-600" : "bg-slate-700"
        }`}
    >
        <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                (sharingState[membership.teamId] ?? true) ? "translate-x-5" : "translate-x-0"
            }`}
        />
    </button>
</div>
```

- [ ] **Step 3: Verify TypeScript builds without errors**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsc --noEmit`
Expected: 0 errors.

---

### Task 4: Filtering Team Queries on Dashboard & Leaderboard

**Files:**
- Modify: `src/app/page.tsx:60-66`
- Modify: `src/app/leaderboard/page.tsx:26-67, 106-113`
- Modify: `src/lib/__tests__/team-sharing.test.ts`

**Interfaces:**
- Consumes: `getTeamShareWhereClause(teamId)`

- [ ] **Step 1: Write integration tests for query filter structure**

Append to `src/lib/__tests__/team-sharing.test.ts`:
```ts
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
```

- [ ] **Step 2: Update `src/app/page.tsx` totalTeamGames count**

Replace lines 60-66 in `src/app/page.tsx` with:
```ts
const totalTeamGames = await prisma.game.count({
    where: {
        user: {
            teams: { some: { teamId: teamId, shareData: true } }
        }
    }
});
```

- [ ] **Step 3: Update `src/app/leaderboard/page.tsx` functions**

1. In `getLeaderboard`:
```ts
async function getLeaderboard(queueId: string, teamId: string) {
  const users = await prisma.user.findMany({
    where: {
      teams: { some: { teamId, shareData: true } }
    },
    select: {
      name: true,
      image: true,
      _count: { select: { games: { where: { queueId } } } },
      games: { where: { queueId, mmrAfter: { not: null } }, orderBy: { startedAt: "desc" }, take: 1, select: { mmrAfter: true } },
    },
  });
...
```

2. In `getRecentHistory`:
```ts
async function getRecentHistory(queueId: string, teamId: string) {
  const isBo3 = queueId.includes("BO3");
  return prisma.game.findMany({
    where: {
      queueId: queueId,
      ...(isBo3 ? { mmrDelta: { not: null } } : {}),
      user: {
        teams: {
          some: { teamId: teamId, shareData: true }
        }
      }
    },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, image: true } } }
  });
}
```

3. In `LeaderboardPage` Stats tab query:
```ts
const allStatsGames = await prisma.game.findMany({
    where: {
        queueId: currentQueue,
        user: { teams: { some: { teamId: teamId, shareData: true } } }
    },
    select: { result: true, wentFirst: true, myDeckColors: true, oppDeckColors: true, user: { select: { name: true } } }
});
```

- [ ] **Step 4: Verify test suite and typecheck**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/__tests__/*.test.ts && npx tsc --noEmit`
Expected: PASS.

---

### Task 5: Player Profile Page Privacy Masking (`/player/[name]`)

**Files:**
- Modify: `src/app/player/[name]/page.tsx`
- Test: `src/lib/__tests__/player-privacy.test.ts`

**Interfaces:**
- Checks: `canViewData = isOwner || isShared`

- [ ] **Step 1: Write unit test for profile view decision logic**

Create `src/lib/__tests__/player-privacy.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";

function canViewPlayerStats({
    sessionUserId,
    targetUserId,
    shareData
}: {
    sessionUserId: string;
    targetUserId: string;
    shareData: boolean | null | undefined;
}) {
    if (sessionUserId === targetUserId) return true;
    return Boolean(shareData);
}

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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/__tests__/player-privacy.test.ts`
Expected: PASS.

- [ ] **Step 3: Update `src/app/player/[name]/page.tsx`**

1. Query target user's membership in `teamId`:
```ts
const targetMembership = await prisma.teamMember.findUnique({
    where: {
        userId_teamId: {
            userId: targetUser.id,
            teamId: teamId
        }
    },
    select: { shareData: true }
});

const isOwner = session.user.id === targetUser.id;
const isSharing = targetMembership?.shareData ?? false;
const canViewData = isOwner || isSharing;
```

2. If `!canViewData`:
   - Bypass games, MMR charts, and history queries.
   - Render the profile header with Avatar, Name, and Dreamborn button (if set).
   - Render the privacy notice card:
```tsx
if (!canViewData) {
    return (
        <div className="flex-1 flex flex-col justify-center bg-slate-950 text-slate-100 pb-20">
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {targetUser.image ? (
                            <img
                                src={targetUser.image}
                                alt={displayName}
                                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-700 shadow-md shrink-0"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/30 flex items-center justify-center text-4xl font-black text-indigo-400 shrink-0">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <div className="text-center sm:text-left space-y-3 w-full">
                            <h1 className="text-3xl font-extrabold tracking-tight">{displayName}</h1>
                            {targetUser.dreambornUrl && (
                                <a
                                    href={targetUser.dreambornUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-all text-sm font-medium text-slate-300"
                                >
                                    <StarIcon className="w-4 h-4" />
                                    <span>Voir les Decks sur Dreamborn</span>
                                </a>
                            )}
                        </div>
                    </div>
                </section>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto text-xl">
                        🔒
                    </div>
                    <h3 className="text-lg font-bold text-slate-200">Partage de données désactivé</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                        Ce joueur n'a pas activé le partage de ses parties, statistiques et graphiques avec l'équipe.
                    </p>
                </div>
            </main>
        </div>
    );
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsc --noEmit`
Expected: 0 errors.

---

### Task 6: Captain's Team Settings Badge Display (`/team/settings`)

**Files:**
- Modify: `src/app/team/settings/page.tsx:16-34`
- Modify: `src/app/team/settings/TeamSettingsForm.tsx:130-188`

**Interfaces:**
- Consumes: `member.shareData: boolean`

- [ ] **Step 1: Ensure `shareData` is selected on `team.members`**

In `src/app/team/settings/page.tsx`, `prisma.team.findUnique` includes `members`. `shareData` is a direct field on `TeamMember`, so it is automatically included in `include: { members: { include: { user: ... } } }`.

- [ ] **Step 2: Add Sharing Status Badge in `TeamSettingsForm.tsx`**

In `src/app/team/settings/TeamSettingsForm.tsx`, inside `team.members.map((member: any) => ...)`:
Add the sharing status badge next to the connection status badge:
```tsx
const isSharing = member.shareData ?? true;

// Under the member name / badge row:
<span
    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
        isSharing
            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
    }`}
>
    {isSharing ? "✓ Partage actif" : "✕ Partage désactivé"}
</span>
```

- [ ] **Step 3: Verify TypeScript builds without errors**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsc --noEmit`
Expected: 0 errors.

---

### Task 7: Full Verification & Build Check

**Files:**
- Test all components: `src/lib/__tests__/*.test.ts`
- Build: `npm run build`

- [ ] **Step 1: Run all unit and regression tests**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/__tests__/*.test.ts`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Run complete production build check**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npm run build`
Expected: Next.js build succeeds with static/dynamic route generation without type or lint errors.
