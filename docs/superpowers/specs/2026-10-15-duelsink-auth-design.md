# Conception : Intégration OAuth Duels.ink (Account Linking) & Compatibilité Descendante

**Date :** 2026-10-15  
**Branche :** `duelsink-auth`  
**Statut :** Validé — En attente d'approbation avant planification  

---

## 1. Contexte & Intention (Intent & Why)

Lorcana Team Tracker permet aux équipes compétitives de synchroniser et d'analyser l'historique de jeu de leurs membres depuis la plateforme **Duels.ink**.

Actuellement, chaque joueur doit créer manuellement un token personnel (API Key de 96 caractères) sur Duels.ink et le copier-coller dans les paramètres de son profil. Cette démarche technique crée une friction majeure à l'embarquement des joueurs qui ne savent pas ce qu'est une clé API.

Duels.ink propose désormais **« Sign in with duels.ink »** (OAuth 2.0 PKCE / OAuth 2.1), permettant une autorisation en 1 clic.

L'objectif de cette évolution est de permettre aux joueurs d'associer leur compte Duels.ink en un clic (« Lier mon compte Duels.ink »), tout en garantissant une **continuité absolue et zéro perte de données** pour les utilisateurs déjà inscrits ayant déjà renseigné une clé API.

---

## 2. Objectifs, Non-Objectifs & Anti-Objectifs

### Objectifs (Goals)
1. **Liaison en 1 clic (OAuth 2.0 + PKCE)** :
   - Fournir un flux sécurisé d'autorisation via Duels.ink (`profile` et `match_history:read`).
   - Stocker le token d'accès (`access_token`), l'ID stable Duels.ink (`user.id`), le pseudo et la date d'expiration sur le compte utilisateur.
2. **Compatibilité descendante totale (Zéro régression)** :
   - Conserver les comptes utilisateurs existants (connectés via Discord), leurs équipes, leurs parties et leurs statistiques.
   - Maintenir le fonctionnement du moteur de synchronisation ([`src/actions/sync.ts`](file:///home/sweek/lorcana-team-tracker/src/actions/sync.ts)) pour les utilisateurs ayant encore une clé API manuelle (`lorcanaApiKey`).
3. **Priorité automatique du token OAuth** :
   - Lors de la synchronisation, utiliser en priorité le token OAuth valide s'il existe ; sinon, basculer sur l'ancienne clé manuelle `lorcanaApiKey`.
4. **Interface utilisateur claire et intuitive** :
   - Remplacer l'invitation à saisir une clé API par un bouton d'action évident « Lier mon compte Duels.ink ».
   - Afficher un badge de statut clair (ex: « Connecté en tant que *Ashe* », « Expiré », « Déconnecté »).
   - Proposer un bouton « Dissocier » pour révoquer la liaison localement.
   - Sur la page de gestion d'équipe ([`src/app/team/settings/page.tsx`](file:///home/sweek/lorcana-team-tracker/src/app/team/settings/page.tsx)), indiquer précisément l'état de synchronisation de chaque membre (🟢 Lié, 🟡 Clé manuelle, 🟠 Expiré, 🔴 Non synchronisé).
5. **Gestion de l'expiration sans refresh token** :
   - Duels.ink n'émettant pas de *refresh token*, détecter les tokens expirés (ou les retours HTTP 401) et afficher un état « Reconnecter » en 1 clic.
6. **Transfert automatique en cas de collision de compte** :
   - Si un compte Duels.ink est relié depuis un nouveau compte Discord, transférer automatiquement la liaison vers le nouveau profil en libérant l'ancien.

### Non-Objectifs (Non-Goals)
- **Remplacer la connexion Discord** : Discord reste la méthode d'authentification principale pour entrer sur le site.
- **Création automatique de tables de tournoi (`POST /api/table/create`)** : Cette fonctionnalité fera l'objet d'un développement ultérieur et s'appuiera sur un token personnel d'organisateur/bot, car les tokens OAuth Scoped ne disposent pas des permissions d'écriture pour créer des tables.
- **Téléchargement en masse de replays/gamelogs** : Seule la synchronisation des métadonnées et résultats de matchs est couverte.

### Anti-Objectifs (Anti-Goals)
- Ne jamais bloquer ou supprimer un joueur existant qui n'a pas encore cliqué sur le bouton de liaison Duels.ink.
- Ne jamais exposer le `client_secret` ou les tokens d'accès bruts dans le JavaScript côté client / navigateur.
- Ne jamais casser la synchronisation planifiée ou manuelle des joueurs ayant une `lorcanaApiKey` valide.

---

## 3. Contraintes & Spécifications Externes

Conformément à la spécification Duels.ink ([`docs/duelsink/api-docs.md`](file:///home/sweek/lorcana-team-tracker/docs/duelsink/api-docs.md)) :
1. **Confidential Server App** : Le secret d'application (`DUELS_CLIENT_SECRET`) doit rester strictement côté serveur.
2. **PKCE (Proof Key for Code Exchange)** :
   - `code_verifier` : chaîne aléatoire de 43 à 128 caractères (`base64url(randomBytes(32))`).
   - `code_challenge` : `base64url(sha256(code_verifier))` sans padding.
   - `state` : chaîne aléatoire (8 à 512 caractères) pour prévenir les attaques CSRF.
   - Le couple `(state, code_verifier)` est conservé temporairement côté serveur dans un cookie HTTP-only sécurisé (`duels_oauth_state`, durée de vie 10 minutes) le temps de la redirection.
3. **Redirect URIs** :
   - Doit correspondre au caractère près à l'URL enregistrée sur [duels.ink/developers](https://duels.ink/developers) (ex: `http://localhost:3000/api/oauth/duels/callback` en local, `https://<domaine>/api/oauth/duels/callback` en production).
4. **Scopes** :
   - `profile match_history:read` (durée de validité demandée : 365 jours).
5. **Échange de code (`POST /api/oauth/token`)** :
   - Validité du code : 60 secondes, usage unique.
   - La réponse fournit `access_token`, `expires_in` (secondes), `scope`, et `user: { id, name }`.

---

## 4. Architecture & Décisions Techniques

### 4.1. Modèle de Données (Prisma Schema)

Dans `prisma/schema.prisma`, enrichir le modèle `User` :
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?

  // Ancien champ conservé pour rétrocompatibilité
  lorcanaApiKey String?

  // Nouveaux champs pour la liaison Duels.ink
  duelsUserId          String?   // Identifiant stable (ex: "u_0190...")
  duelsUsername        String?   // Pseudo Duels.ink au moment de la liaison
  duelsAccessToken     String?   @db.Text
  duelsTokenExpiresAt  DateTime? // Date d'expiration calculée (now + expires_in)

  dreambornUrl  String?
  // ... relations existantes (teams, games, accounts, sessions)
}
```

*Note sur le stockage des tokens :* Aligné sur le modèle `Account` de NextAuth déjà en place pour Discord, le token est conservé de manière sécurisée en base serveur sans exposition cliente.

### 4.2. Endpoints OAuth (`/api/oauth/duels/*`)

1. **`GET /api/oauth/duels/start`** :
   - Vérifie la session utilisateur active (Discord).
   - Génère `code_verifier`, `code_challenge` (S256), et un `state` unique.
   - Enregistre `code_verifier` et `state` dans un cookie HTTP-only sécurisé (`duels_oauth_state`, durée de vie 10 minutes).
   - Redirige l'utilisateur vers :
     `https://duels.ink/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=profile+match_history:read&state=...&code_challenge=...&code_challenge_method=S256&expires_in_days=365`.

2. **`GET /api/oauth/duels/callback`** :
   - Vérifie la session utilisateur.
   - Valide le paramètre `state` reçu avec le cookie de session (rejet si manquant ou non concordant).
   - Si `error=access_denied`, redirige vers `/settings` avec un message d'annulation neutre.
   - Si `code` est présent : échange le code contre un token auprès de `https://duels.ink/api/oauth/token`.
   - **Gestion de collision de compte (décision validée : transfert automatique) :**
     Exécution d'une transaction Prisma :
     1. Si un autre utilisateur possède déjà ce `duelsUserId`, ses champs Duels sont remis à `null` (`duelsUserId = null`, `duelsUsername = null`, `duelsAccessToken = null`, `duelsTokenExpiresAt = null`).
     2. L'utilisateur actuel reçoit le nouveau `duelsUserId`, `duelsUsername`, `duelsAccessToken` et `duelsTokenExpiresAt`.
   - Supprime le cookie temporaire `duels_oauth_state`.
   - Redirige vers `/settings?duels_linked=true`.

3. **Server Action `disconnectDuels()`** :
   - Remet à `null` les champs `duelsUserId`, `duelsUsername`, `duelsAccessToken`, `duelsTokenExpiresAt` pour l'utilisateur courant.

### 4.3. Moteur de Synchronisation ([`src/actions/sync.ts`](file:///home/sweek/lorcana-team-tracker/src/actions/sync.ts))

Le ciblage des joueurs à synchroniser s'élargit :
```typescript
const usersToSync = await prisma.user.findMany({
    where: {
        teams: { some: { teamId: teamId } },
        ...(targetUserId ? { id: targetUserId } : {}),
        OR: [
            { duelsAccessToken: { not: null } },
            { lorcanaApiKey: { not: null } }
        ]
    }
});
```

Sélection du token par joueur :
```typescript
const isOAuthValid = user.duelsAccessToken && (!user.duelsTokenExpiresAt || user.duelsTokenExpiresAt > new Date());
const token = isOAuthValid ? user.duelsAccessToken : user.lorcanaApiKey;

if (!token) continue;
```

**Gestion des erreurs 401 & Expiration :**
- Si un appel avec `duelsAccessToken` renvoie HTTP 401 (révoqué ou expiré) :
  - Mise à jour en base : `duelsTokenExpiresAt = new Date(0)` (marque immédiatement le token comme expiré pour alerter l'utilisateur).
  - Si l'utilisateur possède une `lorcanaApiKey` de secours, basculer immédiatement dessus pour ne pas bloquer la synchronisation de l'équipe.

**Optimisations appliquées à l'appel API :**
- Ajout du filtre `source=matchmaking` et augmentation de la limite : `https://duels.ink/api/me/match-history?source=matchmaking&limit=250`.

### 4.4. Interface Utilisateur & Expérience (UI/UX)

1. **Page Profil ([`src/app/settings/ProfileForm.tsx`](file:///home/sweek/lorcana-team-tracker/src/app/settings/ProfileForm.tsx))** :
   - Remplacement du champ texte principal par un bloc **« Connexion Duels.ink »**.
   - **État Lié & Actif** : Badge vert « Connecté en tant que **{duelsUsername}** » + indication d'expiration + bouton « Dissocier ».
   - **État Expiré / Révoqué** : Badge orange « Connexion expirée » + Bouton « Reconnecter mon compte » en 1 clic.
   - **État Non lié avec clé manuelle existante** : Badge jaune « Synchronisé par clé manuelle » + Encart d'incitation : « Passez à la liaison en 1 clic pour plus de simplicité » + Bouton « Lier mon compte Duels.ink ».
   - **État Non lié sans clé** : Grand bouton d'action violet/bleu « Lier mon compte Duels.ink ».
   - Section repliable « Paramètres avancés » permettant toujours de consulter/modifier la clé manuelle si souhaité.

2. **Paramètres d'Équipe ([`src/app/team/settings/TeamSettingsForm.tsx`](file:///home/sweek/lorcana-team-tracker/src/app/team/settings/TeamSettingsForm.tsx))** :
   - 🟢 **Lié** : Compte OAuth actif et valide.
   - 🟡 **Clé manuelle** : Rétrocompatibilité active via `lorcanaApiKey`.
   - 🟠 **Expiré** : Token OAuth expiré et aucune clé manuelle de secours (alerte le capitaine).
   - 🔴 **Non synchronisé** : Ni token OAuth ni clé API configurée.

---

## 5. Ce qui est laissé au développeur (What's left to the builder)

- La gestion fine du stockage temporaire des cookies PKCE (`duels_oauth_state`).
- Les retours visuels (Toasts de confirmation) lors de la liaison ou dissociation.
- L'adaptation des types TypeScript et des composants d'affichage.
