# Phase 5 — Quality of life

Lot d'améliorations de confort, sans nouveau domaine métier majeur, sauf un :
la déclaration des **serveurs média** (Plex / Jellyfin / Emby) pour pouvoir
rebondir depuis le détail d'un item vers l'instance qui le lit.

Cinq chantiers, indépendants les uns des autres :

1. Thème sombre, suivant le système par défaut.
2. Serveurs média (Plex/Jellyfin/Emby) déclarés dès l'onboarding, et liens
   correspondants dans le détail d'un item.
3. Micro-animations de scale (hover/active) sur les éléments cliquables.
4. Rework de la page `/calendar` : badge de comptage dans les cases, timeline
   verticale sous la grille.
5. Divers : raccourci clavier de la palette de recherche, sélecteur de thème.

Comme les phases 2 à 4, ce document fige les décisions avant l'implémentation ;
elles restent réversibles.

## Portée

- **Aucune** modification des contrats *arr existants (Radarr/Sonarr/Lidarr) :
  les serveurs média sont un concept neuf, séparé, qui ne passe par aucun
  adapter `servarr`.
- Backend : une table `media_servers`, un aggregate + repository, trois use
  cases, un endpoint de lecture pour tout utilisateur connecté et deux
  endpoints d'écriture admin (+ un dans l'onboarding).
- Frontend : provider de thème, un domaine `media-server`, quatre méthodes de
  connecteur, une étape d'onboarding, un panneau de settings, des liens dans
  `MediaDetailDrawer`, un rework de `calendar-grid.tsx` + un nouveau composant
  de timeline, et une passe d'animations sur les composants cliquables.

---

## 1. Thème sombre suivant le système

### État actuel

`styles.css` définit déjà **tout** le jeu de variables `.dark` (lignes 65-118 :
tokens shadcn + palette maison `--sea-ink`, `--lagoon`, `--foam`…), et
`presentation/ui/sonner.tsx` appelle déjà `useTheme()` de `next-themes`
(dépendance déjà installée). Mais **aucun `ThemeProvider` n'est monté** : la
classe `.dark` n'est jamais posée sur `<html>`, donc tout ce bloc CSS est mort,
et `useTheme()` retombe systématiquement sur son défaut `'system'` sans jamais
observer quoi que ce soit. Il n'y a donc rien à concevoir côté palette — juste
à brancher le provider.

### Décisions

1. **`next-themes`, pas d'implémentation maison.** La dépendance est déjà là et
   déjà consommée par le Toaster ; écrire un contexte maison créerait deux
   sources de vérité pour la même information.

2. **`defaultTheme="system"` + `enableSystem`, `attribute="class"`.** Le
   `@custom-variant dark (&:is(.dark *))` de `styles.css` et les dizaines de
   classes `dark:` déjà présentes dans `presentation/ui/*` supposent une
   stratégie par classe, pas par `data-theme`. Le choix explicite de
   l'utilisateur (`light`/`dark`) est persisté par `next-themes` dans
   `localStorage` (clé `arr-theme`) ; sans choix explicite, c'est
   `prefers-color-scheme` qui décide, en direct.

3. **Pas de persistance côté serveur.** Le thème est une préférence d'appareil,
   pas de compte : aucune colonne ajoutée à `users`, aucun endpoint. Corollaire
   assumé : la préférence ne suit pas l'utilisateur d'un navigateur à l'autre.

4. **Anti-flash via le script inline de `next-themes`.** `<html>` reçoit
   `suppressHydrationWarning` (obligatoire : le script pose la classe avant
   l'hydratation React, ce que React signalerait sinon comme un mismatch).
   Aucune solution cookie/SSR n'est introduite pour ça — `next-themes` couvre
   déjà le cas.

5. **`color-scheme` déclaré en CSS** (`:root { color-scheme: light }` /
   `.dark { color-scheme: dark }`), pour que les contrôles natifs (scrollbars,
   `input[type=date]`, autofill) suivent le thème. Sans ça, un thème sombre
   garde des scrollbars claires.

6. **Sélecteur à trois états, pas une bascule à deux.** Un `Select` compact
   Light / Dark / System : avec une bascule à deux états, revenir à "suivre le
   système" après un choix explicite devient impossible. Placé dans le pied de
   la sidebar de `AppShell` (à côté du bouton de déconnexion) et, en dehors de
   la coquille applicative, sur `/login` et `/setup` (coin supérieur droit) —
   sinon l'onboarding entier se fait sans accès au réglage.

7. **Fond de page à retoucher.** `body::before`/`body::after` empilent des
   dégradés blancs à opacité fixe (`rgba(255,255,255,.8)`, grille blanche à
   14 %) qui délavent le fond en thème sombre. Ils passent sous des variables
   (`--glow-a`, `--grid-line`) redéfinies dans `.dark`, plutôt qu'en dur.

---

## 2. Serveurs média (Plex / Jellyfin / Emby)

### Besoin

Depuis le détail d'un item déjà présent en bibliothèque, pouvoir ouvrir ce
titre dans le serveur qui le diffuse. Aujourd'hui `MediaDetailDrawer` sait dire
"géré par telle instance Radarr, tel root folder, tel quality profile" mais ne
propose aucun rebond vers le lecteur.

### Décisions

1. **Un enregistrement = une URL, aucun secret stocké.** L'app ne construit
   que des **liens**, elle n'appelle jamais l'API de Plex/Jellyfin/Emby. Donc
   ni token Plex, ni clé API Jellyfin/Emby en base : pas de colonne chiffrée,
   pas de `encryptSecret`, pas de test de connexion, pas de health check. C'est
   la différence structurante avec `servarr_instances`, et ça retire tout le
   plumbing correspondant. Contrepartie assumée : impossible de vérifier
   qu'une URL saisie est correcte, et impossible de savoir si l'item existe
   réellement sur le serveur (cf. décision 3).

2. **Une instance par kind**, `unique(kind)` sur `media_servers`, strictement
   comme ADR-0006 pour les *arr. Trois serveurs média déclarables au maximum.

3. **Liens de recherche par titre, pas de deep-link par identifiant.** Cette
   app connaît les identifiants TMDb/TVDb/MusicBrainz d'un item, pas son
   `ratingKey` Plex ni son `ItemId` Jellyfin/Emby. Les résoudre demanderait un
   token et un appel API par item affiché — ce que la décision 1 exclut. Les
   liens ciblent donc la **recherche** du serveur, pré-remplie avec le titre :

   | Kind | URL |
   |---|---|
   | `plex` | `{baseUrl}/web/index.html#!/search?query={titre}` |
   | `jellyfin` | `{baseUrl}/web/index.html#!/search.html?query={titre}` |
   | `emby` | `{baseUrl}/web/index.html#!/search.html?query={titre}` |

   Le titre est encodé via `encodeURIComponent`. La construction vit dans une
   fonction **pure** du domaine frontend (`domain/settings/media-server-link.ts`),
   testée indépendamment de l'UI — c'est la seule vraie logique de cette
   fonctionnalité.

4. **Liens affichés uniquement si l'item est déjà en bibliothèque**
   (`detail.alreadyManaged`). Renvoyer vers la recherche Plex d'un film pas
   encore téléchargé ne donnerait qu'une page vide.

5. **Lecture ouverte à tout utilisateur connecté, écriture réservée aux
   admins.** `MediaDetailDrawer` est utilisé par tout le monde (palette de
   recherche, library, calendar) : l'endpoint de lecture est donc sous
   `authRequired`, pas sous `adminOnly`, sinon les liens n'apparaîtraient que
   pour les admins. Il n'expose que `{ id, kind, baseUrl, enabled }` — aucun
   secret n'existe sur cet objet (décision 1), et l'URL de base d'une instance
   est déjà exposée à tout utilisateur connecté par le bloc "Instance" du
   drawer pour les *arr.

6. **Un seul endpoint de lecture**, partagé par le drawer et le panneau
   d'administration, plutôt qu'un `/api/media-servers` public et un
   `/api/settings/media-servers` admin qui renverraient exactement la même
   charge utile. Le flag `enabled` sert au filtrage d'affichage côté client
   (masquer un serveur sans supprimer son URL).

7. **Déclarable pendant l'onboarding**, dans une étape dédiée
   ("Media servers"), après "Services" et avant "Single sign-on" — l'étape est
   entièrement facultative et ne modifie pas `OnboardingState` (contrairement
   à `PUT /api/onboarding/instances/:kind` qui déclenche
   `MarkServicesConfigured`) : un serveur média ne rend pas l'app
   fonctionnelle, seule une instance *arr le fait, et `CompleteOnboarding`
   continue d'exiger une instance *arr active.

### Modèle de domaine (backend)

```ts
// domain/settings/media-server-kind.vo.ts
export type MediaServerKind = 'plex' | 'jellyfin' | 'emby'

// domain/settings/media-server.aggregate.ts
interface MediaServerProps {
  kind: MediaServerKind
  baseUrl: Url        // VO existante, réutilisée telle quelle
  enabled: boolean
}

class MediaServer extends AggregateRoot<string> {
  static create(id, kind, baseUrl): MediaServer   // enabled: true par défaut
  static reconstruct(id, props): MediaServer
  updateBaseUrl(baseUrl: Url): void
  enable(): void
  disable(): void
}

// domain/settings/interfaces/media-server-repository.interface.ts
interface MediaServerRepository {
  findAll(): Promise<MediaServer[]>
  findByKind(kind: MediaServerKind): Promise<MediaServer | null>
  save(server: MediaServer): Promise<void>
  delete(id: string): Promise<void>
}
```

Pas de `Result` sur `enable()` (contrairement à `ServarrInstance.enable()`, qui
exige un health check réussi et une configuration complète) : il n'y a ni
health check ni configuration à valider ici.

### Table

```
media_servers
  id          uuid primary key
  kind        text not null      -- check in ('plex','jellyfin','emby')
  base_url    text not null
  enabled     boolean not null default true
  created_at  timestamptz not null
  updated_at  timestamptz not null
  unique (kind)
```

### Use cases (`application/settings/`)

| Use case | Entrée | Sortie |
|---|---|---|
| `ListMediaServers` | — | `MediaServer[]` |
| `SaveMediaServer` | `{ kind, baseUrl, enabled }` | `Result<MediaServer, ValidationError>` (upsert par `kind`) |
| `DeleteMediaServer` | `{ kind }` | `void` (no-op si absent) |

### Endpoints HTTP

| Méthode | Route | Garde | Description |
|---|---|---|---|
| `GET` | `/api/media-servers` | `authRequired` | `{ mediaServers: MediaServerDto[] }` |
| `PUT` | `/api/settings/media-servers/:kind` | `adminOnly` | body `{ baseUrl, enabled }` → `{ mediaServer }` |
| `DELETE` | `/api/settings/media-servers/:kind` | `adminOnly` | 204 |
| `PUT` | `/api/onboarding/media-servers/:kind` | `onboardingGuard` | idem `PUT settings`, sans effet sur `OnboardingState` |

`MediaServerDto = { id, kind, baseUrl, enabled }`.

DI : `settings.mediaServerRepository` ajouté dans
`backend/providers/settings_provider.ts`.

### Frontend

- `domain/settings/media-server.ts` — `MediaServerKind`, `MediaServerDto`,
  `MediaServerDraft`.
- `domain/settings/media-server-link.ts` — `buildMediaServerSearchUrl(server,
  title): string`, pure, testée (cf. décision 3).
- `ArrConnector` + 4 méthodes : `listMediaServers`, `saveMediaServer`,
  `deleteMediaServer`, `saveOnboardingMediaServer` — implémentées dans
  `http-arr-connector.ts` et `fake-arr-connector.ts`, couvertes par
  `tests/contract/arr-connector.contract.spec.ts`.
- `application/settings/media-servers.query.ts`,
  `save-media-server.mutation.ts`, `delete-media-server.mutation.ts`.
- `presentation/settings/media-server-form.tsx` — un formulaire par kind
  (URL + switch "Enabled" + suppression), réutilisé par l'onboarding et par
  les settings, sur le modèle de `ServiceInstanceForm`.
- `presentation/settings/onboarding/media-servers-step.tsx` — nouvelle étape,
  `STEPS` de `routes/setup/index.tsx` passe à 6 entrées.
- `presentation/settings/settings-panels.tsx` — nouvel onglet "Media servers".
- `presentation/catalog/media-detail-drawer.tsx` — une rangée de boutons
  "Ouvrir dans Plex/Jellyfin/Emby" (`target="_blank" rel="noreferrer"`,
  icône `ExternalLink`), affichée sous les métadonnées quand
  `alreadyManaged` et qu'au moins un serveur média est activé.

---

## 3. Micro-animations de scale

### Décisions

1. **Une seule utilitaire CSS, `.tap-scale`**, définie dans `styles.css` :
   `hover:scale(1.02)` / `active:scale(0.97)`, appliquée aux éléments
   cliquables. Pas de classes Tailwind `hover:scale-*` recopiées composant par
   composant : le réglage doit rester modifiable en un seul endroit.

2. **Amplitudes volontairement faibles** (2 % au survol, 3 % à l'appui) et
   `transform` déjà présent dans la transition globale de `styles.css`
   (`button, .island-shell, a { transition: … transform 180ms ease }`), donc
   aucune nouvelle règle de transition.

3. **`prefers-reduced-motion: reduce` neutralise l'effet** (`transform: none`),
   dans le même bloc — non négociable pour une animation liée au pointeur.

4. **Périmètre d'application** : `Button` (classe de base du `cva`),
   `PosterCard`, `LibraryCard`/`LibraryListItem`, les cartes-boutons de
   `settings-panels.tsx` et `merged-record-card.tsx`, les entrées cliquables
   de la grille et de la timeline du calendrier. Explicitement **exclus** : les
   éléments de nav de la sidebar (déjà soulignés/colorés au survol, un scale
   ferait bouger toute la colonne), les lignes de tableau, les `TabsTrigger`
   (le fond glissant sert déjà de retour visuel).

---

## 4. Rework de `/calendar`

### État actuel

`calendar-grid.tsx` rend une grille 7×6 ; chaque case liste au plus 3 entrées
sous forme de boutons `bg-secondary`, puis un texte brut `+N more` — non
cliquable, et sans hiérarchie visuelle par rapport aux entrées elles-mêmes. Les
entrées au-delà de la troisième sont donc **inaccessibles**.

### Décisions

1. **Badge de comptage dans la case, à la place du texte `+N more`.** Le
   numéro du jour et un `Badge` (variant `secondary`, comptage total des
   entrées du jour) partagent la ligne d'en-tête de la case. Le "+N" disparaît
   au profit de ce badge, qui est présent dès qu'il y a au moins une entrée —
   l'information "combien" ne dépend plus du dépassement de la limite
   d'affichage.

2. **Le jour courant est marqué** (pastille pleine sur le numéro), ce qui
   manquait complètement.

3. **Timeline verticale sous la grille**, et c'est elle qui résout le problème
   d'accessibilité des entrées tronquées : elle liste **toutes** les entrées du
   mois affiché (filtre kind courant inclus), groupées par jour, triées
   chronologiquement — rien n'est plus caché derrière un "+N more". Structure :
   un rail vertical, une pastille par jour, la date en en-tête de groupe, puis
   une carte par entrée (poster miniature 32×48, titre, sous-titre `S01E02`,
   badges "Downloaded"/"Missing" et "Unmonitored"). Clic → même
   `MediaDetailDrawer` que la grille.

4. **Un seul état partagé** entre grille et timeline (mois courant, onglet
   kind, entrée sélectionnée) — la timeline est un composant de présentation
   pur (`presentation/calendar/calendar-timeline.tsx`) qui reçoit ses entrées
   déjà filtrées et un `onSelect`, sans requête propre : la query
   `useCalendar(start, end)` existante couvre déjà exactement la plage
   affichée.

5. **Groupement par jour = fonction pure**
   (`groupEntriesByDay(entries): Array<{ dateKey, entries }>`), colocalisée
   avec la timeline et testable sans DOM. Les jours sans entrée sont omis (une
   timeline n'a pas à représenter le vide, contrairement à une grille).

6. **Pas de vue "semaine"/"agenda" commutable**, pas de drag & drop, pas de
   navigation clavier dans la grille — hors périmètre de ce lot.

---

## 5. Divers

1. **Raccourci clavier de la palette de recherche.** `⌘K` / `Ctrl+K` ouvre la
   `CommandPalette` depuis n'importe quelle page de `AppShell` ; le bouton
   "Search catalog" de la sidebar affiche le raccourci dans un `<kbd>`. Le
   listener est posé par `AppShell` (qui détient déjà l'état `searchOpen`) et
   ignore les frappes émises depuis un `input`/`textarea`/champ éditable.

2. **Sélecteur de thème** — cf. chantier 1, décision 6.

---

## Hors périmètre

- Deep-link par identifiant vers Plex/Jellyfin/Emby (nécessite token + appels
  API, cf. chantier 2 décision 3) ; a fortiori, aucun état de lecture (vu / en
  cours / progression) n'est remonté depuis le serveur média.
- Test de connexion / health check des serveurs média.
- Plusieurs serveurs média du même kind (ADR-0006 étendue telle quelle).
- Préférence de thème synchronisée par compte utilisateur.
- Vue semaine/agenda, drag & drop, navigation clavier dans le calendrier.
- Animations au-delà du scale hover/active (transitions de page, `view
  transitions`, skeleton animés) — non traitées ici.

## Découpage des tâches

1. Backend : migration `media_servers`, domaine (`MediaServerKind`,
   `MediaServer`, port repository), infra (modèle Lucid, mapper, repository),
   DI.
2. Backend : use cases + DTO + validateur + routes (settings, onboarding,
   lecture) + mise à jour de `docs/phase-0/04-endpoints-http.md`.
3. Frontend : domaine `media-server` + `media-server-link` (+ test unitaire),
   `ArrConnector` (4 méthodes, `Http` + `Fake`), contract spec.
4. Frontend : hooks `application/`, `media-server-form`, étape d'onboarding,
   onglet de settings, liens dans `MediaDetailDrawer`.
5. Frontend : `ThemeProvider` + sélecteur + variables CSS de fond
   (chantier 1).
6. Frontend : `.tap-scale` + application (chantier 3).
7. Frontend : rework `calendar-grid.tsx` + `calendar-timeline.tsx`
   (+ test de `groupEntriesByDay`).
8. Frontend : raccourci `⌘K` (chantier 5).
9. Vérification : `task check` (backend + frontend).
