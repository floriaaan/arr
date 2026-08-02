# Phase 7 — Synchronisation des watchlists (Plex/Jellyfin/Emby)

Feature à la Overseerr/Jellyseerr : chaque utilisateur relie son compte
Plex/Jellyfin/Emby, un job périodique lit sa watchlist et crée
automatiquement les requests correspondantes, avec ou sans validation
admin selon la politique choisie.

**C'est entièrement du neuf.** `grep -ri watchlist` sur tout le repo ne
remonte rien (backend, frontend, docs). Il n'existe aujourd'hui :
- aucune intégration API vers Plex/Jellyfin/Emby (`MediaServer` n'est qu'un
  lien de renvoi : `kind` + `baseUrl` + `enabled`, explicitement documenté
  comme *"no API key, no health check"*) ;
- aucun workflow d'approbation (`RequestStatus` n'a que
  `pending → submitted → downloading → importing → available/failed/cancelled`,
  et `CreateRequest.execute()` enchaîne `pending` → `submit()` sans jamais
  s'arrêter) ;
- aucun compte externe lié à un `User`, aucun quota, aucun flag
  auto-approve ;
- `docs/phase-6-fiabilite-requests/00-overview-et-decisions.md` liste
  d'ailleurs *"Workflow d'approbation, quotas par utilisateur"* dans son
  **Hors périmètre**.

Ce document propose un découpage en chantiers, dans le même esprit que la
phase 6. Il y a plusieurs décisions produit structurantes (§1, §4, §7) qui
changent la taille du lot selon la réponse — à trancher avant que je code
quoi que ce soit.

## Portée

- Nouveau contexte borné `watchlist` (`domain/application/infrastructure/
  presentation/watchlist`), au même niveau que `catalog`, `identity`,
  `requests`, etc.
- Extension de `MediaRequest` (origine, gate d'approbation) — pas de
  nouveau statut dans `RequestStatus`, des métadonnées en plus.
- Nouvelle commande Ace `watchlist:sync`, même forme que
  `requests:reconcile`, nouveau service `compose.yml`.
- Nouvelle UI : page self-service "mes comptes liés" (pour tout
  utilisateur) + panneau admin "Watchlist" dans les settings.
- Quatre migrations (comptes liés, réglages, extension `media_requests`,
  table de dédoublonnage).

---

## 1. Ce que "watchlist" veut dire selon le provider

### Constat

Les trois providers n'ont pas le même concept :

- **Plex** a une vraie *Watchlist* : une liste côté compte `plex.tv`
  (cloud), indépendante de tout serveur, accessible via
  `https://discover.provider.plex.tv/library/sections/watchlist/all` avec
  le `X-Plex-Token` du compte. Chaque item porte des `Guid` préfixés
  (`tmdb://...`, `tvdb://...`, `imdb://...`).
- **Jellyfin/Emby** n'ont pas de watchlist cloud : le plus proche est les
  **Favoris** (`IsFavorite`), qui sont locaux à *ce* serveur — pas de
  notion de compte central. Endpoint Jellyfin :
  `GET /Users/{userId}/Items?Filters=IsFavorite&IncludeItemTypes=Movie,Series`,
  équivalent Emby (`/emby/...`). Les items exposent déjà `ProviderIds.Tmdb`/
  `ProviderIds.Tvdb` puisqu'ils sont dans la bibliothèque du serveur.

### Décision proposée

1. **On assume l'équivalence "watchlist" = Favoris pour Jellyfin/Emby**,
   documentée comme telle dans l'UI ("Jellyfin/Emby : basé sur vos
   Favoris"). C'est le choix de Jellyseerr aussi. Si tu veux autre chose
   (une playlist nommée, par exemple), dis-le — ça change le client HTTP
   mais pas le reste de l'archi.
2. **Films et séries uniquement**, pas d'albums (Lidarr/`musicbrainz`) :
   aucun des trois providers n'a de "watchlist" musicale. `MediaKind`
   reste `movie | series` pour tout ce qui vient du watchlist sync.

### Fichiers

Nouveau : `backend/src/infrastructure/watchlist/{plex,jellyfin,emby}-watchlist-client.ts`,
port `backend/src/domain/watchlist/interfaces/watchlist-provider.interface.ts`.

---

## 2. Lier un compte Plex/Jellyfin/Emby à un utilisateur

### Constat

`User` (lecture sur les tables better-auth) n'a aucun champ pour ça, et
`MediaServer` est une config *admin*, globale, sans token — pas le bon
endroit pour un lien *par utilisateur*.

### Décisions

1. **Nouvelle table `user_media_accounts`** : `id`, `userId` (FK better-auth
   `user.id`), `kind` (`plex|jellyfin|emby`), `externalUserId`, `username`,
   `accessTokenEncrypted` (même pattern que `apiKeyEncrypted` sur
   `ServarrInstance`), `baseUrl` (nullable — inutile pour Plex, obligatoire
   pour Jellyfin/Emby puisque self-hosté), `watchlistEnabled` (bool,
   défaut `true`), `lastSyncedAt`, `lastSyncError`, timestamps. Unique
   `(userId, kind)` : un compte lié par provider et par utilisateur en v1
   (pas de multi-serveur Jellyfin pour le même user).
2. **Flux de liaison, par provider** :
   - **Plex** : flow PIN device-code (`POST plex.tv/api/v2/pins`, poll,
     puis `GET plex.tv/api/v2/user` avec le token obtenu) — jamais de mot
     de passe Plex vu par le backend. Standard Overseerr/Jellyseerr.
   - **Jellyfin/Emby** : formulaire "URL serveur + identifiants", un seul
     appel `POST /Users/authenticatebyname` (Jellyfin) /
     `authenticatebypassword` (Emby) pour obtenir un `AccessToken`, qu'on
     stocke — le mot de passe n'est jamais persisté.
3. **Self-service, pas admin-only.** Chaque utilisateur lie *son propre*
   compte depuis une nouvelle page "Mon compte" (aucune page de ce type
   n'existe aujourd'hui — le panneau Users actuel ne permet à l'admin que
   de changer le rôle d'autrui). Un admin peut lier le sien comme
   n'importe qui, mais ne voit/lie pas ceux des autres.

### Fichiers

Migration `create_user_media_accounts_table`, agrégat
`backend/src/domain/watchlist/user-media-account.aggregate.ts`, use cases
`link-media-account.use-case.ts` / `unlink-media-account.use-case.ts`,
présentation `presentation/watchlist/*`, frontend
`presentation/account/linked-accounts-panel.tsx` (nouvelle route, ex.
`/account`).

---

## 3. Récupération et normalisation des items

### Décisions

1. **Un client HTTP par provider**, derrière le port
   `WatchlistProvider.fetchItems(account): WatchlistItem[]`, avec
   `WatchlistItem = { kind: 'movie'|'series', externalId: { scheme:
   'tmdb'|'tvdb', value } , title }` — même vocabulaire que
   `catalog/external-id.vo.ts`, pour rester compatible avec
   `MediaRequest.externalId` sans conversion supplémentaire en aval.
2. **Résolution d'id** : Plex fournit `tmdb://`/`tvdb://` directement dans
   `Guid[]` — on prend `tmdb` pour un film, `tvdb` pour une série, on
   ignore `imdb://` (pas un scheme supporté par `ExternalIdScheme`
   aujourd'hui). Jellyfin/Emby exposent déjà `ProviderIds.Tmdb`/`Tvdb`. Un
   item sans id exploitable (rare, mais possible côté Plex pour du contenu
   très récent) est **ignoré et loggé**, pas bloquant pour le reste du
   run.
3. **Pas de nouvel appel *arr pour chercher les métadonnées** : l'id
   normalisé suffit à `CreateRequest`, qui sait déjà résoudre un
   `ExternalId` via `MediaLookup`.

### Fichiers

`backend/src/domain/watchlist/watchlist-item.vo.ts`,
`backend/src/infrastructure/watchlist/*-watchlist-client.ts` (+ schémas
Zod par provider, tests avec fixtures JSON).

---

## 4. Politique d'approbation

### Constat

C'est le point qui décide de la taille du lot. Overseerr gate *toutes* les
requests (manuelles et watchlist) derrière une permission `AUTO_APPROVE`
par utilisateur. Ici, il n'existe **aucune** notion d'approbation nulle
part : introduire ça pour les requests manuelles changerait un
comportement existant (aujourd'hui, tout utilisateur connecté crée une
request qui part immédiatement en `submitted`).

### Décision proposée (à valider — c'est LE choix qui cadre tout le reste)

**Scope minimal : l'approbation ne s'applique qu'aux requests
d'origine watchlist.** Les requests créées manuellement depuis l'UI de
recherche continuent de partir directement en `submitted`, comme
aujourd'hui — zéro régression sur l'existant.

1. **Pas de nouveau statut dans `RequestStatus`.** On ajoute des
   métadonnées sur `MediaRequest` : `origin: 'manual' | 'watchlist'`,
   `requiresApproval: boolean`, `approvedAt`, `approvedByUserId`,
   `rejectedAt`, `rejectionReason`. Le statut reste `pending`, mais
   `CreateRequest` **n'appelle `provisioning.submit()` que si
   `requiresApproval === false`**. Choisi plutôt qu'un statut
   `pending_approval` séparé pour ne pas complexifier la state machine
   existante ni le reconciler, qui ne regarde que les statuts actifs.
2. **Qui décide `requiresApproval` ?** Un réglage global admin (§7,
   "auto-approuver par défaut"), avec **override par utilisateur** dans le
   panneau Users existant (à côté du toggle de rôle) : `autoApprove:
   boolean | null` (`null` = suit le défaut global). Un admin qui lie son
   propre compte est toujours auto-approuvé, cohérent avec
   `canActOn` qui donne déjà tout pouvoir à l'admin ailleurs.
3. **Actions admin** : `POST /api/requests/:id/approve` (appelle
   `provisioning.submit()`, comme `CreateRequest` l'aurait fait),
   `POST /api/requests/:id/reject { reason }` (→ `cancel()` avec la raison
   en `failureReason`). Nouveaux use cases `ApproveRequest`/
   `RejectRequest`, réutilisant `request-actor.ts` pour req admin-only.
4. **UI** : la liste des requests existante gagne un filtre "en attente
   d'approbation" et deux boutons sur les cartes concernées — pas de
   nouvelle page.

Si tu préfères que l'approbation s'applique aussi aux requests manuelles
(modèle Overseerr complet), c'est possible mais plus gros : ça touche
`CreateRequest` pour tout le monde, l'UI de recherche/détail titre, et
sort du cadre "je répare rien d'existant" qui a guidé la phase 6. Dis-le
si c'est ce que tu veux.

### Fichiers

`media-request.aggregate.ts`, `create-request.use-case.ts`, nouvelle
migration `add_origin_and_approval_to_media_requests`, nouveaux use cases
`application/requests/{approve,reject}-request.use-case.ts`,
`requests.controller.ts`/`requests.routes.ts`, `request-card.tsx`.

---

## 5. Job de synchronisation

### Décisions

1. **Même forme que `requests:reconcile`** : commande Ace
   `watchlist:sync`, `staysAlive: true`, boucle `while` +
   `app.terminating()`, nouveau service `compose.yml` (`watchlist-sync`).
2. **Intervalle configurable, contrairement aux deux jobs existants.**
   `requests:reconcile`/`instances:health` ont un intervalle codé en dur
   parce que ce sont des jobs *opérationnels* sans réglage utilisateur
   pertinent. Ici l'intervalle a un impact produit direct (fraîcheur de la
   watchlist vs charge sur les API Plex/Jellyfin/Emby) → réglage dans la
   table `watchlist_settings` (§7), lu par la commande au début de chaque
   itération (pas de hot-reload en cours de run, juste au tour suivant).
   Défaut proposé : 60 min, plancher 15 min pour éviter le rate-limit
   Plex.tv.
3. **Un run itère sur tous les `user_media_accounts` avec
   `watchlistEnabled = true`**, appelle le client provider, diffuse le
   résultat via `CreateRequest` par item nouveau (§6 pour la
   dédup). Une erreur sur un compte (token expiré, serveur Jellyfin down)
   est loggée sur `lastSyncError`, n'interrompt pas les autres comptes.
4. **Plafond par run et par utilisateur** (`maxNewRequestsPerRun`, réglage
   global, défaut 20) : protège contre un premier lien avec une watchlist
   de 300 films qui inonderait la file d'un coup. Le surplus est repris au
   run suivant (les items non traités restent "non vus", donc retentés).

### Fichiers

`backend/commands/watchlist_sync.ts`, `compose.yml`, `Taskfile.yml`
(tâche `dev:watchlist-sync`), use case
`application/watchlist/sync-watchlist.use-case.ts`.

---

## 6. Dédoublonnage entre runs

### Constat

Sans état, deux problèmes : (a) un item déjà traité (créé, puis annulé ou
rejeté par l'utilisateur/admin) reviendrait indéfiniment à chaque run tant
qu'il reste sur la watchlist ; (b) on ne peut pas distinguer "jamais vu" de
"vu et ignoré volontairement".

### Décision

1. **Nouvelle table `watchlist_seen_items`** : `userMediaAccountId`,
   `externalIdScheme`, `externalIdValue`, `mediaRequestId` (nullable, si
   une request a été créée), `firstSeenAt`. Clé unique
   `(userMediaAccountId, externalIdScheme, externalIdValue)`.
2. **Règle : un item vu une fois n'est plus jamais reproposé
   automatiquement**, même rejeté, même retiré puis remis sur la
   watchlist. L'utilisateur garde toujours la main pour le redemander
   manuellement depuis l'UI de recherche. Évite les boucles de
   résurrection "rejeté → réapparaît → rejeté → ...". Si tu veux un
   comportement différent (ex. réoffrir après un retrait de la watchlist
   suivi d'un ré-ajout), c'est une variante de la clé unique, mais je pars
   sur le plus simple par défaut.
3. **Filtre par le repo requests existant, inchangé.** `watchlist_seen_items`
   ne remplace pas la contrainte d'unicité de `media_requests`
   (phase 6, chantier 2) — les deux coexistent : celle-ci empêche les
   doublons *vivants*, celle-là empêche de *reproposer*.

### Fichiers

Migration `create_watchlist_seen_items_table`, repository
`infrastructure/persistence/watchlist/watchlist-seen-item.repository.ts`.

---

## 7. Réglages & UI admin

### Décisions

1. **`watchlist_settings`**, agrégat mono-ligne comme
   `NotificationSettings` : `enabled` (coupe tout le job), `intervalMinutes`,
   `autoApproveByDefault` (bool), `maxNewRequestsPerRun`,
   `notifyOnPendingApproval` (bool, cf §8).
2. **Nouveau panneau "Watchlist" dans `settings-panels.tsx`**, calqué sur
   `NotificationsPanel` (Card + Switches + save), plus un tableau listant
   les comptes liés par utilisateur avec leur `lastSyncedAt`/
   `lastSyncError` pour le diagnostic admin (sans exposer les tokens,
   jamais renvoyés par l'API).
3. **Panneau Users existant** étendu avec le toggle `autoApprove`
   par utilisateur (§4.2).

### Fichiers

Migration `create_watchlist_settings_table`, agrégat
`domain/watchlist/watchlist-settings.aggregate.ts`, contrôleur
`presentation/watchlist/watchlist-settings.controller.ts`,
`settings-panels.tsx` (nouvel onglet + extension `UsersPanel`).

---

## 8. Notifications

### Décisions

1. **Réutilise l'event bus existant**, pas de nouveau système. Un item
   auto-approuvé émet `mediaRequested` comme aujourd'hui →
   `onRequestCreated` s'applique tel quel, rien à faire.
2. **Nouvel événement `requestPendingApproval`**, émis quand
   `requiresApproval = true`. Nouveau toggle
   `NotificationSettings.onRequestPendingApproval` (aligné sur
   `notifyOnPendingApproval` de watchlist_settings — à fusionner en un
   seul flag pour éviter la confusion, je propose de le garder uniquement
   côté `NotificationSettings` et de retirer celui de §7.1).
3. Pas de notification "par utilisateur" (ex. "ta demande a été
   approuvée") : le système actuel est un webhook global admin, pas de
   notif par destinataire — hors périmètre, cohérent avec l'existant.

### Fichiers

`requests.events.ts` (+événement), `notification-subscriber.ts`
(+handler), `notification-settings.aggregate.ts` (+toggle, -doublon
watchlist_settings.notifyOnPendingApproval).

---

## Hors périmètre

- Quotas de requests par utilisateur/période (Overseerr le fait, pas ici —
  seul le plafond par run §5.4 existe, comme garde-fou technique, pas
  comme feature produit).
- Notifications individuelles par utilisateur (statut de sa propre
  request).
- Sélection saison/épisode depuis le watchlist sync (comme pour les
  requests manuelles, on demande la série entière — inchangé par rapport
  à l'existant).
- Multi-serveur Jellyfin/Emby par utilisateur (un seul lien par provider
  en v1).
- Rafraîchissement du token Plex à l'expiration (le token PIN Plex
  n'expire pas côté usage normal ; si `lastSyncError` indique un 401
  répété, l'utilisateur relie son compte à nouveau — pas de refresh
  automatique en v1).
- Historique/audit détaillé des imports watchlist au-delà de
  `watchlist_seen_items` (pas d'écran "journal des imports").

## Questions ouvertes à trancher avant implémentation

1. **§1** — Jellyfin/Emby "watchlist" = Favoris : OK, ou autre mapping voulu ?
2. **§4** — Approbation scoped watchlist-only (recommandé) vs approbation
   globale sur toutes les requests (plus gros chantier) ?
3. **§5.2** — Intervalle par défaut 60 min / plancher 15 min : OK ?
4. **§5.4 / §6.2** — Plafond par run à 20, et règle "jamais reproposé une
   fois vu" : OK, ou tu veux un comportement différent ?
