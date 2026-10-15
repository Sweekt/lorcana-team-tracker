# Plan d'Implémentation : Intégration OAuth Duels.ink (Account Linking)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux joueurs de lier leur compte Duels.ink en un clic via OAuth 2.0 PKCE pour synchroniser leurs matchs, tout en garantissant une rétrocompatibilité complète avec les clés API manuelles existantes.

**Architecture:** Discord demeure le fournisseur d'authentification principal du tracker. Duels.ink intervient comme liaison de compte (« Account Linking ») : une route démarre le flux PKCE (`/api/oauth/duels/start`), Duels.ink renvoie un code au callback (`/api/oauth/duels/callback`), le serveur échange le code contre un token d'accès (`duelsAccessToken`) et l'identifiant stable (`duelsUserId`). Le moteur de synchronisation donne la priorité au token OAuth et bascule sur l'ancienne clé en secours.

**Tech Stack:** Next.js (App Router, Server Actions, Route Handlers), NextAuth.js, Prisma ORM (PostgreSQL), TypeScript, Node.js crypto, Node.js built-in test runner (`node:test`, `node:assert`).

**Spec:** [`docs/superpowers/specs/2026-10-15-duelsink-auth-design.md`](file:///home/sweek/lorcana-team-tracker/docs/superpowers/specs/2026-10-15-duelsink-auth-design.md)

## Global Constraints

- Confidential Server App : `DUELS_CLIENT_SECRET` ne quitte jamais le serveur.
- Exact redirect URI matching : `http://localhost:3000/api/oauth/duels/callback` (dev) ou `https://<domaine>/api/oauth/duels/callback` (prod).
- Scopes demandés : `profile match_history:read`.
- Durée de validité demandée : `expires_in_days=365`.
- Rétrocompatibilité : Les utilisateurs ayant une `lorcanaApiKey` existante continuent de synchroniser leurs parties sans interruption.
- Transfert de collision : Lier un compte Duels.ink déjà présent détache l'ancien utilisateur et rattache le nouveau sans erreur.

## Review Focus

1. **Révocation distante ou 401** : Si un token OAuth est révoqué sur Duels.ink, la synchro reçoit 401, marque `duelsTokenExpiresAt = new Date(0)`, et bascule sur `lorcanaApiKey` si disponible.
2. **Annulation utilisateur (`error=access_denied`)** : Si le joueur clique sur Annuler sur la page de consentement, le callback redirige proprement vers `/settings` avec un message d'information sans crasher.
3. **Collision de compte** : Lier un compte Duels.ink déjà associé à un autre profil transfère atomiquement les identifiants vers l'utilisateur actif.
4. **Expiration temporelle** : Un token dont `duelsTokenExpiresAt <= now` est ignoré par le sélecteur de token au profit de `lorcanaApiKey` ou déclenche l'affichage du statut expiré.
5. **Priorité de token** : Un utilisateur disposant à la fois d'un token OAuth valide et d'une clé `lorcanaApiKey` utilise systématiquement le token OAuth pour ses requêtes.

---

### Task 1: Schéma Prisma et Migration de Base de Données

**Files:**
- Modify: `prisma/schema.prisma:13-30`

**Interfaces:**
- Produces: Nouveaux champs sur `User` (`duelsUserId`, `duelsUsername`, `duelsAccessToken`, `duelsTokenExpiresAt`).

- [ ] **Step 1: Mettre à jour le modèle `User` dans `prisma/schema.prisma`**

Ajouter les champs optionnels sous `lorcanaApiKey` :
```prisma
  duelsUserId          String?
  duelsUsername        String?
  duelsAccessToken     String?   @db.Text
  duelsTokenExpiresAt  DateTime?
```

- [ ] **Step 2: Appliquer les modifications au schéma et régénérer le client Prisma**

Exécuter :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && npx prisma db push && npx prisma generate
```
Vérifier : `Your database is now in sync with your Prisma schema` et `Generated Prisma Client`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add duels.ink oauth fields to User model"
```

---

### Task 2: Module Utilitaires OAuth Duels.ink (`src/lib/duels-oauth.ts`)

**Files:**
- Create: `src/lib/duels-oauth.ts`
- Test: `src/lib/__tests__/duels-oauth.test.ts`

**Interfaces:**
- Produces:
  - `generatePkcePair(): { verifier: string; challenge: string }`
  - `generateOAuthState(): string`
  - `buildDuelsAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string; challenge: string; expiresInDays?: number }): string`
  - `exchangeDuelsCode(params: { code: string; verifier: string; clientId: string; clientSecret: string; redirectUri: string; fetchFn?: typeof fetch }): Promise<{ accessToken: string; expiresIn: number; scope: string; user: { id: string; name: string } }>`
  - `resolveEffectiveToken(user: { duelsAccessToken?: string | null; duelsTokenExpiresAt?: Date | null; lorcanaApiKey?: string | null }, now?: Date): { token: string | null; isOAuth: boolean }`

- [ ] **Step 1: Écrire les tests unitaires pour le module OAuth dans `src/lib/__tests__/duels-oauth.test.ts`**

Tester :
1. `generatePkcePair` produit un verifier (43 chars base64url) et un challenge sha256 base64url sans padding.
2. `generateOAuthState` produit une chaîne aléatoire (min 16 chars).
3. `buildDuelsAuthorizeUrl` construit l'URL exacte avec `response_type=code`, `code_challenge_method=S256`, `scope=profile match_history:read`.
4. `resolveEffectiveToken` choisit le token OAuth si valide, bascule sur `lorcanaApiKey` si expiré ou absent, et renvoie null si aucun des deux.
5. `exchangeDuelsCode` gère le succès et les erreurs HTTP.

- [ ] **Step 2: Lancer les tests pour vérifier l'échec initial**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test src/lib/__tests__/duels-oauth.test.ts
```
Expected : FAIL (module non trouvé).

- [ ] **Step 3: Implémenter `src/lib/duels-oauth.ts`**

Implémenter les fonctions pures en utilisant `node:crypto` (`randomBytes`, `createHash`).

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test src/lib/__tests__/duels-oauth.test.ts
```
Expected : PASS (tous les tests verts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/duels-oauth.ts src/lib/__tests__/duels-oauth.test.ts
git commit -m "feat(auth): add duels.ink oauth and token resolution helpers"
```

---

### Task 3: Routes API OAuth et Actions Utilisateur

**Files:**
- Create: `src/app/api/oauth/duels/start/route.ts`
- Create: `src/app/api/oauth/duels/callback/route.ts`
- Modify: `src/actions/user.ts`
- Test: `src/lib/__tests__/duels-routes.test.ts`

**Interfaces:**
- Consumes: `src/lib/duels-oauth.ts`, `authOptions`
- Produces:
  - Route `GET /api/oauth/duels/start` (initie le flux, pose le cookie `duels_oauth_state`, redirige)
  - Route `GET /api/oauth/duels/callback` (valide l'état, échange le code, transfère atomiquement le compte en base, nettoie le cookie)
  - Action `disconnectDuelsAccount(): Promise<{ success: boolean; message?: string }>` dans `src/actions/user.ts`

- [ ] **Step 1: Écrire le test unitaire pour la logique de transfert de compte en cas de collision**

Créer `src/lib/__tests__/duels-routes.test.ts` testant la fonction de transfert :
Vérifier que si un `duelsUserId` appartient déjà à `UserA`, l'association à `UserB` remet à null les champs Duels de `UserA` et remplit ceux de `UserB`.

- [ ] **Step 2: Vérifier l'échec du test**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test src/lib/__tests__/duels-routes.test.ts
```

- [ ] **Step 3: Implémenter `src/app/api/oauth/duels/start/route.ts`**

- Vérifie `getServerSession(authOptions)`. Si non connecté -> redirect `/login`.
- Génère `state` et PKCE via `generateOAuthState()` et `generatePkcePair()`.
- Stocke `{ state, verifier }` dans un cookie HTTP-only sécurisé `duels_oauth_state` (maxAge: 600s).
- Redirige vers `buildDuelsAuthorizeUrl(...)`.

- [ ] **Step 4: Implémenter `src/app/api/oauth/duels/callback/route.ts`**

- Vérifie la session.
- Lit le cookie `duels_oauth_state` et compare avec le paramètre `state`.
- Si `error=access_denied`, redirige vers `/settings?duels_cancelled=true`.
- Si erreur ou code manquant, redirige vers `/settings?duels_error=invalid_request`.
- Appelle `exchangeDuelsCode(...)`.
- Exécute la transaction Prisma de transfert atomique :
  ```typescript
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { duelsUserId: duelsUser.id, NOT: { id: sessionUser.id } },
      data: { duelsUserId: null, duelsUsername: null, duelsAccessToken: null, duelsTokenExpiresAt: null }
    }),
    prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        duelsUserId: duelsUser.id,
        duelsUsername: duelsUser.name,
        duelsAccessToken: tokenData.accessToken,
        duelsTokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000)
      }
    })
  ]);
  ```
- Supprime le cookie et redirige vers `/settings?duels_linked=true`.

- [ ] **Step 5: Ajouter `disconnectDuelsAccount()` dans `src/actions/user.ts`**

Remet à null `duelsUserId`, `duelsUsername`, `duelsAccessToken`, `duelsTokenExpiresAt` pour l'utilisateur de la session.

- [ ] **Step 6: Vérifier les tests**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test src/lib/__tests__/duels-routes.test.ts
```
Expected : PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/oauth/duels/start/route.ts src/app/api/oauth/duels/callback/route.ts src/actions/user.ts src/lib/__tests__/duels-routes.test.ts
git commit -m "feat(auth): implement duels.ink oauth start, callback, and disconnect handlers"
```

---

### Task 4: Mise à Jour du Moteur de Synchronisation (`src/actions/sync.ts`)

**Files:**
- Modify: `src/actions/sync.ts`
- Test: `src/lib/__tests__/sync-token.test.ts`

**Interfaces:**
- Consumes: `src/lib/duels-oauth.ts` (`resolveEffectiveToken`)
- Updates: `syncTeamHistory(targetUserId?: string)`

- [ ] **Step 1: Écrire les tests unitaires pour la gestion des erreurs 401 et la sélection de token**

Créer `src/lib/__tests__/sync-token.test.ts` :
1. Teste qu'un utilisateur avec token OAuth expiré et clé manuelle sélectionne la clé manuelle.
2. Teste que lors d'une 401 sur token OAuth, la base est mise à jour avec `duelsTokenExpiresAt = new Date(0)` et que le fallback est tenté.

- [ ] **Step 2: Vérifier l'échec initial du test**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test src/lib/__tests__/sync-token.test.ts
```

- [ ] **Step 3: Mettre à jour `src/actions/sync.ts`**

1. Élargir `usersToSync` :
   ```typescript
   OR: [
     { duelsAccessToken: { not: null } },
     { lorcanaApiKey: { not: null } }
   ]
   ```
2. Pour chaque joueur :
   - Sélectionner le token actif avec `resolveEffectiveToken(user)`.
   - Si aucun token valide, passer au joueur suivant.
   - Ajouter `source=matchmaking` et `limit=250` dans les query params :
     `url.searchParams.set("source", "matchmaking");`
     `url.searchParams.set("limit", "250");`
   - Si `response.status === 401` et que le token utilisé était `duelsAccessToken` :
     - Mettre à jour en base : `await prisma.user.update({ where: { id: user.id }, data: { duelsTokenExpiresAt: new Date(0) } });`
     - Si `user.lorcanaApiKey` existe, retenter immédiatement la requête avec cette clé manuelle.

- [ ] **Step 4: Lancer les tests**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test src/lib/__tests__/sync-token.test.ts
```
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/actions/sync.ts src/lib/__tests__/sync-token.test.ts
git commit -m "feat(sync): support duels.ink oauth token priority, 401 fallback, and query optimization"
```

---

### Task 5: Interface Utilisateur (Profil & Paramètres d'Équipe)

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/settings/ProfileForm.tsx`
- Modify: `src/app/team/settings/page.tsx`
- Modify: `src/app/team/settings/TeamSettingsForm.tsx`

**Interfaces:**
- Consumes: `disconnectDuelsAccount`
- Produces: Composants UI réactifs avec gestion des états (🟢 Lié, 🟡 Clé manuelle, 🟠 Expiré, 🔴 Non synchronisé).

- [ ] **Step 1: Mettre à jour `src/app/settings/page.tsx`**

Sélectionner les nouveaux champs sur `userFromDb` :
`duelsUserId`, `duelsUsername`, `duelsAccessToken`, `duelsTokenExpiresAt`.
Les passer en props à `ProfileForm`.

- [ ] **Step 2: Mettre à jour `src/app/settings/ProfileForm.tsx`**

- Remplacer le champ principal de clé API par un bloc moderne **« Compte Duels.ink »** :
  - Si connecté & valide : Badge vert `Connecté (nom)`, mention de date d'expiration, et bouton « Dissocier » (appelle `disconnectDuelsAccount`).
  - Si expiré : Badge orange `Connexion expirée`, message d'avertissement et bouton « Reconnecter » (lien vers `/api/oauth/duels/start`).
  - Si non connecté mais `lorcanaApiKey` présente : Badge jaune `Synchronisé via clé manuelle`, message d'incitation à passer au 1 clic, et bouton « Lier mon compte Duels.ink ».
  - Si non connecté sans clé : Bouton violet « Lier mon compte Duels.ink » (lien vers `/api/oauth/duels/start`).
  - Section repliable « Configuration avancée » avec le champ `lorcanaApiKey` conservé pour les utilisateurs qui en ont besoin.
- Gérer les query params `?duels_linked=true`, `?duels_cancelled=true`, `?duels_error=...` pour afficher des messages d'information clairs.

- [ ] **Step 3: Mettre à jour `src/app/team/settings/page.tsx` et `TeamSettingsForm.tsx`**

- Dans la requête Prisma de `team/settings/page.tsx`, inclure :
  `select: { id: true, name: true, image: true, lorcanaApiKey: true, duelsAccessToken: true, duelsTokenExpiresAt: true, duelsUsername: true }`.
- Dans `TeamSettingsForm.tsx`, calculer le badge de statut pour chaque membre :
  - 🟢 **Lié** : `duelsAccessToken && (!duelsTokenExpiresAt || duelsTokenExpiresAt > now)`
  - 🟡 **Clé manuelle** : pas de token OAuth valide, mais `lorcanaApiKey` présente
  - 🟠 **Expiré** : `duelsAccessToken && duelsTokenExpiresAt <= now` (sans clé manuelle)
  - 🔴 **Non synchronisé** : ni token OAuth ni clé manuelle

- [ ] **Step 4: Vérifier la compilation et le lint du projet**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && npm run build
```
Expected : Compilation Next.js réussie sans erreurs TypeScript ni de build.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/ProfileForm.tsx src/app/team/settings/page.tsx src/app/team/settings/TeamSettingsForm.tsx
git commit -m "feat(ui): add duels.ink 1-click connect button, status badges, and team member indicators"
```

---

### Task 6: Exécution de la Suite Complète de Tests et Validation Finale

**Files:**
- Test: Tous les fichiers de test

- [ ] **Step 1: Lancer tous les tests unitaires créés**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && node --import tsx --test "src/lib/__tests__/**/*.test.ts"
```
Expected : Tous les tests passent avec 0 échec.

- [ ] **Step 2: Vérifier le build de production final**

Run :
```bash
export PATH="/home/sweek/.nvm/versions/node/v24.13.0/bin:$PATH" && npm run build
```
Expected : Build réussi.

- [ ] **Step 3: Commit final ou tag de branche**

```bash
git status
```
Vérifier un espace de travail propre prêt à la revue.
