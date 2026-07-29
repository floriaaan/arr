# Phase 4 — Download clients & indexers par instance *arr

Ajout de deux pages, **`/download-clients`** et **`/indexers`** (admin
uniquement, même emplacement que `/profiles`), permettant de **voir, créer,
éditer et supprimer** les download clients et les indexers de chaque instance
*arr (Radarr, Sonarr, Lidarr) — à la manière de `/profiles`, avec la même
logique CRUD-par-passthrough que les quality profiles (phase 3) : créer/éditer
depuis cette app écrit réellement l'enregistrement sur le *arr distant via son
API (`POST`/`PUT`/`DELETE .../downloadclient[/:id]` et `.../indexer[/:id]`),
il n'y a pas de table locale qui dupliquerait la donnée.

Différence structurante avec les quality profiles : un download client ou un
indexer n'a pas une poignée de champs connus et stables (root folder, quality
profile id…) mais un ensemble de champs **dynamique et propre à
l'implémentation choisie** (host/port/catégorie pour qBittorrent, clé API
pour SABnzbd, `baseUrl`+catégories pour un indexer Torznab, etc. — dizaines
d'implémentations possibles, schéma différent pour chacune). Le formulaire ne
peut donc pas être câblé à la main comme
`instance-profile-form-dialog.tsx` (qui a des champs fixes : nom, root
folder, select de cutoff…) ; il doit être **générique**, piloté par le schéma
que le *arr renvoie pour l'implémentation choisie (mêmes objets `fields[]`
que dans le "Add download client" natif de Radarr/Sonarr/Lidarr).

Second point de la demande, inchangé : si le **même** download client (ou le
même indexer) est branché sur plusieurs instances, il doit apparaître comme
**une seule carte fusionnée** listant les instances concernées, plutôt qu'en
double/triple. La fusion reste un regroupement **d'affichage** — chaque
mutation (create/update/delete) continue de cibler un enregistrement précis
sur une instance précise (cf. décision 4 plus bas).

## Portée

- Deux nouvelles pages, protégées par `requireAdmin` (même garde que
  `/profiles` et `/settings`), avec leurs entrées de nav dans `AppShell`.
- Backend : deux nouveaux ports `ServarrDownloadClientManager` /
  `ServarrIndexerManager` (list, getSchema, create, update, delete, test),
  implémentations HTTP, use cases correspondants, routes sous
  `/api/settings/instances/:kind/download-clients` et `.../indexers`.
- Frontend : deux nouveaux domaines de types, hooks `application/`, une
  fonction pure de fusion par ressource, un composant de formulaire
  **générique** réutilisé par les deux ressources, composants `presentation/`.
- Aucune nouvelle table de base de données (comme pour les quality profiles
  bruts — la donnée vit uniquement côté *arr, cette app ne fait que
  proxy/passthrough).

## Décisions

1. **CRUD complet, sans table locale — passthrough pur vers le *arr, comme
   `HttpServarrQualityProfileManager`.** Pas d'aggregate domaine type
   `InstanceProfile` ici : il n'y a rien à "fusionner en un objet local"
   puisqu'il n'existe pas de concept applicatif équivalent à "profil par
   défaut consommé par `CreateRequest`". Un download client / indexer reste
   entièrement une ressource du *arr distant ; cette app se contente de
   lister/créer/éditer/supprimer en passthrough, kind par kind.

2. **Formulaire générique piloté par le schéma, pas de champs câblés à la
   main.** `GET .../downloadclient/schema` (et `.../indexer/schema`) renvoie
   un tableau de **templates**, un par implémentation supportée
   (`QBittorrent`, `Transmission`, `Deluge`, `Sabnzbd`… / `Torznab`,
   `Newznab`, `Nyaa`…), chacun avec ses propres `fields[]` par défaut. Le flux
   de création est donc en deux étapes : (a) choisir une implémentation dans
   une liste (regroupée par `protocol`), (b) remplir un formulaire
   **généré dynamiquement** à partir de `fields[]` de ce template. Un
   composant partagé, `DynamicFieldsForm`, rend un input par field selon son
   `type` (`textbox`/`number`/`path` → input texte/nombre ; `checkbox` →
   switch ; `select` → `Select` avec `selectOptions` ; `password`/`apiKey`
   (`privacy`) → input masqué ; `tag` → simplifié en input texte
   virgule-séparée pour le MVP ; tout type non reconnu (`seedCriteria`,
   `device`, etc., rares et propres à quelques implémentations exotiques) →
   repli sur un textarea JSON brut, affiché mais non validé — limitation
   assumée et documentée dans le formulaire).

3. **Clé de fusion visuelle inchangée : `(implementation, protocol, name
   normalisé)`.** Comme dans la version précédente de cette spec — deux
   enregistrements de kinds différents partageant ces trois critères sont
   affichés comme une seule carte avec un badge par instance. Toujours une
   heuristique d'affichage (pas de comparaison des champs de connexion
   dynamiques), isolée dans une fonction pure `computeMergeKey` testée
   indépendamment de l'UI.

4. **Toute mutation cible une seule instance à la fois — pas d'édition en
   masse propagée aux autres instances du groupe fusionné.** Une carte
   fusionnée affiche une ligne par instance (comme `ProfileRow` dans
   `profiles-page.tsx`), chacune avec ses propres actions **Edit**/**Delete**
   qui n'agissent que sur l'enregistrement de cette instance précise
   (identifié par son `id` distant). Modifier la ligne "Radarr" d'une carte
   qBittorrent fusionnée ne touche pas l'enregistrement Sonarr. Raison : les
   trois enregistrements ne sont *pas garantis identiques* au-delà de la clé
   de fusion (ex. `category` diffère typiquement entre Radarr et Sonarr même
   pour "le même" client physique) — une propagation automatique risquerait
   d'écraser une configuration volontairement différente. Ce choix est
   documenté explicitement pour arbitrage : si l'usage réel montre que
   l'édition groupée serait plus pratique, elle pourra être ajoutée en phase
   suivante sans changer le modèle de fusion (affichage) ni les endpoints
   (déjà par-instance).

5. **"Cloner vers une autre instance" comme pont entre la fusion visuelle et
   la création.** Sur une carte fusionnée où toutes les instances configurées
   n'ont pas (encore) ce client/indexer, un bouton **Clone to
   &lt;Kind&gt;** pré-remplit le formulaire de création avec les valeurs d'une
   instance existante du groupe (implémentation + champs), sur l'instance
   manquante — l'utilisateur ajuste (ex. `category`) puis soumet une création
   normale sur cette instance. Ce n'est jamais un appel réseau multi-instance
   implicite : juste un pré-remplissage de formulaire, la création reste un
   `POST` unique explicite.

6. **Test de connexion avant sauvegarde, mêmes conventions que
   `test-connection` d'instance.** `POST .../downloadclient/test` (et
   `.../indexer/test`) exposé comme port `test(kind, baseUrl, apiKey,
   payload)`, bouton "Test" dans le dialogue de formulaire. Les échecs de
   validation renvoyés par le *arr (tableau `{propertyName, errorMessage}`)
   sont condensés en un seul message d'erreur (même simplification que
   `classifyConnectionError`/`testInstanceConnection` existants) plutôt que
   d'introduire un nouveau type d'union d'erreurs de validation par champ —
   limitation MVP assumée.

7. **Suppression par instance, confirmation nommant l'instance ciblée.**
   `DELETE .../downloadclient/:id` (ou `.../indexer/:id`) sur l'instance de
   la ligne cliquée uniquement, `AlertDialog` de confirmation précisant quelle
   instance est affectée (pas "supprimer partout").

8. **Toujours pas de vrai multi-instance par kind (ADR-0006 inchangée).**
   La fusion regroupe au plus 3 enregistrements (un par kind configuré),
   jamais plusieurs instances du même kind.

9. **Deux pages séparées, pas un écran à onglets.** Cohérent avec le fait que
   ce sont deux ressources *arr distinctes (comme "Indexers" et "Download
   Clients" sont deux onglets séparés dans Radarr/Sonarr/Lidarr eux-mêmes) et
   avec le composant `DynamicFieldsForm` partagé mais instancié séparément
   par page. Deux entrées de nav admin-only, à côté de "Profiles".

10. **Aucun nouvel appel réseau ajouté au socle.** Réutilisation telle quelle
    de `BaseServarrClient`, `apiPathPrefix(kind)`, `classifyConnectionError`.
    Payloads *arr en passthrough (`Record<string, unknown> & {...champs
    connus}`), comme `QualityProfileRecord`.

11. **Pas de masquage additionnel des champs sensibles.** Comme pour les
    quality profiles, les valeurs de `fields[]` (y compris mots de
    passe/API keys) transitent telles que le *arr les expose, derrière
    `adminOnly()` déjà en place sur tout `/api/settings`.

## Modèle de domaine

```ts
// domain/settings/servarr-field.vo.ts (partagé download client / indexer)
export interface ServarrField {
  name: string
  label?: string
  value?: unknown
  type?: string // 'textbox' | 'number' | 'path' | 'checkbox' | 'select' | 'password' | 'tag' | ...
  helpText?: string
  advanced?: boolean
  privacy?: 'normal' | 'password' | 'apiKey'
  selectOptions?: Array<{ value: number | string; name: string }>
}
```

```ts
// domain/settings/interfaces/servarr-download-client-manager.interface.ts
export type DownloadClientRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  configContract: string // requis par le *arr pour create/update, vient tel quel du schema
  protocol: 'torrent' | 'usenet'
  enable: boolean
  priority: number
  fields: ServarrField[]
}

export interface ServarrDownloadClientManager {
  list(kind, baseUrl, apiKey): Promise<Result<DownloadClientRecord[], ConnectionError>>
  getSchema(kind, baseUrl, apiKey): Promise<Result<DownloadClientRecord[], ConnectionError>>
  create(kind, baseUrl, apiKey, payload: DownloadClientRecord): Promise<Result<DownloadClientRecord, ConnectionError>>
  update(kind, baseUrl, apiKey, id, payload: DownloadClientRecord): Promise<Result<DownloadClientRecord, ConnectionError>>
  delete(kind, baseUrl, apiKey, id): Promise<Result<void, ConnectionError>>
  test(kind, baseUrl, apiKey, payload: DownloadClientRecord): Promise<Result<void, ConnectionError>>
}
```

```ts
// domain/settings/interfaces/servarr-indexer-manager.interface.ts
export type IndexerRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  configContract: string
  protocol: 'torrent' | 'usenet'
  enableRss: boolean
  enableAutomaticSearch: boolean
  enableInteractiveSearch: boolean
  priority: number
  fields: ServarrField[]
}

export interface ServarrIndexerManager {
  list(kind, baseUrl, apiKey): Promise<Result<IndexerRecord[], ConnectionError>>
  getSchema(kind, baseUrl, apiKey): Promise<Result<IndexerRecord[], ConnectionError>>
  create(kind, baseUrl, apiKey, payload: IndexerRecord): Promise<Result<IndexerRecord, ConnectionError>>
  update(kind, baseUrl, apiKey, id, payload: IndexerRecord): Promise<Result<IndexerRecord, ConnectionError>>
  delete(kind, baseUrl, apiKey, id): Promise<Result<void, ConnectionError>>
  test(kind, baseUrl, apiKey, payload: IndexerRecord): Promise<Result<void, ConnectionError>>
}
```

Implémentations HTTP (`infrastructure/servarr/download-client-manager.ts`,
`indexer-manager.ts`), mêmes conventions que
`quality-profile-manager.ts` : `path(kind, suffix) = ${apiPathPrefix(kind)}/downloadclient${suffix}`
et `.../indexer${suffix}`, schémas Zod `.passthrough()`,
`classifyConnectionError` sur erreur.

## Use cases (`application/settings/`)

| Use case | Entrée | Sortie | Notes |
|---|---|---|---|
| `ListDownloadClients` | `{ kind }` | `Result<DownloadClientRecord[], ConnectionError \| 'instance_not_found'>` | mirror de `ListQualityProfiles` |
| `GetDownloadClientSchema` | `{ kind }` | `Result<DownloadClientRecord[], ...>` | liste des templates par implémentation |
| `CreateDownloadClient` | `{ kind, payload }` | `Result<DownloadClientRecord, ...>` | |
| `UpdateDownloadClient` | `{ kind, id, payload }` | `Result<DownloadClientRecord, ...>` | |
| `DeleteDownloadClient` | `{ kind, id }` | `Result<void, ...>` | |
| `TestDownloadClient` | `{ kind, payload }` | `Result<void, ...>` | |
| `ListIndexers` / `GetIndexerSchema` / `CreateIndexer` / `UpdateIndexer` / `DeleteIndexer` / `TestIndexer` | idem | idem | même forme, ressource `indexer` |

## Endpoints HTTP

Sous `/api/settings`, groupe `adminOnly`, `:kind ∈ {radarr,sonarr,lidarr}`.

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/instances/:kind/download-clients` | Liste |
| `GET` | `/instances/:kind/download-clients/schema` | Templates par implémentation |
| `POST` | `/instances/:kind/download-clients` | Crée |
| `PUT` | `/instances/:kind/download-clients/:id` | Édite |
| `DELETE` | `/instances/:kind/download-clients/:id` | Supprime |
| `POST` | `/instances/:kind/download-clients/test` | Teste la connexion (payload en body) |
| `GET`/`POST`/`PUT`/`DELETE`/`POST .../test` | `/instances/:kind/indexers[...]` | Même forme pour les indexers |

DI : `settings.downloadClientManager` / `settings.indexerManager` ajoutés
dans `backend/providers/settings_provider.ts`, mêmes conventions que
`settings.qualityProfileManager`.

## Fusion à l'affichage (pure, testable indépendamment de l'UI)

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

Fonction générique réutilisée par les deux pages. Une carte = un
`MergedRecord`, une ligne par entrée de `perInstance` (édition/suppression
individuelles, cf. décision 4).

## Frontend

- `domain/settings/download-client-record.ts` / `indexer-record.ts` /
  `servarr-field.ts`.
- Nouvelles méthodes sur `ArrConnector` : `listDownloadClients`,
  `getDownloadClientSchema`, `createDownloadClient`, `updateDownloadClient`,
  `deleteDownloadClient`, `testDownloadClient` (+ équivalents `Indexer`) —
  implémentées dans `http-arr-connector.ts` (zod passthrough, schémas dans
  `schemas/settings.schema.ts`) et `fake-arr-connector.ts` (fixtures,
  y compris des doublons volontaires entre kinds pour exercer la fusion, et
  plusieurs templates d'implémentation pour exercer le formulaire générique).
- `application/settings/download-clients.query.ts`
  (`useDownloadClients(kind)`, clé `['download-clients', kind]`),
  `download-client-schema.query.ts` (`useDownloadClientSchema(kind, enabled)`),
  `create-download-client.mutation.ts`, `update-download-client.mutation.ts`,
  `delete-download-client.mutation.ts`, `test-download-client.mutation.ts` —
  pattern identique aux mutations de `instance-profiles`. Même liste côté
  `indexers.query.ts` / mutations `*-indexer.mutation.ts`.
- `presentation/shared/dynamic-fields-form.tsx` — **composant partagé**,
  rend un contrôle par `ServarrField` selon son `type`, gère l'état
  `fields[]` complet (tableau, pas d'objet à plat) ; utilisé par les deux
  dialogues ci-dessous.
- `presentation/download-clients/download-clients-page.tsx` : récupère
  `useInstances()`, appelle `useDownloadClients(kind)` par kind configuré,
  fusionne via `mergeByInstance`, une carte par entrée fusionnée avec :
  - nom + badge implémentation + icône protocole (torrent/usenet) ;
  - une ligne par instance présente : badge instance (icône
    Radarr/Sonarr/Lidarr, `SERVARR_META`), `enable`/`priority` de cette
    instance, actions Edit/Delete (mirror de `ProfileRow`) ;
  - bouton **Clone to &lt;Kind manquant&gt;** si le groupe ne couvre pas les
    3 instances configurées ;
  - bouton global "Add download client" (choix implémentation via
    `getDownloadClientSchema(kind)` d'une instance cible, puis
    `DynamicFieldsForm`).
  - Instance non configurée → `UnconfiguredInstanceCard` (comme
    `/profiles`), lien vers `/settings`.
- `presentation/indexers/indexers-page.tsx` : même structure, avec
  `enableRss`/`enableAutomaticSearch`/`enableInteractiveSearch` affichés par
  instance au lieu de `enable`.
- `routes/download-clients/index.tsx`, `routes/indexers/index.tsx` :
  `beforeLoad` = `requireOnboarded` + `requireAdmin`, wrap `AppShell`, mirror
  de `routes/profiles/index.tsx`.
- `presentation/shared/app-shell.tsx` : deux nouvelles entrées de nav
  admin-only, "Download Clients" et "Indexers", à côté de "Profiles" et
  "Settings".

## Hors périmètre / non traité par cette phase

- Édition/suppression groupée propagée à toutes les instances d'une carte
  fusionnée en un clic (cf. décision 4) — chaque mutation reste par instance ;
  seul le pré-remplissage "Clone" existe comme raccourci.
- Vrai multi-instance par kind (toujours bloqué par `unique(kind)` sur
  `servarr_instances`, ADR-0006).
- Matching de fusion basé sur les champs de connexion (`host`/`baseUrl`
  extraits de `fields[]`) — MVP : `implementation` + `protocol` + `name`
  normalisé uniquement.
- Association indexer ↔ download client (`downloadClientId` sur un indexer)
  — non gérée dans le formulaire de cette phase.
- Types de champs exotiques (`seedCriteria`, `device`, OAuth…) au-delà d'un
  repli JSON brut non validé dans `DynamicFieldsForm`.
- Rafraîchissement automatique/polling périodique — données rechargées à
  l'ouverture de page / invalidation manuelle de query après mutation.
