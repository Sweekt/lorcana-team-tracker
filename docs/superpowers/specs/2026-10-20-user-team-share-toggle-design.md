# Spécification Technique & Design : Option de Confidentialité du Partage d'Équipe (Par Équipe)

- **Date :** 2026-10-20
- **Statut :** En cours de validation
- **Auteur :** Antigravity

---

## 1. Contexte & Intention (Why)

Certains joueurs appartenant à une ou plusieurs équipes Lorcana souhaitent pouvoir masquer leurs parties, statistiques et classement ladder vis-à-vis des membres d'une équipe en particulier (par exemple pour garder des listes secrètes, tester contre d'autres joueurs ou pour des raisons de confidentialité), tout en restant membres de l'équipe et en conservant leur lien de decks Dreamborn.

Le réglage doit être **spécifique à chaque équipe** à laquelle appartient le joueur : un joueur peut choisir de partager ses données avec l'équipe A, mais pas avec l'équipe B.

---

## 2. Objectifs, Non-objectifs & Anti-objectifs

### Objectifs
- Ajouter un interrupteur on/off pour **chaque équipe** rattachée à l'utilisateur dans ses paramètres (`/settings`, section Mes Équipes).
- Rendre le réglage persistant sur la liaison `TeamMember` (`shareData Boolean @default(true)`).
- Exclure les joueurs ayant désactivé le partage au sein d'une équipe des statistiques collectives, de l'historique et du ladder de **cette équipe** (`/`, `/leaderboard`).
- Conserver le joueur dans le trombinoscope / roster (`/roster`) de l'équipe.
- Sur la page profil publique du joueur (`/player/[name]`), si le partage avec l'équipe active est désactivé pour ce joueur :
  - Remplacer les données de jeu (stats, ladder, MMR, historique) par un encart informatif signalant que le joueur ne partage pas ses données avec l'équipe.
  - Conserver son avatar, son pseudo et son lien Dreamborn.
- Si le joueur consulte son propre profil, il a accès à toutes ses données et statistiques personnelles.
- Afficher pour le capitaine dans la gestion de l'équipe (`/team/settings`) un badge clair (`Partage actif` / `Partage désactivé`) pour chaque membre de son équipe.

### Non-objectifs
- Supprimer ou désynchroniser les parties : les matchs restent synchronisés en base, seul l'accès et l'agrégation dans le contexte de l'équipe concernée sont masqués.
- Paramètre purement global (l'utilisateur peut avoir des choix différents selon ses équipes).

### Anti-objectifs
- Ne pas affecter l'accès ou les statistiques du joueur dans une autre équipe où le partage est actif.
- Ne pas fausser les taux de victoires ou métas d'une équipe avec des données privées.

---

## 3. Contraintes & Règles Métier

1. **Par défaut :** Tout membre d'une équipe a le partage activé par défaut (`shareData: true`).
2. **Accès personnel préservé :** L'utilisateur connecté peut toujours consulter l'ensemble de ses statistiques sur sa propre page de profil.
3. **Multi-équipes :** La visibilité des données dépend toujours de l'équipe actuellement active (`currentTeamId`).

---

## 4. Architecture & Modifications Techniques

### 4.1 Modèle de Données (Prisma)
Ajout du champ `shareData` dans la table de liaison `TeamMember` dans `prisma/schema.prisma` :
```prisma
model TeamMember {
  id        String   @id @default(cuid())
  userId    String
  teamId    String
  role      Role     @default(MEMBER)
  shareData Boolean  @default(true) // Partage des parties avec cette équipe
  joinedAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
  @@index([teamId])
}
```

### 4.2 Actions Serveur (`src/actions/team.ts` ou `src/actions/user.ts`)
- Création d'une action serveur `toggleTeamDataSharing(teamId: string, shareData: boolean)` :
  - Vérification de l'authentification (`session.user.id`).
  - Mise à jour de `TeamMember` pour `userId` et `teamId` :
    ```ts
    await prisma.teamMember.update({
      where: { userId_teamId: { userId: session.user.id, teamId } },
      data: { shareData }
    });
    ```
  - Revalidation des chemins Next.js (`/settings`, `/leaderboard`, `/`, `/player/[name]`).

### 4.3 Page Paramètres Utilisateur (`/settings`)
- Dans `src/app/settings/page.tsx` :
  - Récupérer `shareData` dans la relation `teams` de l'utilisateur.
- Dans `src/app/settings/ProfileForm.tsx` (section « Mes Équipes ») :
  - Pour chaque équipe listée, ajouter un toggle switch « Partager mes parties avec cette équipe ».
  - Appel instantané de `toggleTeamDataSharing` avec notification toast (sonner).

### 4.4 Filtrage des requêtes d'équipe (basé sur `teamId`)

#### Page d'accueil / Dashboard (`src/app/page.tsx`)
```ts
const totalTeamGames = await prisma.game.count({
  where: {
    user: {
      teams: {
        some: { teamId, shareData: true }
      }
    }
  }
});
```

#### Leaderboard & Statistiques (`src/app/leaderboard/page.tsx`)
- `getLeaderboard` :
  ```ts
  where: {
    teams: { some: { teamId, shareData: true } }
  }
  ```
- `getRecentHistory` :
  ```ts
  where: {
    queueId,
    ...(isBo3 ? { mmrDelta: { not: null } } : {}),
    user: {
      teams: { some: { teamId, shareData: true } }
    }
  }
  ```
- Statistiques (`allStatsGames`) :
  ```ts
  where: {
    queueId: currentQueue,
    user: {
      teams: { some: { teamId, shareData: true } }
    }
  }
  ```

### 4.5 Page Profil Joueur (`src/app/player/[name]/page.tsx`)
- Récupérer le `TeamMember` correspondant au joueur dans l'équipe active (`teamId`) :
  ```ts
  const member = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: targetUser.id, teamId } },
    select: { shareData: true }
  });
  ```
- Condition d'affichage complet :
  `const canViewData = session.user.id === targetUser.id || (member?.shareData ?? false);`
- Si `!canViewData` :
  - Ne pas charger les parties et graphiques.
  - Afficher l'en-tête (Avatar, Pseudo, Bouton Dreamborn si présent).
  - Afficher l'encart d'information : *« Ce joueur n'a pas activé le partage de ses données avec l'équipe. »*

### 4.6 Paramètres de l'équipe (`src/app/team/settings/`)
- Dans `src/app/team/settings/page.tsx` : `team.members` inclut déjà chaque `TeamMember`.
- Dans `src/app/team/settings/TeamSettingsForm.tsx` :
  - Afficher un badge pour chaque membre :
    - Si `member.shareData` : Badge `Partage actif` (vert/indigo).
    - Si non `member.shareData` : Badge `Partage désactivé` (ambre/rouge).

---

## 5. Ce qui est laissé à l'implémenteur (Builder)
- Le design précis de l'interrupteur toggle dans la carte de chaque équipe.
- L'icône et les styles fins de l'encart sur la page de profil.
- Gestion optimisée du re-render via `startTransition` ou optimiste dans l'UI.
