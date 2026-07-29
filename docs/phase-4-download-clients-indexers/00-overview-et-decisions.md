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

Second point de la demande : si le **même** download client (ou le même
indexer) est branché sur plusieurs instances, il doit apparaître comme **une
seule carte fusionnée** listant les instances concernées, plutôt qu'en
double/triple — et la carte fusionnée est **fusionnée par défaut** aussi pour
les actions (edit/delete/create s'appliquent au groupe entier en une seule
opération), avec une bascule explicite pour "démerger" une carte et gérer ses
instances indépendamment quand c'est nécessaire (cf. décision 4 plus bas).

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

4. **Fusionné par défaut : édition/suppression/création agissent sur le
   groupe entier, avec une bascule "Demerge" pour repasser en gestion
   par instance.** Une carte fusionnée est traitée comme une seule entité
   par défaut :
   - **Edit** ouvre **un seul formulaire**, pré-rempli à partir de
     l'enregistrement d'une instance de référence du groupe (la première
     configurée dans l'ordre radarr → sonarr → lidarr). Des cases à cocher —
     une par instance **configurée** (pas seulement celles déjà dans le
     groupe), toutes pré-cochées si déjà présentes dans le groupe —
     permettent de choisir où appliquer l'enregistrement. À la sauvegarde,
     seuls les champs **effectivement modifiés** par l'utilisateur (diff
     entre le formulaire et le snapshot de l'instance de référence) sont
     appliqués, par-dessus l'enregistrement propre de **chaque** instance
     cochée : un champ non touché (ex. `category`, souvent différente entre
     Radarr et Sonarr pour "le même" client) reste tel quel par instance,
     seul un champ explicitement changé (ex. `host`) est propagé identique
     partout. Cocher une instance qui n'a pas encore ce client/indexer
     déclenche une **création** dessus (avec les valeurs du formulaire),
     cocher une instance déjà dans le groupe déclenche une **mise à jour**
     diffée comme décrit — un seul formulaire couvre donc aussi bien
     l'édition que l'ajout aux instances manquantes. Chaque instance cochée
     reçoit un appel HTTP indépendant ; succès/échec rapportés par instance
     (toasts individuels), un échec sur une instance n'empêche pas les
     autres de réussir.
   - **Delete** sur la carte fusionnée supprime l'enregistrement sur toutes
     les instances du groupe par défaut (confirmation nommant chaque
     instance affectée), avec les mêmes cases à décocher pour exclure une
     instance de la suppression.
   - **Demerge** : un bouton sur la carte fait basculer son affichage —
     elle se scinde en une ligne par instance (comme `ProfileRow` dans
     `profiles-page.tsx`), chacune avec ses propres actions Edit/Delete
     strictement indépendantes (n'affecte que cette instance). Bascule
     purement côté client (état de composant, ensemble de `mergeKey`
     "démergées" pour la session de navigation) — **pas persistée
     côté backend**, pas de nouvelle table : au rechargement de la page, le
     regroupement est recalculé depuis `computeMergeKey` et la carte
     réapparaît fusionnée par défaut, jusqu'à ce que l'utilisateur
     redémerge. C'est un simple mode d'affichage alternatif pour gérer
     ponctuellement une instance isolément, pas une exclusion permanente.
   - **Création depuis zéro** ("Add download client"/"Add indexer") suit le
     même modèle : cases à cocher pré-cochées pour **toutes** les instances
     configurées, un seul formulaire, un `POST` indépendant par instance
     cochée. Décocher toutes sauf une revient à créer sur une seule
     instance (équivalent de l'ancien mode "démergé" à la création).

5. **Test de connexion avant sauvegarde, mêmes conventions que
   `test-connection` d'instance.** `POST .../downloadclient/test` (et
   `.../indexer/test`) exposé comme port `test(kind, baseUrl, apiKey,
   payload)`, bouton "Test" dans le dialogue de formulaire — testé une fois
   par instance cochée. Les échecs de validation renvoyés par le *arr
   (tableau `{propertyName, errorMessage}`) sont condensés en un seul message
   d'erreur (même simplification que
   `classifyConnectionError`/`testInstanceConnection` existants) plutôt que
   d'introduire un nouveau type d'union d'erreurs de validation par champ —
   limitation MVP assumée.

6. **Toujours pas de vrai multi-instance par kind (ADR-0006 inchangée).**
   La fusion regroupe au plus 3 enregistrements (un par kind configuré),
   jamais plusieurs instances du même kind.

7. **Deux pages séparées, pas un écran à onglets.** Cohérent avec le fait que
   ce sont deux ressources *arr distinctes (comme "Indexers" et "Download
   Clients" sont deux onglets séparés dans Radarr/Sonarr/Lidarr eux-mêmes) et
   avec le composant `DynamicFieldsForm` partagé mais instancié séparément
   par page. Deux entrées de nav admin-only, à côté de "Profiles".

8. **Aucun nouvel appel réseau ajouté au socle.** Réutilisation telle quelle
   de `BaseServarrClient`, `apiPathPrefix(kind)`, `classifyConnectionError`.
   Payloads *arr en passthrough (`Record<string, unknown> & {...champs
   connus}`), comme `QualityProfileRecord`.

9. **Pas de masquage additionnel des champs sensibles.** Comme pour les
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
`MergedRecord`. Une fonction complémentaire calcule le diff utilisé par
l'édition groupée (décision 4) :

```ts
// domain/settings/diff-servarr-record.ts
/** Champs présents dans `edited` dont la valeur diffère de `reference`. */
function diffFields<T extends { fields: ServarrField[] }>(reference: T, edited: T): Partial<T>

/** Applique le diff par-dessus l'enregistrement propre de chaque instance ciblée. */
function applyDiff<T extends { fields: ServarrField[] }>(target: T, diff: Partial<T>): T
```

`applyDiff` fusionne `fields[]` par `name` (remplace la valeur des champs
présents dans `diff.fields`, laisse les autres champs de `target` intacts) —
c'est ce qui garantit qu'un `category` par-instance non touché survit à une
édition groupée qui ne change que `host`.

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
- `domain/settings/diff-servarr-record.ts` — `diffFields`/`applyDiff` (cf.
  ci-dessus), purs, testés indépendamment de l'UI.
- `presentation/shared/dynamic-fields-form.tsx` — **composant partagé**,
  rend un contrôle par `ServarrField` selon son `type`, gère l'état
  `fields[]` complet (tableau, pas d'objet à plat) ; utilisé par les deux
  dialogues ci-dessous.
- `presentation/shared/merged-record-card.tsx` — **composant partagé** par
  les deux pages, deux modes d'affichage pour un `MergedRecord` :
  - **Fusionné (par défaut)** : un en-tête (nom, badge implémentation, icône
    protocole) + un badge par instance présente (icône Radarr/Sonarr/Lidarr,
    `SERVARR_META`) + actions **Edit**/**Delete** groupées ; un lien
    "Demerge" bascule vers le mode suivant.
  - **Démergé** : la carte se scinde en une ligne par instance (mirror de
    `ProfileRow`), actions Edit/Delete strictement par instance ; un lien
    "Merge back" repasse en mode fusionné (recalcul immédiat, pas d'appel
    réseau).
  - État du mode (fusionné/démergé) tenu par `mergeKey` dans un `Set` au
    niveau de la page — perdu au reload (non persisté, cf. décision 4).
  - Le dialogue Edit/Add (fusionné) affiche une case à cocher par instance
    **configurée** (pas seulement celles du groupe), pré-remplit le
    formulaire depuis l'instance de référence, calcule `diffFields` à la
    sauvegarde et appelle `createDownloadClient`/`updateDownloadClient` (ou
    `Indexer`) par instance cochée selon qu'elle est déjà dans le groupe ou
    non.
- `presentation/download-clients/download-clients-page.tsx` : récupère
  `useInstances()`, appelle `useDownloadClients(kind)` par kind configuré,
  fusionne via `mergeByInstance`, rend un `MergedRecordCard` par entrée
  fusionnée, plus un bouton global "Add download client" (choix
  implémentation via `getDownloadClientSchema(kind)` d'une instance de
  référence, puis `DynamicFieldsForm` + cases à cocher toutes les instances
  configurées). Instance non configurée → `UnconfiguredInstanceCard` (comme
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

- Persistance du mode "démergé" au-delà de la session de navigation (pas de
  colonne/table pour retenir qu'un utilisateur a choisi de démerger telle
  carte — recalculé fusionné par défaut à chaque chargement de page).
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
