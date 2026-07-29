# Phase 4 — Download clients & indexers par instance *arr

Ajout de deux pages, **`/download-clients`** et **`/indexers`** (admin uniquement,
même emplacement que `/profiles`), affichant en **lecture seule** les download
clients et les indexers configurés sur chaque instance *arr (Radarr, Sonarr,
Lidarr), à la manière de `/profiles`. Contrairement aux quality profiles (qui
ont été fusionnés dans un objet local `InstanceProfile` éditable, cf. phase 3),
les download clients et indexers ne sont **pas** gérés depuis cette
application : ils continuent de se configurer directement dans chaque *arr.
Cette phase ajoute uniquement une **vue agrégée** pour voir d'un coup d'œil ce
qui est branché où, sans dupliquer un formulaire d'édition par implémentation
(qBittorrent, Transmission, SABnzbd, Torznab, Newznab, etc. n'ont pas les mêmes
champs et ça representerait un gros scope pour un simple écran de visibilité).

Point central de la demande : si le **même** download client (ou le même
indexer) est branché sur plusieurs instances (ex. qBittorrent utilisé par
Radarr *et* Sonarr), il doit apparaître comme **une seule carte fusionnée**
listant les instances concernées, plutôt qu'en double/triple.

## Portée

- Deux nouvelles pages, protégées par `requireAdmin` (même garde que
  `/profiles` et `/settings`), avec leurs entrées de nav dans `AppShell`.
- Backend : deux nouveaux ports read-only (`ServarrDownloadClientManager`,
  `ServarrIndexerManager`), implémentations HTTP, use cases `list`, routes
  `GET /api/settings/instances/:kind/download-clients` et
  `GET /api/settings/instances/:kind/indexers`.
- Frontend : deux nouveaux domaines de types, hooks `application/`, une
  fonction pure de fusion par ressource, composants `presentation/`.
- Aucune table de base de données, aucune mutation, aucun appel
  create/update/delete côté *arr.

## Décisions

1. **Lecture seule, pas de fusion à la manière de `InstanceProfile`.** Les
   quality profiles ont été fusionnés en phase 3 parce que ce sont des
   préréglages qu'on veut créer/éditer *depuis cette app*. Les download
   clients et indexers restent une ressource « appartenant » à chaque *arr,
   avec des schémas de champs très hétérogènes par implémentation (host/port
   pour qBittorrent, apiKey pour SABnzbd, baseUrl+categories pour un indexer
   Torznab, etc.). Reconstruire un formulaire générique pour ça est hors
   scope ici : cette phase n'ajoute que du `list`, jamais de `create` /
   `update` / `delete` / `schema`. Pas de nouvelle table (pas de
   `download_client_profiles` ni `indexer_profiles`).

2. **Toujours pas de vrai multi-instance par kind (ADR-0006 inchangée).**
   Comme pour `/profiles`, "plusieurs instances" veut dire ici "jusqu'à 3
   instances fixes" (une par kind), pas plusieurs Radarr. La fusion ne se
   fait donc jamais qu'entre au plus 3 enregistrements (un par kind
   configuré), jamais entre plusieurs instances du même kind.

3. **Clé de fusion visuelle : `(implementation, protocol, name normalisé)`.**
   Deux enregistrements — un venant de Radarr, un venant de Sonarr par
   exemple — sont considérés comme "le même" download client/indexer si :
   - même `implementation` (ex. `"QBittorrent"`, `"Transmission"` /
     `"Torznab"`, `"Newznab"`) ;
   - même `protocol` (`torrent` / `usenet`) — redondant avec
     `implementation` dans la quasi-totalité des cas, mais gratuit à vérifier
     et ça évite un faux positif si deux implémentations partagent un nom ;
   - même `name` après normalisation (`trim().toLowerCase()`).

   C'est une heuristique pragmatique : elle suppose que l'utilisateur nomme
   identiquement un même client/indexer physique sur ses différents *arr
   (ce qui est l'usage courant — "qBittorrent", "Prowlarr - 1337x" — plutôt
   qu'un renommage différent par instance). Elle n'inspecte pas les champs de
   connexion dynamiques (`fields[]` : host/port/baseUrl/apiKey…) qui varient
   trop par implémentation pour un matching fiable en MVP. Si deux
   enregistrements partagent l'implémentation/protocole mais pas le nom, ils
   sont affichés comme deux cartes distinctes (pas de fusion silencieuse
   incorrecte).

   Implémentée comme fonction pure isolée (`computeMergeKey`), testée
   indépendamment de l'UI, pour pouvoir l'affiner plus tard (ex. comparer
   aussi `host`/`baseUrl` extrait de `fields[]`) sans toucher aux composants.

4. **Champs qui diffèrent par instance affichés par instance, jamais
   écrasés.** À l'intérieur d'une carte fusionnée, `enable`/`priority`
   (download clients) ou `enableRss`/`enableAutomaticSearch`/
   `enableInteractiveSearch`/`priority` (indexers) peuvent différer d'une
   instance à l'autre (ex. activé sur Radarr, désactivé sur Sonarr). Affichés
   comme une ligne par instance sous l'en-tête fusionné, jamais moyennés ou
   silencieusement pris depuis une seule instance.

5. **Deux pages séparées, pas un écran à onglets.** Cohérent avec le fait que
   ce sont deux ressources *arr distinctes (comme "Indexers" et "Download
   Clients" sont deux onglets séparés dans Radarr/Sonarr/Lidarr eux-mêmes),
   et ça garde chaque page/composant simple (une fonction de fusion, un type
   de carte). Deux entrées de nav admin-only, à côté de "Profiles".

6. **Aucun nouvel appel réseau ajouté au socle.** Réutilisation telle quelle
   de `BaseServarrClient` (retry, circuit breaker), `apiPathPrefix(kind)` et
   `classifyConnectionError`. Les payloads *arr sont typés en mode
   passthrough (`Record<string, unknown> & {...champs connus}`), comme
   `QualityProfileRecord` — `fields[]` n'est pas re-modélisé champ par champ.

7. **Pas de masquage additionnel des champs sensibles.** Les endpoints
   `/downloadclient` et `/indexer` des *arr renvoient déjà les valeurs de
   `fields[]` telles que l'API les expose (mots de passe/API keys en clair
   selon la version). Cette phase ne fait qu'un passthrough en lecture,
   derrière `adminOnly()` déjà en place sur tout `/api/settings` — même
   posture de sécurité que `listQualityProfiles` aujourd'hui. Aucune donnée
   supplémentaire n'est stockée côté app (pas de colonne, pas de cache
   persistant).

## Modèle de domaine

```ts
// domain/settings/interfaces/servarr-download-client-manager.interface.ts
export type DownloadClientRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  protocol: 'torrent' | 'usenet'
  enable: boolean
  priority: number
  fields?: Array<{ name: string; value?: unknown }>
}

export interface ServarrDownloadClientManager {
  list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<DownloadClientRecord[], ConnectionError>>
}
```

```ts
// domain/settings/interfaces/servarr-indexer-manager.interface.ts
export type IndexerRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  protocol: 'torrent' | 'usenet'
  enableRss: boolean
  enableAutomaticSearch: boolean
  enableInteractiveSearch: boolean
  priority: number
  fields?: Array<{ name: string; value?: unknown }>
}

export interface ServarrIndexerManager {
  list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<IndexerRecord[], ConnectionError>>
}
```

Implémentations HTTP (`infrastructure/servarr/download-client-manager.ts`,
`indexer-manager.ts`), mêmes conventions que
`infrastructure/servarr/quality-profile-manager.ts` :
`path(kind) = ${apiPathPrefix(kind)}/downloadclient` et `.../indexer`, schéma
Zod `.passthrough()`, `classifyConnectionError` sur erreur.

## Use cases (`application/settings/`)

| Use case | Entrée | Sortie | Notes |
|---|---|---|---|
| `ListDownloadClients` | `{ kind }` | `Result<DownloadClientRecord[], ConnectionError \| 'instance_not_found'>` | mirror exact de `ListQualityProfiles` |
| `ListIndexers` | `{ kind }` | `Result<IndexerRecord[], ConnectionError \| 'instance_not_found'>` | idem |

## Endpoints HTTP

Sous `/api/settings`, groupe `adminOnly`, `:kind ∈ {radarr,sonarr,lidarr}`.

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/instances/:kind/download-clients` | Liste les download clients de l'instance |
| `GET` | `/instances/:kind/indexers` | Liste les indexers de l'instance |

DI : `settings.downloadClientManager` / `settings.indexerManager` ajoutés dans
`backend/providers/settings_provider.ts`, mêmes conventions que
`settings.qualityProfileManager`.

## Fusion côté frontend (pure, testable indépendamment de l'UI)

```ts
// domain/settings/merge-servarr-records.ts
interface MergedRecord<T> {
  mergeKey: string
  name: string
  implementation: string
  protocol: 'torrent' | 'usenet'
  perInstance: Array<{ kind: ServarrKind; record: T }>
}

function computeMergeKey(implementation: string, protocol: string, name: string): string

function mergeByInstance<T extends { implementation: string; protocol: string; name: string }>(
  entries: Array<{ kind: ServarrKind; records: T[] }>,
): MergedRecord<T>[]
```

Une seule fonction générique réutilisée par les deux pages
(`mergeByInstance<DownloadClientRecord>` / `mergeByInstance<IndexerRecord>`).

## Frontend

- `domain/settings/download-client-record.ts` / `indexer-record.ts`.
- Nouvelles méthodes sur `ArrConnector`
  (`frontend/src/domain/interfaces/arr-connector.ts`) : `listDownloadClients`,
  `listIndexers` — implémentées dans `http-arr-connector.ts` (zod passthrough,
  schémas ajoutés à `schemas/settings.schema.ts`) et `fake-arr-connector.ts`
  (nouvelles fixtures, y compris des cas volontairement dupliqués entre kinds
  pour exercer la fusion en dev).
- `application/settings/download-clients.query.ts` (`useDownloadClients(kind)`,
  clé `['download-clients', kind]`) et `indexers.query.ts`
  (`useIndexers(kind)`, clé `['indexers', kind]`) — pattern
  `defineQuery`/`useDomainQuery` identique à `quality-profiles.query.ts`.
- `presentation/download-clients/download-clients-page.tsx` : récupère
  `useInstances()`, appelle `useDownloadClients(kind)` pour chaque kind
  configuré, passe le tout à `mergeByInstance`, affiche une carte par entrée
  fusionnée :
  - nom + badge implémentation + icône protocole (torrent/usenet) ;
  - un badge par instance présente (icône Radarr/Sonarr/Lidarr, réutilisant
    `SERVARR_META` de `profiles-page.tsx`) ;
  - si `enable`/`priority` diffère selon l'instance, une ligne par instance
    sous l'en-tête (sinon une seule ligne résumée).
  - Instance non configurée → même `UnconfiguredInstanceCard` que sur
    `/profiles`, avec lien vers `/settings`.
- `presentation/indexers/indexers-page.tsx` : même structure, avec
  `enableRss`/`enableAutomaticSearch`/`enableInteractiveSearch` affichés par
  instance au lieu de `enable`.
- `routes/download-clients/index.tsx`, `routes/indexers/index.tsx` :
  `beforeLoad` = `requireOnboarded` + `requireAdmin`, wrap `AppShell`, mirror
  exact de `routes/profiles/index.tsx`.
- `presentation/shared/app-shell.tsx` : deux nouvelles entrées de nav
  admin-only, "Download Clients" et "Indexers", à côté de "Profiles" et
  "Settings".

## Hors périmètre / non traité par cette phase

- Toute mutation (create/update/delete/test) sur un download client ou un
  indexer — reste à faire directement dans le *arr concerné.
- Vrai multi-instance par kind (toujours bloqué par `unique(kind)` sur
  `servarr_instances`, ADR-0006).
- Matching de fusion basé sur les champs de connexion (`host`/`baseUrl`
  extraits de `fields[]`) — le MVP ne matche que sur
  `implementation` + `protocol` + `name` normalisé. Si le besoin apparaît
  (ex. deux instances avec des noms différents pour le même client), on
  pourra étendre `computeMergeKey` sans toucher à l'UI.
- Association indexer ↔ download client (`downloadClientId` sur un indexer)
  — non affichée dans cette phase, uniquement le statut par ressource.
- Rafraîchissement automatique/polling périodique — même posture que
  `/profiles` : données rechargées à l'ouverture de page / invalidation
  manuelle de query, pas de nouveau mécanisme de synchronisation.
