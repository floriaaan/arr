# Phase 6 — Fiabilité du cycle de vie des requests

Lot de correctifs sur `MediaRequest`, sans nouvelle feature utilisateur majeure
sauf une (l'accordéon des épisodes). Contrairement aux phases 2 à 5, qui
ajoutaient des écrans, celle-ci répare des comportements : ce qui est décrit ici
est **cassé aujourd'hui**, pas manquant.

Cinq chantiers :

1. Autorisation : n'importe qui peut annuler la requête de n'importe qui.
2. Un titre dont la requête a échoué est condamné définitivement.
3. Annuler ne dit rien au *arr, qui continue de télécharger.
4. Une série est « disponible » dès le premier épisode importé.
5. Accordéon des épisodes d'une série demandée.

Contexte d'usage confirmé : instance **partagée entre famille/amis**, quelques
comptes. C'est ce qui fait passer le chantier 1 de théorique à réel, et c'est
aussi ce qui cadre la décision 1.2 ci-dessous.

## Portée

- Backend uniquement pour 1 à 4, sauf le message d'erreur `forbidden` à
  afficher côté frontend.
- Une migration (chantier 2), une extension de schémas Zod (chantier 4).
- Le chantier 5 est le seul qui ajoute un endpoint, un composant UI et un
  appel *arr supplémentaire.

---

## 1. Autorisation sur les requests

### État actuel

`backend/src/presentation/requests/requests.controller.ts` :

- `cancel()` passe `ctx.params.id` à `CancelRequest`, dont l'entrée est
  `{ id }` — **sans acteur**. Le groupe de routes est sous `authRequired()`,
  jamais `adminOnly()`. Tout utilisateur connecté peut donc annuler la requête
  de n'importe qui, s'il en connaît l'id.
- `show()` n'appelle même pas `requireAuthenticatedUser(ctx)` et ne filtre rien.
- `index()` renvoie les requêtes de **tous** les utilisateurs ;
  `requestedBy=me` est un filtre que le client *choisit* d'envoyer, pas une
  règle appliquée côté serveur.

### Décisions

1. **L'acteur descend jusqu'au use case, pas seulement jusqu'au contrôleur.**
   `CancelRequest` et `GetRequest` prennent
   `{ id, actor: { id: string; isAdmin: boolean } }` et renvoient `forbidden`
   quand `request.requestedBy !== actor.id` et que l'acteur n'est pas admin.
   Mettre le test dans le contrôleur seul le rendrait contournable par le
   prochain appelant du use case ; c'est une règle d'application, pas de
   transport.

2. **La liste reste partagée — on ne scope pas `index()` à l'utilisateur.**
   C'est le point à trancher, et je propose de **ne pas** changer ce
   comportement. Sur une instance familiale, voir ce que les autres ont demandé
   est utile (ça évite les doublons, ça donne le contexte de la file), et ça
   correspond à ce que fait Overseerr par défaut. Le défaut réel est
   l'**écriture** non autorisée, pas la lecture. Restreindre la liste serait un
   changement de comportement visible pour une menace qui n'existe pas dans ce
   contexte d'usage.
   Si tu préfères l'inverse, c'est une ligne dans `index()`
   (`filter.requestedBy = user.id` sauf admin) — dis-le et je bascule.

3. **`forbidden` → 403.** `backend/src/presentation/shared/error-serializer.ts`
   ne connaît aujourd'hui que `account_disabled` en 403 ; on ajoute `forbidden`
   à `STRING_ERROR_STATUS` / `STRING_ERROR_MESSAGES`. Pas de 404 déguisé : sur
   une instance familiale, dire « ce n'est pas à toi » est plus clair que
   prétendre que la requête n'existe pas.

### Fichiers

`cancel-request.use-case.ts`, `get-request.use-case.ts`,
`requests.controller.ts`, `error-serializer.ts`.

---

## 2. Re-demander un titre après un échec

### État actuel

`media-request.repository.ts::findByExternalId` filtre sur
`(kind, scheme, value)` **sans regarder le statut**, et la table porte
`unique(['kind','external_id_scheme','external_id_value'])`. Une requête
`cancelled` ou `failed` renvoie donc `already_requested` **pour toujours**, pour
tout le monde : un téléchargement raté condamne le titre définitivement.

### Décisions

1. **`findByExternalId` ne regarde plus que les statuts actifs**
   (`pending`, `submitted`, `downloading`, `importing`) **et `available`.**
   `available` reste bloquant : redemander un titre déjà en bibliothèque n'a
   pas de sens, et `CreateRequest` a de toute façon déjà un garde-fou
   `already_managed` côté *arr.

2. **Index unique partiel plutôt que contrainte unique.** La contrainte actuelle
   protège l'invariant « pas deux requêtes vivantes pour le même titre » ; elle
   le fait juste trop largement. Une migration la remplace par un index unique
   partiel restreint aux mêmes statuts que ci-dessus, pour que la base garde
   l'invariant même si le code se trompe.

3. **L'historique est conservé.** On ne supprime ni ne réutilise l'ancienne
   ligne : une nouvelle requête est créée, l'échec précédent reste visible.
   C'est ce qui permettra plus tard un « pourquoi ça a raté la dernière fois ».

### Fichiers

`media-request.repository.ts`, nouvelle migration sous
`backend/database/migrations/`.

---

## 3. L'annulation doit atteindre le *arr

### État actuel

`MediaProvisioning`
(`backend/src/domain/requests/interfaces/media-provisioning.interface.ts`)
n'expose que `submit()`. `CancelRequest` bascule l'agrégat et sauvegarde — le
film reste ajouté et monitoré dans Radarr et **continue de se télécharger**.
L'utilisateur croit avoir annulé ; le disque se remplit quand même.

### Décisions

1. **`cancel(request)` ajouté au port**, implémenté par les trois adapters :
   `DELETE /api/v3/queue/:id?removeFromClient=true&blocklist=false`.
   `blocklist=false` volontairement : blocklister une release est une décision
   de qualité, pas une conséquence d'un « j'ai changé d'avis ».

2. **Retirer de la queue + démonitorer, sans supprimer les fichiers.**
   `docs/phase-0` laissait ce choix « à confirmer ». Démonitorer évite que le
   *arr relance immédiatement une recherche pour le même titre — sans ça,
   l'annulation ne tient pas dix minutes. Ne pas supprimer les fichiers évite
   qu'une annulation détruise un import déjà terminé : la suppression a déjà son
   chemin dédié et explicite (`DELETE /api/library`, chemin bibliothèque).

3. **Un échec côté *arr n'empêche pas l'annulation locale.** Si l'instance est
   injoignable, la requête passe quand même à `cancelled` (log en warning). La
   requête est un objet de *cette* app ; refuser de l'annuler parce que Radarr
   est down laisserait l'utilisateur coincé. Conséquence assumée : une
   désynchronisation possible, que le prochain passage du reconciler ne
   rattrapera pas — c'est le prix de ne pas bloquer.

4. **Annulation toujours limitée à `pending`/`submitted`/`downloading`.**
   `CANCELLABLE_STATUSES` reste inchangé : on n'ouvre pas l'annulation depuis
   `importing`/`available` dans ce lot (un fichier peut déjà être importé). Le
   point reste ouvert dans `docs/phase-0`.

### Fichiers

`media-provisioning.interface.ts`, `servarr-media-provisioning.ts`, les trois
`*.adapter.ts`, `cancel-request.use-case.ts`.

---

## 4. Disponibilité d'une série : tout-ou-rien

### État actuel

Deux défauts dans `sonarr.adapter.ts::fetchProgress` :

1. `new Map(records.map((r) => [String(r.seriesId), r]))` — avec plusieurs
   épisodes de la même série dans la queue, **seul le dernier survit**. Le
   pourcentage affiché est celui d'un épisode arbitraire.
2. Le repli hors queue approxime « disponible » par `episodeFileCount > 0` :
   une demande de 10 saisons bascule à `available` dès le premier épisode
   importé. Le commentaire du code l'assume comme limitation MVP.

`lidarr.adapter.ts` a exactement la même forme par `albumId` (un album a
plusieurs pistes). Radarr est mono-fichier, donc non concerné.

### Décisions

1. **Règle de statut, tout-ou-rien** :

   | Condition | Statut |
   |---|---|
   | **Tous** les épisodes ont un fichier | `available` |
   | **Au moins un** enregistrement en échec | `failed`, dès le premier |
   | Sinon | en cours (`downloading` / `importing`) |

   L'échec l'emporte sur tout le reste et n'attend pas les autres épisodes :
   un utilisateur préfère savoir tout de suite que sa série ne se téléchargera
   pas complètement, plutôt qu'après le dernier épisode.

2. **Multimap au lieu de map.** `Map<string, Record[]>` : tous les
   enregistrements d'une série sont conservés et évalués ensemble.

3. **`available` s'appuie sur `episodeFileCount >= episodeCount`**, avec
   `episodeCount > 0`. Ça implique d'**étendre les schémas Zod**, qui ne
   parsent aujourd'hui que `episodeFileCount` et `sizeOnDisk` :
   - Sonarr : ajouter `episodeCount` (et `percentOfEpisodes` si présent).
   - Lidarr : ajouter `trackCount` à côté de `trackFileCount`.

   `episodeCount` (épisodes diffusés) plutôt que `totalEpisodeCount` (qui inclut
   les épisodes non diffusés) : sinon une série en cours de diffusion ne serait
   **jamais** disponible, bloquée en attente d'épisodes qui n'existent pas
   encore.

4. **Pourcentage agrégé** : somme des octets restants sur somme des tailles,
   pour tous les enregistrements de la série. Nécessaire pour afficher une barre
   pendant « en cours » ; ce n'est pas une moyenne de statuts, le statut suit la
   règle 1.

5. **Le N+1 existant n'est pas traité ici.** Chaque ref absente de la queue
   coûte toujours un `GET /series/:id`. C'est un sujet de performance distinct,
   à traiter avec les webhooks si le besoin se confirme.

### Fichiers

`sonarr.adapter.ts`, `sonarr.mapper.ts`, `sonarr.schemas.ts`, et les trois
équivalents Lidarr.

---

## 5. Accordéon des épisodes d'une série demandée

### Décisions

1. **Détail par épisode, à la demande.** Le chantier 4 se contente des
   *compteurs* de la série ; l'accordéon a besoin de la *liste*. Nouvel appel
   `GET /api/v3/episode?seriesId=X` dans l'adapter Sonarr, exposé par
   `GET /api/requests/:id/episodes` — **chargé seulement au dépliage**, jamais
   dans la charge utile de la liste des requêtes (une page de 50 requêtes
   déclencherait 50 appels *arr).

2. **Séries uniquement.** Un film n'a rien à déplier ; un album Lidarr aurait
   ses pistes, mais l'intérêt est bien moindre et l'endpoint diffère — hors
   périmètre pour l'instant.

3. **Déplié en place dans `request-card.tsx`.** Il n'existe pas de route
   `/requests/$id` aujourd'hui (`useRequestDetail` existe mais n'est jamais
   consommé) ; en créer une pour ça serait disproportionné.

4. **`presentation/ui/accordion.tsx` à créer** — il n'y en a pas dans
   `presentation/ui/`. Construit sur `radix-ui`, déjà en dépendance, dans le
   même style que `dialog.tsx`.

5. **Par épisode** : saison/numéro, titre, et un badge d'état — présent / en
   cours (avec %) / manquant / en échec — dérivé de `hasFile` croisé avec les
   enregistrements de queue de la série.

### Fichiers

`servarr-kind-adapter.interface.ts` (+ `sonarr.adapter.ts`,
`sonarr.schemas.ts`), un port et un use case sous
`backend/src/application/requests/`, `requests.controller.ts` +
`requests.routes.ts`, `docs/phase-0/04-endpoints-http.md`, puis côté frontend
`arr-connector.ts` + les deux implémentations, un hook `application/requests/`,
`ui/accordion.tsx` et `request-card.tsx`.

---

## Hors périmètre

- Workflow d'approbation, quotas par utilisateur.
- Demande à la saison ou à l'épisode (on demande toujours la série entière ;
  ce lot ne fait que *rendre compte* correctement de son état).
- Annulation depuis `importing`/`available`.
- Ingestion de webhooks *arr / suppression du N+1 du reconciler.
- Vue file de téléchargement globale, vitesse de téléchargement.
- Accordéon des pistes pour un album Lidarr.
