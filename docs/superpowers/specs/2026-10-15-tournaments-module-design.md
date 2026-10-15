# Spécification de Conception : Module Tournois LoreTracker

## 1. Contexte et Intention

Le projet **LoreTracker** permet aux équipes de joueurs compétitifs de Disney Lorcana de suivre leurs performances, de synchroniser leurs parties jouées sur [Duels.ink](https://duels.ink) et de consulter statistiques et classements.

L'objectif de cette fonctionnalité est d'ajouter un module complet de **tournois internes d'équipe**. Il permet au capitaine d'organiser des compétitions privées (entraînements, tests de méta, tournois de préparation aux tournois majeurs DLC), de générer automatiquement les salons de match sur Duels.ink via un compte bot organisateur, de synchroniser les résultats et decklists en direct, et d'offrir un espace d'analyse post-tournoi avec statistiques et winrates.

---

## 2. Objectifs, Non-Objectifs & Anti-Objectifs

### Objectifs
- **Page dédiée aux tournois :** Une route `/tournaments` listant les tournois en cours et archivés de l'équipe active, avec un lien dans la barre de navigation.
- **Création par le capitaine :** Interface de paramétrage réservée aux capitaines (rôle `ADMIN`) permettant de configurer :
  - Nom du tournoi et description facultative
  - Format de compétition :
    - *Round Robin* (tous contre tous)
    - *Single Elimination Bracket* (arbre à élimination directe)
    - *Swiss Round* classique (rondes suisses avec classement final direct)
    - *Swiss Round avec Top-Cut* (rondes suisses puis phase finale en arbre à élimination directe, avec taille du Top-Cut choisie par le capitaine : ex. Top 2, Top 4, Top 8)
  - Set de cartes autorisé (ex: Set 14)
  - Format des matchs (BO1, BO3)
  - Règle de decklist : figée pour tout le tournoi ou modifiable entre les rondes
- **Inscriptions d'équipe :** Tout membre de l'équipe active (capitaine inclus) ayant lié son compte Duels.ink peut s'inscrire ou se désinscrire tant que le tournoi n'a pas débuté.
- **Gestion des abandons et exclusions :**
  - Un joueur peut abandonner ou être exclu par le capitaine avant ou pendant le tournoi.
  - En cours de tournoi :
    - Si son match de la ronde actuelle est déjà terminé : le résultat acquis est conservé.
    - Si son match de la ronde actuelle n'est pas terminé ou pas commencé : l'adversaire remporte automatiquement le match 2-0 par forfait (*win by forfeit*).
    - Pour les rondes suivantes : le joueur est totalement exclu des tirages d'appariement.
- **Intégration Duels.ink automatisée (Bot Organisateur) :**
  - Utilisation d'un token d'API personnel de bot organisateur (`DUELS_ORGANIZER_API_KEY`) côté serveur.
  - Dès qu'une ronde est générée, appel à `POST /api/table/create` avec `asSpectator: true` et réservation nominative des sièges pour les deux joueurs via leurs identifiants Duels.ink (`duelsUserId` ou code ami).
  - Mise à disposition d'un lien direct et bouton d'accès vers la room sur chaque carte de match.
  - Récupération et synchronisation automatiques des résultats de fin de match et des decklists jouées.
  - Enregistrement automatique du deck officiel lors du premier match joué si le tournoi impose une decklist figée.
- **Pilotage par le capitaine :** Lancement du tournoi, passage à la ronde suivante (ou à la phase de Top-Cut) une fois tous les matchs de la ronde terminés, et outil d'édition manuelle des scores en cas d'erreur ou de litige.
- **Consultation & Statistiques permanentes :** Tournois conservés en archive pour toute l'équipe avec :
  - Rondes et détails des matchs
  - Classement général (avec calculs officiels de départage suisse OMWP / PGWP / OGWP)
  - Historique des confrontations avec consultation des decklists complètes
  - Onglet statistiques détaillant les winrates des archétypes de deck et des combinaisons de couleurs d'encre sur le tournoi.

### Non-Objectifs
- Tournois publics ou inter-équipes (le module est strictement interne à l'équipe sélectionnée).
- Gestion de cashprize ou système de récompenses monétaires intégré.
- Streaming vidéo ou rediffusion vidéo en temps réel intégrée (seul le lien de match et éventuel replay URL Duels.ink sont conservés).

### Anti-Objectifs (Ce qu'il faut absolument éviter)
- **Blocage du tournoi en cas d'indisponibilité de l'API externe :** Si l'API Duels.ink subit un ralentissement ou une erreur temporaire, le tournoi ne doit jamais être paralysé. Le capitaine doit toujours pouvoir saisir manuellement les résultats pour faire avancer la compétition.
- **Ré-appariement d'un joueur exclu :** Un joueur ayant abandonné ou ayant été expulsé ne doit sous aucun prétexte réapparaître dans les appariements des rondes ultérieures.
- **Écrasement d'une decklist figée :** Si l'option decklist figée est active, les decks enregistrés au match 1 ne doivent pas être altérés par des parties ultérieures.

---

## 3. Architecture Technique & Choix de Conception

### 3.1. Orchestration Duels.ink (Bot Organisateur)
- Une variable d'environnement `DUELS_ORGANIZER_API_KEY` (avec repli possible sur la clé `lorcanaApiKey` d'un capitaine si non définie) est utilisée pour appeler `POST https://duels.ink/api/table/create`.
- Payload de création de table :
  ```json
  {
    "asSpectator": true,
    "players": [player1.duelsUserId, player2.duelsUserId],
    "gameMode": "constructed",
    "matchFormat": "bo3",
    "visibility": "private",
    "timerPreset": "standard"
  }
  ```
- L'URL renvoyée `https://duels.ink/table/{tableId}` est stockée sur le match et permet aux deux joueurs d'entrer directement à leur table.

### 3.2. Récupération des Résultats et Decklists
- Le statut de la table est surveillé via `GET /api/table/{tableId}/view` pour détecter le passage au statut terminé.
- L'action `syncTeamHistory` est étendue pour récupérer les matchs `mode: "private"` dans l'historique `GET /api/me/match-history` des participants. Cela permet de récupérer la decklist complète jouée, le lore final et le replay.
- Si la synchronisation API est retardée, le capitaine peut forcer la validation manuelle du score pour débloquer la ronde.

### 3.3. Règles Métier & Choix du Développeur (Builder Calls)
1. **Application de la règle "Decklist figée" :**
   - Le verrouillage est logique dans LoreTracker : dès la synchronisation de son premier match, la decklist extraite est assignée comme son `officialDecklist` de tournoi.
   - En cas d'avertissement ou de litige (changement de carte non autorisé détecté sur un match suivant), LoreTracker affiche une pastille rouge d'avertissement sur le match pour l'arbitrage du capitaine.
2. **Gestion des Byes & Arbres non-puissance de 2 :**
   - En `SINGLE_ELIMINATION` : si le nombre d'inscrits $N$ n'est pas une puissance de 2 (ex: 5 joueurs pour un arbre de 8), des Byes automatiques (victoires 2-0 sans match) sont attribués au premier tour aux têtes de série supérieures (ou tirage au sort).
   - En `SWISS` : un Bye (victoire 2-0 sans match, 3 points) est attribué au **dernier joueur du classement actuel uniquement si le nombre de joueurs est impair**. **Attention :** un joueur ayant déjà reçu un Bye lors d'une ronde précédente ne peut en aucun cas en recevoir un second ; le Bye est alors attribué au joueur suivant le plus bas n'en ayant jamais bénéficié.
3. **Cas limite Top-Cut :**
   - Si à la fin des rondes suisses le nombre de joueurs actifs non forfaits est inférieur ou égal à la taille configurée du Top-Cut, le bracket est automatiquement ajusté à la puissance de 2 immédiatement inférieure (ex. Top 2 si seulement 3 joueurs restants), ou le classement direct couronne le vainqueur.
4. **Format & Set autorisé :**
   - Le set autorisé (ex: "Set 14") est un tag informatif clair affiché dans l'en-tête du tournoi et sur le formulaire de création.

---

## 4. Parcours Utilisateurs & Fonctionnalités Détaillées

### 4.1. Navigation & Liste des Tournois (`/tournaments`)
- Ajout de l'onglet **Tournois** dans `Navigation.tsx` (desktop et burger mobile).
- La page `/tournaments` affiche deux sections claires :
  1. **Tournois en cours / à venir :** Cartes de tournoi avec statut (`REGISTRATION`, `RUNNING`, `TOP_CUT`), format, set, nombre d'inscrits, bouton d'accès rapide.
  2. **Tournois terminés (Archives) :** Liste des tournois archivés avec date, vainqueur, archétype gagnant et accès aux statistiques.
- Bouton **"Créer un tournoi"** bien visible pour le capitaine.

### 4.2. Création du Tournoi
Le capitaine renseigne :
1. **Nom du tournoi** (ex: *Entraînement #4 - Set 14 Prep*)
2. **Format :** `SWISS`, `SWISS_TOP_CUT` (avec sélection de la taille : 2, 4, 8), `SINGLE_ELIMINATION`, ou `ROUND_ROBIN`.
3. **Format des matchs :** `BO3` (défaut) ou `BO1`.
4. **Set autorisé :** ex. `Set 14` (texte ou sélecteur).
5. **Règle de decklist :** Case à cocher "Autoriser le changement de deck pendant le tournoi" (si décochée, verrouillage automatique après le 1er match joué).
6. **Nombre de rondes :** Pour les formats suisses, calcul automatique suggéré selon les inscrits ($\lceil\log_2(N)\rceil$), ajustable par le capitaine.

### 4.3. Phase d'Inscription & Lobby
- Tout membre de l'équipe peut cliquer sur **"Rejoindre le tournoi"** ou **"Quitter le tournoi"**.
- Le capitaine dispose d'un bouton d'exclusion individuelle à côté de chaque participant.
- Bouton principal du capitaine : **"Lancer le tournoi"** (actif dès que $\ge 2$ joueurs sont inscrits).

### 4.4. Déroulement des Rondes & Matchs
- Dès le lancement, la ronde 1 est créée avec les confrontations correspondantes.
- Pour chaque confrontation :
  - Une room Duels.ink est générée via l'API Duels avec le bot organisateur.
  - La carte du match affiche les deux joueurs, le statut de la partie, un lien cliquable proéminent `Rejoindre sur Duels.ink`, ainsi que le score en direct.
  - Le capitaine a une commande `Modifier le score` (modal pour forcer un résultat 2-0, 2-1 ou valider un forfait).
  - Un joueur peut cliquer sur `Abandonner le tournoi` : cela valide immédiatement une défaite 2-0 sur son match en cours s'il n'est pas encore joué, et le retire des rondes suivantes.
- Dès que toutes les rencontres de la ronde sont complétées :
  - Le statut de la ronde passe à `FINISHED`.
  - Un bouton proéminent s'affiche pour le capitaine : **"Lancer la ronde suivante"** (ou **"Lancer le Top-Cut"** si la phase suisse est achevée).

### 4.5. Phase Finale Top-Cut (si configurée)
- À l'issue de la dernière ronde suisse, les $K$ premiers du classement (selon la taille de Top-Cut paramétrée, ex. 4 joueurs) sont automatiquement insérés dans un bracket à élimination directe (têtes de série classiques : 1 vs 4, 2 vs 3).
- Les matchs de Top-Cut suivent le même système de rooms Duels.ink et d'avancement automatique jusqu'à la finale.

### 4.6. Page de Détail du Tournoi (`/tournaments/[id]`)
Organisée en 4 vues (onglets dynamiques) :
1. **Matchs & Rondes :** Vue de la ronde en cours, affichage des tables, liens Duels.ink, scores, bouton de passage à la ronde suivante. Pour les brackets à élimination directe, affichage visuel de l'arbre.
2. **Classement :** Tableau ordonné avec Rang, Joueur, Points, Victoires/Défaites/Nuls, OMWP %, et statut (Actif / Forfait).
3. **Historique & Decks :** Liste déroulante ronde par ronde de toutes les confrontations, avec bouton d'affichage de la decklist complète des joueurs (cartes, coûts, encres) et lien vers le replay s'il existe.
4. **Statistiques :** Graphiques et métriques d'analyse :
   - Winrate par combinaison d'encres (ex. Ruby/Amethyst, Amber/Steel)
   - Archétypes les plus joués
   - Taux de victoire en ayant le premier tour (*went first*) vs second tour

---

## 5. Ce qui est laissé à l'appréciation du Développeur (Builder)

1. **Modélisation exacte Prisma :** Schémas `Tournament`, `TournamentParticipant`, `TournamentRound`, `TournamentMatch` avec index et contraintes d'intégrité.
2. **Implémentation algorithmique :** Fonctions pures pour les appariements suisses, brackets et départages OMWP.
3. **Composants visuels :** Design ergonomique respectant le thème sombre de l'application (`slate-950`, `sky-500`, etc.).
4. **Revalidation & Rafraîchissement :** Optimisation des requêtes Next.js et revalidations de chemins.
