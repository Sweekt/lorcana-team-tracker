# Module Tournois LoreTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à LoreTracker un module complet de tournois internes d'équipe avec 4 formats (Swiss avec/sans Top-Cut, Round Robin, Single Elimination), génération automatisée des salons Duels.ink via un bot neutre, synchronisation des scores et decklists, et espace d'analyse post-tournoi.

**Architecture:** Modélisation relationnelle dans Prisma (`Tournament`, `TournamentParticipant`, `TournamentRound`, `TournamentMatch`), moteur algorithmique modulaire et testé unitairement pour les appariements/départages (Swiss Dutch, Round Robin, Brackets), client API Duels.ink pour l'orchestration des tables privées (`POST /api/table/create`), et interface Next.js App Router réactive en 4 vues (Matchs/Arbre, Classement OMWP, Historique des Decks, Statistiques).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Prisma ORM (PostgreSQL/SQLite), NextAuth, Duels.ink REST API, Sonner.

**Spec:** [`docs/superpowers/specs/2026-10-15-tournaments-module-design.md`](file:///home/sweek/lorcana-team-tracker/docs/superpowers/specs/2026-10-15-tournaments-module-design.md)

## Global Constraints

- Langage et typage strict en TypeScript (`strict: true`).
- Pas de régression sur le modèle d'authentification NextAuth et l'isolation multi-équipes (`activeTeamId`).
- Respect de la charte graphique sombre (`bg-slate-950`, `bg-slate-900`, `text-slate-200`, `border-slate-800`, accent `sky-500` / `blue-600`).
- Les appels Duels.ink pour créer les tables utilisent le token organisateur neutre `DUELS_ORGANIZER_API_KEY` avec `asSpectator: true`.
- Règle stricte du Bye en ronde suisse : attribué au dernier joueur du classement actif uniquement si le nombre de joueurs est impair ; un joueur ayant déjà reçu un Bye ne peut jamais en recevoir un second.
- Abandon en cours de ronde : si match non terminé, forfait 2-0 immédiat pour l'adversaire et exclusion totale des rondes suivantes.

## Review Focus

1. **Nombre impair de joueurs en ronde suisse avec plusieurs joueurs ayant déjà eu un Bye :** Le Bye doit descendre au joueur suivant le plus bas n'en ayant jamais reçu, sans boucle infinie si tous les joueurs du bas en ont déjà eu un.
2. **Appariement suisse impossible sans rematch (fin de tournoi à faible effectif) :** L'algorithme doit tolérer un rematch minimal uniquement si aucun appariement sans doublon n'est mathématiquement possible, plutôt que de crasher.
3. **Abandon simultané des deux joueurs d'un match :** Le système doit marquer le match en double forfait sans bloquer la clôture de la ronde.
4. **Échec réseau ou indisponibilité temporaire de l'API Duels.ink :** La création de table en échec ne bloque pas la ronde ; un bouton de réessai et une saisie manuelle de secours pour le capitaine doivent rester opérationnels.
5. **Format Single Elimination avec nombre de participants non-puissance de 2 (ex: 5, 6, 7) :** L'arbre doit attribuer des Byes automatiques au tour 1 aux meilleures têtes de série sans décaler les matchs des tours suivants.

---

### Task 1: Modélisation Prisma & Types du Domaine

**Files:**
- Modify: `prisma/schema.prisma:140-146`
- Create: `src/lib/tournament/types.ts`
- Test: `src/lib/tournament/__tests__/types.test.ts`

**Interfaces:**
- Consumes: `User`, `Team` existants dans `schema.prisma`.
- Produces: Énumérations et modèles `Tournament`, `TournamentParticipant`, `TournamentRound`, `TournamentMatch`, et types TypeScript `TournamentFormat`, `TournamentStatus`, `MatchStatus`, `ParticipantStanding`.

- [ ] **Step 1: Écrire le test unitaire validant les types et énumérations du tournoi**

```typescript
// src/lib/tournament/__tests__/types.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { TOURNAMENT_FORMATS, TOURNAMENT_STATUSES, MATCH_STATUSES } from "../types";

test("Tournament constants contain all required game formats and statuses", () => {
    assert.deepStrictEqual(TOURNAMENT_FORMATS, ["SWISS", "SWISS_TOP_CUT", "SINGLE_ELIMINATION", "ROUND_ROBIN"]);
    assert.deepStrictEqual(TOURNAMENT_STATUSES, ["REGISTRATION", "RUNNING", "TOP_CUT", "FINISHED"]);
    assert.deepStrictEqual(MATCH_STATUSES, ["PENDING", "IN_PROGRESS", "FINISHED"]);
});
```

- [ ] **Step 2: Exécuter le test pour vérifier l'échec initial**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module '../types'"

- [ ] **Step 3: Implémenter `src/lib/tournament/types.ts` et enrichir `prisma/schema.prisma`**

Ajouter dans `src/lib/tournament/types.ts` :
- Constantes et types : `TournamentFormat`, `TournamentStatus`, `MatchStatus`, `MatchFormat` (`BO1` | `BO3`).
- Interfaces pour les appariements : `PairingPlayer`, `GeneratedMatch`, `StandingRow`.

Ajouter dans `prisma/schema.prisma` :
- `model Tournament` : `id`, `teamId`, `name`, `format`, `status`, `matchFormat`, `set`, `allowDeckChanges`, `topCutSize`, `roundsCount`, `currentRoundNumber`, `createdAt`, `createdById`.
- `model TournamentParticipant` : `id`, `tournamentId`, `userId`, `officialDecklist`, `officialDeckColors`, `dropped`, `droppedAtRound`, `joinedAt`.
- `model TournamentRound` : `id`, `tournamentId`, `roundNumber`, `isTopCut`, `status`, `createdAt`.
- `model TournamentMatch` : `id`, `roundId`, `tableNumber`, `player1Id`, `player2Id`, `duelsTableId`, `duelsTableUrl`, `player1Score`, `player2Score`, `isBye`, `isForfeit`, `winnerId`, `status`, `replayUrl`, `player1Deck`, `player2Deck`.

- [ ] **Step 4: Exécuter le test pour vérifier le succès**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: Mettre à jour le client Prisma localement**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx prisma generate`
Expected: "Generated Prisma Client"

---

### Task 2: Moteur de Départage & Calcul du Classement (OMWP / PGWP / OGWP)

**Files:**
- Create: `src/lib/tournament/standings.ts`
- Test: `src/lib/tournament/__tests__/standings.test.ts`

**Interfaces:**
- Consumes: `StandingRow`, `GeneratedMatch` depuis `src/lib/tournament/types.ts`.
- Produces: `computeStandings(participants, completedMatches): StandingRow[]`.

- [ ] **Step 1: Écrire le test unitaire pour le calcul du classement et des tie-breaks OMWP**

```typescript
// src/lib/tournament/__tests__/standings.test.ts
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
```

- [ ] **Step 2: Exécuter le test pour vérifier l'échec initial**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/standings.test.ts`
Expected: FAIL with "Cannot find module '../standings'"

- [ ] **Step 3: Implémenter `computeStandings` dans `src/lib/tournament/standings.ts`**

Implémenter le calcul officiel Lorcana :
- Match Win Percentage (MWP) de chaque joueur (avec plancher à 0.33 selon le standard de tournoi).
- Opponents' Match Win Percentage (OMWP) : moyenne des MWP des adversaires rencontrés (hors Byes).
- Player Game Win Percentage (PGWP) : ratio des manches gagnées sur manches jouées.
- Opponents' Game Win Percentage (OGWP) : moyenne des PGWP des adversaires.
- Tri : `matchPoints DESC`, puis `omwp DESC`, puis `pgwp DESC`, puis `ogwp DESC`.

- [ ] **Step 4: Exécuter le test pour vérifier le succès**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/standings.test.ts`
Expected: PASS

---

### Task 3: Algorithmes d'Appariement (Swiss, Round Robin, Single Elimination)

**Files:**
- Create: `src/lib/tournament/swiss.ts`
- Create: `src/lib/tournament/round-robin.ts`
- Create: `src/lib/tournament/single-elimination.ts`
- Test: `src/lib/tournament/__tests__/pairings.test.ts`

**Interfaces:**
- Consumes: `computeStandings` depuis `src/lib/tournament/standings.ts`.
- Produces:
  - `generateSwissRound(participants, previousMatches, roundNumber): GeneratedMatch[]`
  - `generateRoundRobinRounds(participants): GeneratedMatch[][]`
  - `generateSingleEliminationRound(participants, currentRoundNumber, previousMatches): GeneratedMatch[]`

- [ ] **Step 1: Écrire le test unitaire pour les algorithmes d'appariement**

```typescript
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
});

test("generateRoundRobinRounds plans exactly N-1 rounds for N players", () => {
    const participants = [
        { id: "p1", dropped: false },
        { id: "p2", dropped: false },
        { id: "p3", dropped: false },
        { id: "p4", dropped: false },
    ];
    const allRounds = generateRoundRobinRounds(participants);
    assert.strictEqual(allRounds.length, 3);
    assert.strictEqual(allRounds[0].length, 2);
});
```

- [ ] **Step 2: Exécuter le test pour vérifier l'échec initial**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/pairings.test.ts`
Expected: FAIL with "Cannot find module '../swiss'"

- [ ] **Step 3: Implémenter les modules d'appariement**

- `src/lib/tournament/swiss.ts` :
  - Exclut les joueurs `dropped: true`.
  - Si effectif impair : trouve le joueur le plus bas au classement actuel n'ayant **aucun** match avec `isBye: true` dans l'historique et lui attribue le match Bye.
  - Système suisse hollandais : regroupe les joueurs restants par score (score brackets), apparie dans chaque tranche en évitant les confrontations déjà disputées (rematch avoidance). Si blocage, remonte d'un cran (backtracking minimal).
- `src/lib/tournament/round-robin.ts` :
  - Algorithme du cercle (rotation des positions autour du joueur 1 avec joueur fantôme Bye si impair).
- `src/lib/tournament/single-elimination.ts` :
  - Calcule la prochaine puissance de 2 ($M = 2^{\lceil\log_2(N)\rceil}$).
  - Les $M - N$ premiers reçoivent un Bye au tour 1.
  - Pour les tours suivants, apparie les vainqueurs du tour précédent dans l'ordre de l'arbre.

- [ ] **Step 4: Exécuter le test pour vérifier le succès**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/pairings.test.ts`
Expected: PASS

---

### Task 4: Client API Duels.ink (Bot Organisateur) & Synchronisation des Matchs

**Files:**
- Create: `src/lib/tournament/duels-bot.ts`
- Modify: `src/actions/sync.ts:45-85`
- Test: `src/lib/tournament/__tests__/duels-bot.test.ts`

**Interfaces:**
- Consumes: Variable `DUELS_ORGANIZER_API_KEY`.
- Produces:
  - `createDuelsTableForMatch({ p1DuelsId, p2DuelsId, matchFormat, timerPreset }): Promise<{ tableId: string, url: string } | null>`
  - `checkDuelsTableStatus(tableId): Promise<{ status: string, finished: boolean, winnerDuelsId?: string } | null>`

- [ ] **Step 1: Écrire le test unitaire pour l'appel de création de table**

```typescript
// src/lib/tournament/__tests__/duels-bot.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildTableCreatePayload } from "../duels-bot";

test("buildTableCreatePayload reserves both seats for players and configures spectator bot", () => {
    const payload = buildTableCreatePayload({
        p1DuelsId: "u_alice",
        p2DuelsId: "u_bob",
        matchFormat: "bo3",
    });

    assert.strictEqual(payload.asSpectator, true);
    assert.deepStrictEqual(payload.players, ["u_alice", "u_bob"]);
    assert.strictEqual(payload.gameMode, "constructed");
    assert.strictEqual(payload.matchFormat, "bo3");
    assert.strictEqual(payload.visibility, "private");
});
```

- [ ] **Step 2: Exécuter le test pour vérifier l'échec initial**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/duels-bot.test.ts`
Expected: FAIL with "Cannot find module '../duels-bot'"

- [ ] **Step 3: Implémenter `src/lib/tournament/duels-bot.ts` et adapter `src/actions/sync.ts`**

- Dans `duels-bot.ts` :
  - `buildTableCreatePayload(params)` : construction du JSON conforme à la documentation Duels.ink.
  - `createDuelsTableForMatch(params)` : envoi de la requête `POST https://duels.ink/api/table/create` avec le header `Authorization: Bearer ${process.env.DUELS_ORGANIZER_API_KEY}`. Renvoie `tableId` et `url` (`https://duels.ink/table/...`).
  - `checkDuelsTableStatus(tableId)` : appel à `GET https://duels.ink/api/table/${tableId}/view`.
- Dans `src/actions/sync.ts` :
  - Supprimer la restriction exclusive sur `matchmaking` pour permettre également la synchronisation des parties `mode === "private"` dans la boucle de synchronisation des historiques de match.

- [ ] **Step 4: Exécuter le test pour vérifier le succès**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/duels-bot.test.ts`
Expected: PASS

---

### Task 5: Server Actions du Tournoi (Cycle de Vie, Abandons & Arbitrage)

**Files:**
- Create: `src/actions/tournament.ts`
- Test: `src/lib/tournament/__tests__/tournament-lifecycle.test.ts`

**Interfaces:**
- Consumes: Prisma models `Tournament`, `TournamentParticipant`, `TournamentRound`, `TournamentMatch`, et les algorithmes de `swiss.ts`, `round-robin.ts`, `single-elimination.ts`, `standings.ts`.
- Produces:
  - `createTournamentAction(data: CreateTournamentInput)`
  - `joinTournamentAction(tournamentId: string)`
  - `leaveTournamentAction(tournamentId: string)`
  - `kickParticipantAction(tournamentId: string, participantId: string)`
  - `dropTournamentAction(tournamentId: string, participantId: string)`
  - `startTournamentAction(tournamentId: string)`
  - `nextRoundAction(tournamentId: string)`
  - `updateMatchScoreAction(matchId: string, p1Score: number, p2Score: number, winnerId: string)`

- [ ] **Step 1: Écrire le test unitaire pour la logique de gestion des forfaits et abandons**

```typescript
// src/lib/tournament/__tests__/tournament-lifecycle.test.ts
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
```

- [ ] **Step 2: Exécuter le test pour vérifier l'échec initial**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/tournament-lifecycle.test.ts`
Expected: FAIL with "Cannot find module '../tournament-lifecycle'"

- [ ] **Step 3: Implémenter la logique métier dans `src/lib/tournament/tournament-lifecycle.ts` et les Server Actions dans `src/actions/tournament.ts`**

- Implémenter `resolveDropForfeits` dans `src/lib/tournament/tournament-lifecycle.ts`.
- Dans `src/actions/tournament.ts` :
  - Vérifier l'authentification et les droits (`ADMIN` requis pour create, start, nextRound, kick, updateMatchScore).
  - Dans `startTournamentAction` : verrouille les inscriptions, génère la ronde 1, crée les tables Duels via `createDuelsTableForMatch`.
  - Dans `dropTournamentAction` : applique `resolveDropForfeits`, marque `dropped: true`, `droppedAtRound: currentRound`.
  - Dans `nextRoundAction` : vérifie que tous les matchs de la ronde courante sont terminés, calcule le classement intermédiaire, génère la ronde suivante (ou le Top-Cut si ronde suisse terminée), génère les nouvelles tables Duels.
  - Revalidation des chemins (`revalidatePath("/tournaments")`, `revalidatePath(`/tournaments/${id}`)`).

- [ ] **Step 4: Exécuter le test pour vérifier le succès**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/tournament-lifecycle.test.ts`
Expected: PASS

---

### Task 6: Module Statistiques du Tournoi

**Files:**
- Create: `src/lib/tournament/stats.ts`
- Test: `src/lib/tournament/__tests__/stats.test.ts`

**Interfaces:**
- Consumes: Matchs de tournoi et decklists enregistrées.
- Produces: `computeTournamentStats(matches): TournamentStatsResult` (winrate par couleur d'encre, archétypes les plus joués, taux de victoire au toss/premier tour).

- [ ] **Step 1: Écrire le test unitaire pour le calcul des statistiques de tournoi**

```typescript
// src/lib/tournament/__tests__/stats.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { computeTournamentStats } from "../stats";

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
    const rubyAmethyst = stats.inkCombos.find(c => c.name === "Ruby / Amethyst")!;
    assert.strictEqual(rubyAmethyst.gamesPlayed, 5); // 3 manches + 2 manches
    assert.strictEqual(rubyAmethyst.matchesWon, 1);
    assert.strictEqual(rubyAmethyst.matchesPlayed, 2);
    assert.strictEqual(rubyAmethyst.matchWinrate, 50);
});
```

- [ ] **Step 2: Exécuter le test pour vérifier l'échec initial**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/stats.test.ts`
Expected: FAIL with "Cannot find module '../stats'"

- [ ] **Step 3: Implémenter `computeTournamentStats` dans `src/lib/tournament/stats.ts`**

- Normalise les combinaisons d'encres (ordre alphabétique pour éviter de distinguer "Ruby / Amethyst" de "Amethyst / Ruby").
- Calcule le winrate en matchs et en manches pour chaque combinaison d'encres.
- Calcule la part de victoires du joueur ayant joué en premier (*went first*).

- [ ] **Step 4: Exécuter le test pour vérifier le succès**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/stats.test.ts`
Expected: PASS

---

### Task 7: Interface Utilisateur : Navigation, Liste des Tournois & Modal de Création

**Files:**
- Modify: `src/components/Navigation.tsx:38-44`
- Create: `src/app/tournaments/page.tsx`
- Create: `src/app/tournaments/CreateTournamentModal.tsx`
- Create: `src/app/tournaments/TournamentCard.tsx`

**Interfaces:**
- Consumes: `createTournamentAction` depuis `src/actions/tournament.ts`, données des tournois depuis Prisma.
- Produces: Page `/tournaments` complète avec onglet de navigation et formulaire de création pour le capitaine.

- [ ] **Step 1: Modifier `src/components/Navigation.tsx` pour ajouter l'entrée Tournois**

Ajouter l'item `Tournois` dans la liste `navItems` de `Navigation.tsx` avec le chemin `/tournaments` et une icône SVG dédiée.

- [ ] **Step 2: Créer le composant `TournamentCard.tsx`**

Affiche le statut (`Inscriptions ouvertes`, `Ronde X en cours`, `Terminé`), le format, le set autorisé, le nombre de joueurs inscrits, et un lien cliquable vers `/tournaments/[id]`.

- [ ] **Step 3: Créer le composant `CreateTournamentModal.tsx`**

Modal accessible au capitaine (`ADMIN`) comprenant :
- Saisie du nom du tournoi
- Choix du format : radio cards (`SWISS`, `SWISS_TOP_CUT`, `SINGLE_ELIMINATION`, `ROUND_ROBIN`)
- Si `SWISS_TOP_CUT` sélectionné : sélecteur de taille de Top-Cut (2, 4, 8)
- Choix du format de match (`BO3`, `BO1`)
- Choix du Set autorisé (ex: `Set 14`)
- Case à cocher "Autoriser le changement de deck"
- Appel de `createTournamentAction` avec toast Sonner en cas de succès/erreur.

- [ ] **Step 4: Créer la page principale `src/app/tournaments/page.tsx`**

Récupère les tournois rattachés à `activeTeamId`, les divise en `Tournois en cours` et `Tournois terminés (Archives)`, et intègre le bouton d'ouverture de `CreateTournamentModal`.

---

### Task 8: Interface Utilisateur : Page Détail du Tournoi (4 Vues Dynamiques)

**Files:**
- Create: `src/app/tournaments/[id]/page.tsx`
- Create: `src/app/tournaments/[id]/TournamentHeader.tsx`
- Create: `src/app/tournaments/[id]/RoundsView.tsx`
- Create: `src/app/tournaments/[id]/MatchCard.tsx`
- Create: `src/app/tournaments/[id]/StandingsView.tsx`
- Create: `src/app/tournaments/[id]/HistoryView.tsx`
- Create: `src/app/tournaments/[id]/StatsView.tsx`
- Create: `src/app/tournaments/[id]/DecklistModal.tsx`

**Interfaces:**
- Consumes: Server Actions `startTournamentAction`, `nextRoundAction`, `dropTournamentAction`, `updateMatchScoreAction`, `syncMatchFromDuelsAction`.
- Produces: Page `/tournaments/[id]` complète et interactive.

- [ ] **Step 1: Créer `TournamentHeader.tsx`**

Affiche le nom, les badges (Format, Set, Statut), le bouton d'inscription/désinscription pour les membres, et les commandes capitaine : "Lancer le tournoi", "Lancer la ronde suivante" / "Lancer le Top-Cut" lorsque tous les matchs sont terminés.

- [ ] **Step 2: Créer `MatchCard.tsx` et `RoundsView.tsx`**

- `MatchCard.tsx` : Affiche les deux adversaires, le score actuel, le statut de la table. Si le match a une URL Duels.ink, affiche le bouton `Rejoindre sur Duels.ink`. Pour le capitaine, bouton `Éditer score` ouvrant un modal de modification manuelle d'arbitrage. Pour chaque joueur concerné, bouton `Abandonner` avec confirmation.
- `RoundsView.tsx` : Présente les tables de la ronde active et l'arborescence visuelle pour les brackets d'élimination directe.

- [ ] **Step 3: Créer `StandingsView.tsx`**

Tableau complet du classement en direct avec : Rang, Joueur, Points, V-D-N, OMWP %, PGWP %, et badge Forfait si applicable.

- [ ] **Step 4: Créer `HistoryView.tsx` et `DecklistModal.tsx`**

Liste ronde par ronde de toutes les parties jouées. Chaque ligne permet de cliquer pour ouvrir `DecklistModal` afin de voir la decklist complète enregistrée (cartes, encres, coûts) et le lien vers le replay Duels.ink si existant.

- [ ] **Step 5: Créer `StatsView.tsx`**

Affiche les graphiques et cartes de données calculés par `computeTournamentStats` (winrate des encres, decks les plus victorieux, avantage au premier tour).

- [ ] **Step 6: Assembler le tout dans `src/app/tournaments/[id]/page.tsx`**

Gère la navigation par onglets (Matchs en cours, Classement, Historique des matchs, Statistiques) et la synchronisation des données serveur.

---

### Task 9: Vérification Globale & Tests de Bout en Bout

**Files:**
- Test: `src/lib/tournament/__tests__/e2e-tournament-flow.test.ts`

- [ ] **Step 1: Écrire le test d'intégration simulant un tournoi complet de A à Z**

```typescript
// src/lib/tournament/__tests__/e2e-tournament-flow.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { generateSwissRound } from "../swiss";
import { computeStandings } from "../standings";
import { resolveDropForfeits } from "../tournament-lifecycle";

test("Full tournament flow: Swiss rounds, mid-tournament drop, and final standings", () => {
    const players = [
        { id: "u1", name: "Alice", dropped: false },
        { id: "u2", name: "Bob", dropped: false },
        { id: "u3", name: "Charlie", dropped: false },
        { id: "u4", name: "David", dropped: false },
    ];

    // Ronde 1
    const r1 = generateSwissRound(players, [], 1);
    assert.strictEqual(r1.length, 2);

    // Résultats Ronde 1 : Alice bat Bob (2-0), Charlie bat David (2-1)
    const matchesR1 = [
        { roundNumber: 1, p1Id: r1[0].p1Id, p2Id: r1[0].p2Id, p1Score: 2, p2Score: 0, winnerId: r1[0].p1Id, isBye: false },
        { roundNumber: 1, p1Id: r1[1].p1Id, p2Id: r1[1].p2Id, p1Score: 2, p2Score: 1, winnerId: r1[1].p1Id, isBye: false },
    ];

    // David abandonne avant la ronde 2
    players[3].dropped = true;

    // Ronde 2 (3 joueurs actifs -> un Bye doit être attribué au joueur sans Bye)
    const r2 = generateSwissRound(players, matchesR1, 2);
    assert.strictEqual(r2.length, 2); // 1 match + 1 Bye
    const byeMatch = r2.find(m => m.isBye);
    assert.ok(byeMatch);

    // Simulation fin ronde 2
    const matchesR2 = [
        ...matchesR1,
        { roundNumber: 2, p1Id: r2[0].p1Id, p2Id: r2[0].p2Id, p1Score: 2, p2Score: 1, winnerId: r2[0].p1Id, isBye: false },
        { roundNumber: 2, p1Id: byeMatch.p1Id, p2Id: null, p1Score: 2, p2Score: 0, winnerId: byeMatch.p1Id, isBye: true },
    ];

    const finalStandings = computeStandings(players, matchesR2);
    assert.strictEqual(finalStandings.length, 4);
    assert.ok(finalStandings[0].matchPoints >= 6);
    assert.strictEqual(finalStandings.find(s => s.participantId === "u4")!.dropped, true);
});
```

- [ ] **Step 2: Exécuter tous les tests du module de tournois**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npx tsx --test src/lib/tournament/__tests__/*.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Linter le projet et valider la compilation TypeScript**

Run: `PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" npm run build`
Expected: "Compiled successfully"
