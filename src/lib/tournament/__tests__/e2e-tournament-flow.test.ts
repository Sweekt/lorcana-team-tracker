// src/lib/tournament/__tests__/e2e-tournament-flow.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { generateSwissRound } from "../swiss";
import { generateSingleEliminationRound } from "../single-elimination";
import { generateRoundRobinRounds } from "../round-robin";
import { computeStandings } from "../standings";
import { computeTournamentStats } from "../stats";
import {
    resolveDropForfeits,
    areAllMatchesFinished,
    calculateDefaultSwissRounds,
} from "../tournament-lifecycle";

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
        { roundNumber: 1, p1Id: r1[0].p1Id, p2Id: r1[0].p2Id, p1Score: 2, p2Score: 0, winnerId: r1[0].p1Id, isBye: false, status: "FINISHED" },
        { roundNumber: 1, p1Id: r1[1].p1Id, p2Id: r1[1].p2Id, p1Score: 2, p2Score: 1, winnerId: r1[1].p1Id, isBye: false, status: "FINISHED" },
    ];

    // David abandonne avant la ronde 2
    players[3].dropped = true;

    // Ronde 2 (3 joueurs actifs -> un Bye doit être attribué au joueur sans Bye)
    const r2 = generateSwissRound(players, matchesR1, 2);
    assert.strictEqual(r2.length, 2); // 1 match + 1 Bye
    const byeMatch = r2.find(m => m.isBye);
    assert.ok(byeMatch);

    // Simulation fin ronde 2
    const regularMatch = r2.find(m => !m.isBye)!;
    const matchesR2 = [
        ...matchesR1,
        { roundNumber: 2, p1Id: regularMatch.p1Id, p2Id: regularMatch.p2Id, p1Score: 2, p2Score: 1, winnerId: regularMatch.p1Id, isBye: false, status: "FINISHED" },
        { roundNumber: 2, p1Id: byeMatch.p1Id, p2Id: null, p1Score: 2, p2Score: 0, winnerId: byeMatch.p1Id, isBye: true, status: "FINISHED" },
    ];

    const finalStandings = computeStandings(players, matchesR2);
    assert.strictEqual(finalStandings.length, 4);
    assert.ok(finalStandings[0].matchPoints >= 6);
    assert.strictEqual(finalStandings.find(s => s.participantId === "u4")!.dropped, true);
    assert.strictEqual(areAllMatchesFinished(matchesR2), true);
});

test("E2E Swiss: 6 players realistic tournament with mid-round drop forfeit and tie-breakers", () => {
    const players = [
        { id: "p1", name: "Alice", dropped: false },
        { id: "p2", name: "Bob", dropped: false },
        { id: "p3", name: "Charlie", dropped: false },
        { id: "p4", name: "Diana", dropped: false },
        { id: "p5", name: "Eve", dropped: false },
        { id: "p6", name: "Frank", dropped: false },
    ];

    // Vérification du nombre de rondes recommandées pour 6 joueurs (3 rondes)
    assert.strictEqual(calculateDefaultSwissRounds(players.length), 3);

    // --- RONDE 1 ---
    const r1Pairings = generateSwissRound(players, [], 1);
    assert.strictEqual(r1Pairings.length, 3);
    assert.ok(r1Pairings.every(m => !m.isBye));

    // Simulation Ronde 1 :
    // Table 1: p1 gagne 2-0 contre p2
    // Table 2: p3 gagne 2-1 contre p4
    // Table 3: en cours quand Frank (p6) abandonne précipitamment en cours de partie
    let r1Matches = [
        { id: "m1", roundNumber: 1, p1Id: r1Pairings[0].p1Id, p2Id: r1Pairings[0].p2Id, p1Score: 2, p2Score: 0, winnerId: r1Pairings[0].p1Id, isBye: false, status: "FINISHED", isForfeit: false },
        { id: "m2", roundNumber: 1, p1Id: r1Pairings[1].p1Id, p2Id: r1Pairings[1].p2Id, p1Score: 2, p2Score: 1, winnerId: r1Pairings[1].p1Id, isBye: false, status: "FINISHED", isForfeit: false },
        { id: "m3", roundNumber: 1, p1Id: r1Pairings[2].p1Id, p2Id: r1Pairings[2].p2Id, p1Score: 0, p2Score: 0, winnerId: null, isBye: false, status: "IN_PROGRESS", isForfeit: false },
    ];

    // Frank abandonne en cours de partie -> résolution du forfait automatique
    const frank = players.find(p => p.id === "p6")!;
    frank.dropped = true;

    // resolveDropForfeits attribue une victoire 2-0 à l'adversaire de Frank
    r1Matches = resolveDropForfeits(r1Matches, "p6");
    assert.strictEqual(r1Matches[2].status, "FINISHED");
    assert.strictEqual(r1Matches[2].isForfeit, true);
    assert.ok(r1Matches[2].winnerId !== "p6");
    assert.strictEqual(areAllMatchesFinished(r1Matches), true);

    // --- RONDE 2 ---
    // 5 joueurs actifs -> attribution d'un Bye automatique au joueur le plus bas au classement
    const r2Pairings = generateSwissRound(players, r1Matches, 2);
    assert.strictEqual(r2Pairings.length, 3); // 2 matchs + 1 Bye
    const byeMatchR2 = r2Pairings.find(m => m.isBye);
    assert.ok(byeMatchR2);
    assert.strictEqual(byeMatchR2.p2Id, null);

    // Les participants exclus comprennent bien le joueur ayant abandonné
    const activeParticipantsInR2 = r2Pairings.flatMap(m => [m.p1Id, m.p2Id]).filter(Boolean);
    assert.ok(!activeParticipantsInR2.includes("p6"));

    // Simulation des résultats de la Ronde 2
    const regularR2 = r2Pairings.filter(m => !m.isBye);
    const r2Matches = [
        ...r1Matches,
        { id: "m4", roundNumber: 2, p1Id: regularR2[0].p1Id, p2Id: regularR2[0].p2Id, p1Score: 2, p2Score: 0, winnerId: regularR2[0].p1Id, isBye: false, status: "FINISHED" },
        { id: "m5", roundNumber: 2, p1Id: regularR2[1].p1Id, p2Id: regularR2[1].p2Id, p1Score: 2, p2Score: 1, winnerId: regularR2[1].p1Id, isBye: false, status: "FINISHED" },
        { id: "m6", roundNumber: 2, p1Id: byeMatchR2.p1Id, p2Id: null, p1Score: 2, p2Score: 0, winnerId: byeMatchR2.p1Id, isBye: true, status: "FINISHED" },
    ];

    // --- RONDE 3 ---
    // Ronde finale : le joueur ayant déjà eu un Bye ne peut pas en recevoir un second
    const r3Pairings = generateSwissRound(players, r2Matches, 3);
    assert.strictEqual(r3Pairings.length, 3); // 2 matchs + 1 Bye
    const byeMatchR3 = r3Pairings.find(m => m.isBye);
    assert.ok(byeMatchR3);
    assert.notStrictEqual(byeMatchR3.p1Id, byeMatchR2.p1Id); // Aucun joueur ne reçoit 2 Byes

    const regularR3 = r3Pairings.filter(m => !m.isBye);
    const allMatches = [
        ...r2Matches,
        { id: "m7", roundNumber: 3, p1Id: regularR3[0].p1Id, p2Id: regularR3[0].p2Id, p1Score: 2, p2Score: 1, winnerId: regularR3[0].p1Id, isBye: false, status: "FINISHED" },
        { id: "m8", roundNumber: 3, p1Id: regularR3[1].p1Id, p2Id: regularR3[1].p2Id, p1Score: 2, p2Score: 0, winnerId: regularR3[1].p1Id, isBye: false, status: "FINISHED" },
        { id: "m9", roundNumber: 3, p1Id: byeMatchR3.p1Id, p2Id: null, p1Score: 2, p2Score: 0, winnerId: byeMatchR3.p1Id, isBye: true, status: "FINISHED" },
    ];

    // Vérification du classement final
    const standings = computeStandings(players, allMatches);
    assert.strictEqual(standings.length, 6);
    assert.strictEqual(standings[0].rank, 1);
    assert.ok(standings[0].matchPoints >= standings[1].matchPoints);

    // Vérifier les tie-breakers calculés
    for (const row of standings) {
        assert.ok(row.omwp >= 0.33);
        assert.ok(row.pgwp >= 0 && row.pgwp <= 1);
        assert.ok(row.ogwp >= 0 && row.ogwp <= 1);
    }

    // Frank est bien classé dernier ou marqué dropped
    const frankRow = standings.find(s => s.participantId === "p6")!;
    assert.strictEqual(frankRow.dropped, true);
});

test("E2E Single Elimination: 5 players (non-power of 2), 3 round 1 Byes, semi-finals, finals, and champion coronation", () => {
    // Tournoi à 5 joueurs avec têtes de série (seeds 1 à 5)
    const players = [
        { id: "s1", name: "Aladdin", seed: 1, dropped: false },
        { id: "s2", name: "Belle", seed: 2, dropped: false },
        { id: "s3", name: "Cinderella", seed: 3, dropped: false },
        { id: "s4", name: "Donald", seed: 4, dropped: false },
        { id: "s5", name: "Elsa", seed: 5, dropped: false },
    ];

    // --- RONDE 1 : Arbre de 8, 3 Byes pour les seeds 1, 2, 3 ---
    const r1Matches = generateSingleEliminationRound(players, 1, []);
    assert.strictEqual(r1Matches.length, 4); // 4 tables dans un arbre de 8

    // 3 Byes attribués
    const r1Byes = r1Matches.filter(m => m.isBye);
    assert.strictEqual(r1Byes.length, 3);
    const byePlayerIds = r1Byes.map(m => m.p1Id).sort();
    assert.deepStrictEqual(byePlayerIds, ["s1", "s2", "s3"]);

    // Le seul match disputé oppose la tête de série 4 à la tête de série 5
    const r1Game = r1Matches.find(m => !m.isBye)!;
    assert.ok(
        (r1Game.p1Id === "s4" && r1Game.p2Id === "s5") ||
        (r1Game.p1Id === "s5" && r1Game.p2Id === "s4")
    );

    // Enregistrement des résultats de Ronde 1 : Donald (s4) bat Elsa (s5) 2-1
    const completedR1 = r1Matches.map(m => {
        if (m.isBye) {
            return {
                ...m,
                p1Score: 2,
                p2Score: 0,
                winnerId: m.p1Id,
                status: "FINISHED" as const,
            };
        }
        return {
            ...m,
            p1Score: 2,
            p2Score: 1,
            winnerId: "s4",
            status: "FINISHED" as const,
        };
    });

    // --- RONDE 2 : Demi-finales (Semi-Finals) ---
    const r2Matches = generateSingleEliminationRound(players, 2, completedR1);
    assert.strictEqual(r2Matches.length, 2); // 2 demi-finales
    assert.ok(r2Matches.every(m => !m.isBye)); // Aucun Bye en demi-finale !

    // La demi-finale 1 oppose le vainqueur de la Table 1 (s1) au vainqueur de la Table 2 (s4)
    // La demi-finale 2 oppose le vainqueur de la Table 3 (s2) au vainqueur de la Table 4 (s3)
    const semi1 = r2Matches.find(m => m.tableNumber === 1)!;
    const semi2 = r2Matches.find(m => m.tableNumber === 2)!;

    const semi1Players = [semi1.p1Id, semi1.p2Id].sort();
    const semi2Players = [semi2.p1Id, semi2.p2Id].sort();
    assert.deepStrictEqual(semi1Players, ["s1", "s4"]);
    assert.deepStrictEqual(semi2Players, ["s2", "s3"]);

    // Résultats des demi-finales :
    // s1 bat s4 (2-0)
    // s2 bat s3 (2-1)
    const completedR2 = [
        {
            ...semi1,
            p1Score: semi1.p1Id === "s1" ? 2 : 0,
            p2Score: semi1.p1Id === "s1" ? 0 : 2,
            winnerId: "s1",
            status: "FINISHED" as const,
        },
        {
            ...semi2,
            p1Score: semi2.p1Id === "s2" ? 2 : 1,
            p2Score: semi2.p1Id === "s2" ? 1 : 2,
            winnerId: "s2",
            status: "FINISHED" as const,
        },
    ];

    // --- RONDE 3 : Grande Finale ---
    const allMatchesBeforeFinal = [...completedR1, ...completedR2];
    const r3Matches = generateSingleEliminationRound(players, 3, allMatchesBeforeFinal);
    assert.strictEqual(r3Matches.length, 1); // 1 grande finale

    const finalMatch = r3Matches[0];
    const finalPlayers = [finalMatch.p1Id, finalMatch.p2Id].sort();
    assert.deepStrictEqual(finalPlayers, ["s1", "s2"]);

    // Résultat de la Grande Finale : Aladdin (s1) bat Belle (s2) 2-1
    const completedR3 = [
        {
            ...finalMatch,
            p1Score: finalMatch.p1Id === "s1" ? 2 : 1,
            p2Score: finalMatch.p1Id === "s1" ? 1 : 2,
            winnerId: "s1",
            status: "FINISHED" as const,
        },
    ];

    // Couronnement du Champion
    const tournamentMatches = [...allMatchesBeforeFinal, ...completedR3];
    assert.strictEqual(areAllMatchesFinished(tournamentMatches), true);
    assert.strictEqual(completedR3[0].winnerId, "s1"); // Aladdin sacré Champion !
});

test("E2E Round Robin: 4 players league, full scheduling, match completion, and standings", () => {
    const players = [
        { id: "rr1", name: "Elsa", dropped: false },
        { id: "rr2", name: "Anna", dropped: false },
        { id: "rr3", name: "Kristoff", dropped: false },
        { id: "rr4", name: "Olaf", dropped: false },
    ];

    // Génération de l'intégralité du calendrier des rondes (Berger tables)
    const schedule = generateRoundRobinRounds(players);
    // 4 joueurs pairs -> exactement 3 rondes de 2 matchs chacune
    assert.strictEqual(schedule.length, 3);
    for (const round of schedule) {
        assert.strictEqual(round.length, 2);
        assert.ok(round.every(m => !m.isBye));
    }

    // Vérifier que chaque paire de joueurs s'affronte exactement une seule fois
    const matchups = new Set<string>();
    for (const round of schedule) {
        for (const match of round) {
            const key = [match.p1Id, match.p2Id].sort().join("::");
            assert.ok(!matchups.has(key), `Confrontation dupliquée détectée : ${key}`);
            matchups.add(key);
        }
    }
    // C(4, 2) = 6 matchs uniques
    assert.strictEqual(matchups.size, 6);

    // Simulation de l'issue de tous les matchs :
    // Elsa (rr1) gagne tous ses matchs (3 victoires)
    // Anna (rr2) gagne 2 matchs (perd contre Elsa)
    // Kristoff (rr3) gagne 1 match (perd contre Elsa et Anna)
    // Olaf (rr4) perd tous ses matchs (0 victoire)
    const completedMatches = schedule.flatMap(round => {
        return round.map(match => {
            const p1 = match.p1Id;
            const p2 = match.p2Id!;

            let winnerId = p1;
            let p1Score = 2;
            let p2Score = 0;

            const rankPriority: Record<string, number> = {
                rr1: 4,
                rr2: 3,
                rr3: 2,
                rr4: 1,
            };

            if (rankPriority[p2] > rankPriority[p1]) {
                winnerId = p2;
                p1Score = 0;
                p2Score = 2;
            }

            return {
                roundNumber: match.roundNumber ?? 1,
                p1Id: p1,
                p2Id: p2,
                p1Score,
                p2Score,
                winnerId,
                isBye: false,
                status: "FINISHED" as const,
            };
        });
    });

    assert.strictEqual(completedMatches.length, 6);
    assert.strictEqual(areAllMatchesFinished(completedMatches), true);

    // Calcul du classement de la ligue
    const standings = computeStandings(players, completedMatches);
    assert.strictEqual(standings.length, 4);

    // Elsa est 1ère avec 9 points (3-0)
    assert.strictEqual(standings[0].participantId, "rr1");
    assert.strictEqual(standings[0].rank, 1);
    assert.strictEqual(standings[0].matchPoints, 9);
    assert.strictEqual(standings[0].wins, 3);

    // Anna est 2ème avec 6 points (2-1)
    assert.strictEqual(standings[1].participantId, "rr2");
    assert.strictEqual(standings[1].rank, 2);
    assert.strictEqual(standings[1].matchPoints, 6);
    assert.strictEqual(standings[1].wins, 2);

    // Kristoff est 3ème avec 3 points (1-2)
    assert.strictEqual(standings[2].participantId, "rr3");
    assert.strictEqual(standings[2].rank, 3);
    assert.strictEqual(standings[2].matchPoints, 3);
    assert.strictEqual(standings[2].wins, 1);

    // Olaf est 4ème avec 0 points (0-3)
    assert.strictEqual(standings[3].participantId, "rr4");
    assert.strictEqual(standings[3].rank, 4);
    assert.strictEqual(standings[3].matchPoints, 0);
    assert.strictEqual(standings[3].wins, 0);
});

test("E2E Tournament Statistics: aggregates winrates by ink combination, went-first toss rate, and games decided", () => {
    // 6 matchs réalistes avec archétypes de decks et données de toss (wentFirstWinner)
    const matches = [
        {
            p1Id: "p1",
            p2Id: "p2",
            p1DeckColors: ["Ruby", "Amethyst"],
            p2DeckColors: ["Amber", "Steel"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "p1",
            wentFirstWinner: true,
            status: "FINISHED",
        },
        {
            p1Id: "p3",
            p2Id: "p4",
            p1DeckColors: ["Ruby", "Sapphire"],
            p2DeckColors: ["Emerald", "Steel"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p3",
            wentFirstWinner: false,
            status: "FINISHED",
        },
        {
            p1Id: "p1",
            p2Id: "p3",
            p1DeckColors: ["Ruby", "Amethyst"],
            p2DeckColors: ["Ruby", "Sapphire"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p1",
            wentFirstWinner: true,
            status: "FINISHED",
        },
        {
            p1Id: "p2",
            p2Id: "p4",
            p1DeckColors: ["Amber", "Steel"],
            p2DeckColors: ["Emerald", "Steel"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "p2",
            wentFirstWinner: true,
            status: "FINISHED",
        },
        {
            p1Id: "p1",
            p2Id: "p2",
            p1DeckColors: ["Ruby", "Amethyst"],
            p2DeckColors: ["Amber", "Steel"],
            p1Score: 2,
            p2Score: 1,
            winnerId: "p1",
            wentFirstWinner: true,
            status: "FINISHED",
        },
        {
            p1Id: "p3",
            p2Id: "p4",
            p1DeckColors: ["Ruby", "Sapphire"],
            p2DeckColors: ["Emerald", "Steel"],
            p1Score: 2,
            p2Score: 0,
            winnerId: "p3",
            wentFirstWinner: false,
            status: "FINISHED",
        },
    ];

    const stats = computeTournamentStats(matches);

    // Nombre total de matchs et manches décidées
    assert.strictEqual(stats.totalMatches, 6);
    // (2+1) + (2+0) + (2+0) + (2+1) + (2+1) + (2+0) = 3 + 2 + 2 + 3 + 3 + 2 = 15
    assert.strictEqual(stats.totalGamesDecided, 15);

    // Statistiques Went First / Toss
    assert.strictEqual(stats.wentFirst.totalGames, 6);
    assert.strictEqual(stats.wentFirst.firstPlayerWins, 4);
    assert.strictEqual(stats.wentFirst.secondPlayerWins, 2);
    // 4 / 6 = 67%
    assert.strictEqual(stats.wentFirst.firstPlayerWinrate, 67);
    assert.strictEqual(stats.wentFirstRate, 67);
    // 2 / 6 = 33%
    assert.strictEqual(stats.wentFirst.secondPlayerWinrate, 33);

    // Statistiques par archétype d'encres
    assert.strictEqual(stats.inkCombos.length, 4);

    // Ordre de tri officiel : matchesPlayed DESC, puis matchWinrate DESC
    // Ruby / Amethyst : 3 joués, 3 gagnés (100%)
    const rubyAmethyst = stats.inkCombos.find(c => c.name === "Ruby / Amethyst")!;
    assert.ok(rubyAmethyst);
    assert.strictEqual(rubyAmethyst.matchesPlayed, 3);
    assert.strictEqual(rubyAmethyst.matchesWon, 3);
    assert.strictEqual(rubyAmethyst.matchWinrate, 100);

    // Ruby / Sapphire : 3 joués, 2 gagnés (67%)
    const rubySapphire = stats.inkCombos.find(c => c.name === "Ruby / Sapphire")!;
    assert.ok(rubySapphire);
    assert.strictEqual(rubySapphire.matchesPlayed, 3);
    assert.strictEqual(rubySapphire.matchesWon, 2);
    assert.strictEqual(rubySapphire.matchWinrate, 67);

    // Amber / Steel : 3 joués, 1 gagné (33%)
    const amberSteel = stats.inkCombos.find(c => c.name === "Amber / Steel")!;
    assert.ok(amberSteel);
    assert.strictEqual(amberSteel.matchesPlayed, 3);
    assert.strictEqual(amberSteel.matchesWon, 1);
    assert.strictEqual(amberSteel.matchWinrate, 33);

    // Emerald / Steel : 3 joués, 0 gagné (0%)
    const emeraldSteel = stats.inkCombos.find(c => c.name === "Emerald / Steel")!;
    assert.ok(emeraldSteel);
    assert.strictEqual(emeraldSteel.matchesPlayed, 3);
    assert.strictEqual(emeraldSteel.matchesWon, 0);
    assert.strictEqual(emeraldSteel.matchWinrate, 0);

    // Vérifier l'ordre dans le tableau
    assert.strictEqual(stats.inkCombos[0].name, "Ruby / Amethyst");
    assert.strictEqual(stats.inkCombos[1].name, "Ruby / Sapphire");
    assert.strictEqual(stats.inkCombos[2].name, "Amber / Steel");
    assert.strictEqual(stats.inkCombos[3].name, "Emerald / Steel");
});

test("E2E Swiss into Top Cut Single Elimination: 8 players Swiss, Top 4 playoff cut and grand champion", () => {
    const players = [
        { id: "p1", name: "Player 1", seed: 1, dropped: false },
        { id: "p2", name: "Player 2", seed: 2, dropped: false },
        { id: "p3", name: "Player 3", seed: 3, dropped: false },
        { id: "p4", name: "Player 4", seed: 4, dropped: false },
        { id: "p5", name: "Player 5", seed: 5, dropped: false },
        { id: "p6", name: "Player 6", seed: 6, dropped: false },
        { id: "p7", name: "Player 7", seed: 7, dropped: false },
        { id: "p8", name: "Player 8", seed: 8, dropped: false },
    ];

    // Phase 1 : 3 rondes suisses
    let allSwissMatches: any[] = [];
    for (let roundNum = 1; roundNum <= 3; roundNum++) {
        const roundPairings = generateSwissRound(players, allSwissMatches, roundNum);
        assert.strictEqual(roundPairings.length, 4);

        const roundMatches = roundPairings.map((pairing, idx) => {
            // Déterminer un gagnant déterministe favorisant les seeds inférieurs
            const p1Seed = Number(pairing.p1Id.replace("p", ""));
            const p2Seed = Number(pairing.p2Id!.replace("p", ""));
            const winnerId = p1Seed < p2Seed ? pairing.p1Id : pairing.p2Id!;

            return {
                id: `swiss_r${roundNum}_m${idx + 1}`,
                roundNumber: roundNum,
                tableNumber: pairing.tableNumber,
                p1Id: pairing.p1Id,
                p2Id: pairing.p2Id,
                p1Score: winnerId === pairing.p1Id ? 2 : 0,
                p2Score: winnerId === pairing.p2Id ? 2 : 0,
                winnerId,
                isBye: false,
                status: "FINISHED",
            };
        });
        allSwissMatches.push(...roundMatches);
    }

    assert.strictEqual(allSwissMatches.length, 12);
    const swissStandings = computeStandings(players, allSwissMatches);
    assert.strictEqual(swissStandings.length, 8);

    // Extraction du Top 4 Cut
    const top4Cut = swissStandings.slice(0, 4);
    assert.strictEqual(top4Cut.length, 4);

    // Conversion en participants pour le Top Cut avec seed = rank
    const topCutParticipants = top4Cut.map(s => ({
        id: s.participantId,
        seed: s.rank,
        dropped: false,
    }));

    // Demi-finales (Round 1 du Top Cut)
    const semiPairings = generateSingleEliminationRound(topCutParticipants, 1, []);
    assert.strictEqual(semiPairings.length, 2);
    assert.ok(semiPairings.every(m => !m.isBye));

    // Simulation des demi-finales : Seed 1 et Seed 2 se qualifient pour la finale
    const semiMatches = semiPairings.map((match, idx) => {
        const s1 = topCutParticipants.find(p => p.id === match.p1Id)!.seed!;
        const s2 = topCutParticipants.find(p => p.id === match.p2Id)!.seed!;
        const winnerId = s1 < s2 ? match.p1Id : match.p2Id!;

        return {
            id: `topcut_semi_${idx + 1}`,
            roundNumber: 1,
            tableNumber: match.tableNumber,
            p1Id: match.p1Id,
            p2Id: match.p2Id,
            p1Score: winnerId === match.p1Id ? 2 : 1,
            p2Score: winnerId === match.p2Id ? 2 : 1,
            winnerId,
            status: "FINISHED" as const,
            isBye: false,
        };
    });

    // Finale du Top Cut (Round 2)
    const finalPairing = generateSingleEliminationRound(topCutParticipants, 2, semiMatches);
    assert.strictEqual(finalPairing.length, 1);

    const grandFinal = {
        id: "topcut_final",
        roundNumber: 2,
        tableNumber: 1,
        p1Id: finalPairing[0].p1Id,
        p2Id: finalPairing[0].p2Id,
        p1Score: 2,
        p2Score: 0,
        winnerId: finalPairing[0].p1Id,
        status: "FINISHED" as const,
        isBye: false,
    };

    assert.strictEqual(grandFinal.winnerId, top4Cut[0].participantId);
    assert.strictEqual(areAllMatchesFinished([...semiMatches, grandFinal]), true);
});
