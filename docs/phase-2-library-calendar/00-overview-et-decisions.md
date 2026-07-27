# Phase 2 — Library & Calendar

Ajout de deux pages : `/library` (tout ce qui est déjà géré par les instances
Radarr/Sonarr/Lidarr — distinct de `/requests`, qui ne suit que les demandes
faites depuis cette app) et `/calendar` (sorties/épisodes à venir, agrégées sur
toutes les instances).

Contrairement à Phase 0 (cadrage pur) et comme Phase 5 (frontend), ce document
fige les décisions pour ne pas bloquer l'implémentation ; elles restent
réversibles.

Investigation préalable : le backend n'expose aujourd'hui **aucun** endpoint de
listing complet (`GET /api/v3/movie`, `/series`) ni de calendrier
(`/api/v3/calendar`, Lidarr `/api/v1/calendar`) — seulement `lookup`
(recherche), `create` (POST, provisioning côté `/api/requests`) et `queue`
(progress). C'est donc une feature full-stack neuve, pas juste du câblage
frontend sur un endpoint déjà là.

## Portée

- Deux pages neuves : `/library` (grille de posters, ce qui existe déjà côté
  *arr) et `/calendar` (grille mensuelle, sorties à venir/passées).
- Backend : nouveaux ports domaine + méthodes d'adapter par kind + nouvelles
  routes `/api/library` et `/api/calendar`, en réutilisant `BaseServarrClient`
  et `ServarrRegistry` existants (aucun nouveau client HTTP bas niveau).
- Frontend : nouveaux types domaine, 2 méthodes sur `ArrConnector`
  (`listLibrary`, `getCalendar`), hooks `application/`, pages `presentation/` +
  `routes/`, entrées nav, fixtures fake.

## Décisions

1. **Full-stack maintenant.** Backend (AdonisJS) et frontend implémentés
   ensemble, pas de report du backend en tâche séparée — la feature n'a pas de
   sens en frontend-only puisque le backend ne propose actuellement aucune
   donnée library/calendar, même en façade.

2. **Calendar en vraie grille mensuelle**, pas une agenda-liste. Plus proche du
   calendrier natif Radarr/Sonarr (grille 7×6, jours hors-mois grisés,
   navigation mois précédent/suivant), au prix d'un composant UI plus lourd
   qu'une simple liste chronologique.

3. **Les 3 services dès le départ.** Radarr/Sonarr/Lidarr couverts en une
   passe, malgré le modèle artist→album plus complexe de Lidarr (pas de single
   endpoint plat comme `GET /api/v3/movie` — nécessite de combiner
   `/api/v1/artist` et `/api/v1/album`).

4. **Modèle de domaine** (mirroring le contrat `ArrConnector` existant,
   `frontend/src/domain/interfaces/arr-connector.ts`) :

   ```ts
   // domain/library/library-item.ts
   interface LibraryItem {
     externalId: ExternalId
     kind: MediaKind
     title: string
     year: number | null
     posterUrl: string | null
     monitored: boolean
     hasFile: boolean
     sizeOnDiskBytes: number
     status: string // miroir brut du champ *arr, pas de logique métier côté front
     instanceId: string
   }

   // domain/calendar/calendar-entry.ts
   type CalendarEntryKind = 'movie' | 'episode' | 'album'
   interface CalendarEntry {
     id: string
     kind: CalendarEntryKind
     title: string
     subtitle: string | null // ex: "S02E05" pour un épisode Sonarr
     releaseDate: string // ISO date, sans heure — les 3 *arr exposent des dates, pas des horaires fiables
     posterUrl: string | null
     monitored: boolean
     hasFile: boolean
     instanceId: string
   }
   ```

   Ajouts au contrat `ArrConnector` :

   ```ts
   listLibrary: (kind?: MediaKind) => Promise<LibraryItem[]>
   getCalendar: (startDate: string, endDate: string) => Promise<CalendarEntry[]>
   ```

   `startDate`/`endDate` en `YYYY-MM-DD`, bornes de la grille mensuelle
   affichée (6 semaines complètes, comme un calendrier natif — inclut donc
   quelques jours du mois précédent/suivant pour remplir la grille).

5. **Backend — réutilisation totale de l'infra `servarr` existante.** Aucun
   nouveau client HTTP : `BaseServarrClient` et `ServarrRegistry`
   (`backend/src/infrastructure/servarr/`) sont réutilisés tels quels, seules
   de nouvelles méthodes sont ajoutées aux 3 adapters existants.

   - Nouveau port `backend/src/domain/catalog/interfaces/media-library.interface.ts` :
     `MediaLibrary { list(kind: MediaKind): Promise<LibraryItemDto[]>; calendar(start: Date, end: Date): Promise<CalendarEntryDto[]> }`,
     implémenté par une nouvelle classe infra (miroir de `ServarrMediaLookup`),
     ex. `backend/src/infrastructure/servarr/servarr-media-library.ts`.
   - `ServarrKindAdapter` (`servarr-kind-adapter.interface.ts`) gagne
     `list(): Promise<LibraryItem[]>` et
     `calendar(start: Date, end: Date): Promise<CalendarEntry[]>` :
     - `RadarrAdapter` : `GET /api/v3/movie` (list),
       `GET /api/v3/calendar?start=&end=` (calendar).
     - `SonarrAdapter` : `GET /api/v3/series` (list — un item par série, pas
       par épisode ; "library series" ≠ "calendar episodes"),
       `GET /api/v3/calendar?start=&end=&includeSeries=true`.
     - `LidarrAdapter` : `GET /api/v1/artist` + `GET /api/v1/album` pour
       reconstituer la liste albums (point ouvert, cf. section suivante) ;
       `GET /api/v1/calendar?start=&end=`.
     - Chaque nouvelle méthode suit le pattern existant : schéma Zod dédié
       dans `<kind>.schemas.ts`, mapping dans `<kind>.mapper.ts`
       (`toLibraryItem`, `toCalendarEntry`), erreurs via
       `classifyProvisioningError` si applicable.
   - Nouvelles routes, même convention que `requests.routes.ts` :
     - `backend/src/presentation/library/library.routes.ts` →
       `GET /api/library?kind=` (`middleware.authRequired()`) → si `kind`
       fourni, résout une seule instance via `ServarrRegistry.resolveByKind` ;
       sinon, agrège les 3 (kinds sans instance active/enabled → simplement
       omis, pas d'erreur).
     - `backend/src/presentation/calendar/calendar.routes.ts` →
       `GET /api/calendar?start=&end=` (`middleware.authRequired()`) → agrège
       toujours les 3 kinds en parallèle (`Promise.all`), erreurs par instance
       isolées (une instance en panne ne doit pas faire échouer les 2 autres —
       logguer et renvoyer un sous-ensemble partiel).
   - Use-cases : `backend/src/application/library/list-library.use-case.ts`,
     `backend/src/application/calendar/get-calendar.use-case.ts` — mirroring
     `create-request.use-case.ts` (résolution registry → appel adapter →
     mapping DTO).
   - Mise à jour de `docs/phase-0/04-endpoints-http.md` avec les 2 nouvelles
     entrées (même format que les entrées `Catalog`/`Requests` existantes).

6. **Frontend — mirroring des patterns déjà en place**, pas de nouvelle
   dépendance.

   - `application/library/library.query.ts` — `useLibrary(kind?)`, pattern
     `defineQuery`/`useDomainQuery` (cf. `requests.query.ts`). Pas de polling
     (contrairement aux requests) : refetch normal React Query.
   - `application/calendar/calendar.query.ts` — `useCalendar(monthDate: Date)`,
     calcule `startDate`/`endDate` de la grille 6-semaines à partir du mois
     affiché.
   - `presentation/library/` :
     - `library-grid.tsx` — grille de posters, réutilise
       `PosterCard`/`PosterGrid` (`presentation/shared/poster-card.tsx`,
       `poster-grid.tsx`) en étendant `PosterCard` (ou une variante
       `LibraryCard`) pour afficher un badge monitored/missing au lieu de "In
       library".
     - Filtre par kind : réutilise exactement le pattern `Tabs` déjà posé dans
       `requests-timeline.tsx` (`KIND_TABS`) — mêmes icônes lucide
       (`Clapperboard`/`Tv`/`Music`).
   - `presentation/calendar/` :
     - `calendar-grid.tsx` — grille 7 colonnes × 6 lignes construite à la main
       (`Date` natif, pas de nouvelle dépendance — le projet n'a ni
       `date-fns` ni `react-day-picker` installés, et le style du repo
       jusqu'ici est d'éviter les libs pour ce genre de calcul, cf.
       `progress-simulator.ts`). Chaque cellule liste les `CalendarEntry` du
       jour (poster miniature + titre + subtitle), jour hors-mois-courant
       grisé.
     - Navigation mois précédent/suivant (state local `currentMonth`, comme
       `services-step.tsx` gère son état `configured` local).
     - Filtre par kind, même pattern `Tabs` que Library/Requests.
   - Routes : `routes/library/index.tsx`, `routes/calendar/index.tsx` — copie
     exacte du pattern `routes/requests/index.tsx` (`AppShell` +
     `requireOnboarded`/`requireSession` + header `h1`/`p`).
   - Nav : `presentation/shared/app-shell.tsx`, `NAV_ITEMS` gagne
     `{ to: '/library', label: 'Library', icon: LibraryBig }` et
     `{ to: '/calendar', label: 'Calendar', icon: CalendarDays }` (lucide,
     déjà la lib d'icônes du projet).
   - Fake (`infrastructure/fake/fake-arr-connector.ts`) :
     - `listLibrary(kind?)` dérive directement de `ALL_FIXTURES` déjà présent
       (pas de nouvelles fixtures nécessaires) + champs fabriqués
       (`monitored`/`hasFile`/`sizeOnDiskBytes` déterministes par item, ex.
       hash de l'id).
     - `getCalendar(start, end)` synthétise des entrées à partir des mêmes
       fixtures avec des `releaseDate` réparties sur la plage demandée
       (déterministe, pas de `Math.random()`, cf. le style déjà en place dans
       `progress-simulator.ts`).

## Points à valider

1. **Payload Lidarr `/api/v1/album`.** À inspecter contre une vraie instance
   avant d'écrire `LidarrAdapter.list()` — le mapping artist→album n'est pas
   confirmé par la doc Lidarr seule, seulement par analogie avec Radarr/Sonarr.

2. **Cache backend.** `GET /api/library`/`GET /api/calendar` tapent les *arr à
   chaque requête ; pas de cache proposé pour le MVP (cohérent avec le reste
   du backend, aucun cache existant ailleurs), mais à surveiller si la page
   est rechargée souvent — un cache court (30-60s) pourrait être ajouté en
   suivi si l'usage réel le justifie.

3. **Agrégation partielle.** Une instance down ne doit pas faire échouer tout
   `/api/calendar` ; comportement proposé : erreurs par instance isolées
   (logguées, sous-ensemble partiel renvoyé). À confirmer que c'est le
   comportement voulu plutôt qu'un échec global explicite.

## Découpage des tâches

1. Backend : port `MediaLibrary` + 3 adapters (`list`/`calendar`) + schémas
   Zod + mappers.
2. Backend : routes + use-cases + tests (mirroring `requests.routes.ts`/tests
   existants).
3. Frontend : types domaine + `ArrConnector` (2 méthodes, implémentations
   `Http` et `Fake`) + `tests/contract/arr-connector.contract.spec.ts`.
4. Frontend : hooks `application/`.
5. Frontend : `presentation/library/`, `presentation/calendar/` (grille
   mensuelle en dernier, le plus gros morceau UI).
6. Frontend : routes + nav.
7. Vérification : `task check` (backend + frontend), test manuel `dev:fake` et
   `dev:front` contre le vrai backend.
