# Phase 5 — Frontend

Construction de `frontend/` (TanStack Start + React 19 + shadcn) sur l'arborescence déjà
actée en [phase-0/01-arborescence.md](../phase-0/01-arborescence.md). Le backend (Phases
1–4) est terminé et testé (149 tests, `task check` vert) : cette phase ne touche pas
`backend/`, sauf correction ponctuelle si un écart de contrat apparaît en écrivant le
connecteur HTTP.

Contrairement à la Phase 0 (cadrage pur, aucun code), cette phase implémente. Les
décisions ci-dessous sont prises pour ne pas bloquer l'implémentation ; elles restent
réversibles comme celles de la Phase 0.

## Portée

- `domain/` — types miroirs des DTO backend ([04-endpoints-http.md](../phase-0/04-endpoints-http.md)),
  sans logique métier (la validation/les transitions d'état vivent côté backend).
- `application/` — hooks TanStack Query (`useDomainQuery`/`useDomainMutation`) qui
  appellent `ArrConnector`, jamais `fetch` directement.
- `infrastructure/` — `HttpArrConnector` (implémentation réelle) et `FakeArrConnector`
  (données en mémoire, cf. `task dev:fake`), toutes deux derrière le même contrat
  ([01-contrat-arr-connector.md](./01-contrat-arr-connector.md)).
- `presentation/` — composants shadcn + pages : onboarding (wizard), login, catalogue,
  requests, settings.
- `routes/` — TanStack Router, garde d'accès (onboarding non terminé → `/setup`,
  non authentifié → `/login`).
- `tests/contract/arr-connector.contract.spec.ts` — la même suite tourne contre `Http`
  et `Fake` (`task test:contract`), pour garantir qu'ils exposent le même comportement
  observable.

## Décisions

1. **Un seul contrat, deux implémentations, sélection au build.** `VITE_CONNECTOR`
   (`http` | `fake`, déjà câblé dans `Taskfile.yml` phase 1) choisit l'implémentation
   injectée dans `connector-context.tsx`. Aucune UI ne doit importer
   `infrastructure/http/*` ou `infrastructure/fake/*` directement — seulement
   `application/shared/connector-context.tsx` (frontière vérifiée par
   `dependency-cruiser`, même règle qu'en backend : `presentation` ne dépend jamais de
   `infrastructure`).

2. **`posterRef` backend ≠ URL affichable.** L'endpoint catalogue renvoie
   `posterRef: string` = un jeton signé opaque (`signImageRef(remoteUrl)`), pas un
   chemin. `HttpArrConnector` est seul responsable de le transformer en
   `/api/images?ref=${encodeURIComponent(posterRef)}` ; le domaine frontend expose
   directement `posterUrl: string | null` déjà utilisable dans un `<img src>`. Ça
   isole aussi `FakeArrConnector`, qui renvoie des chemins vers ses fixtures statiques
   (`fixtures/movies/*.jpg`) sans jamais passer par `/api/images` — les deux
   connecteurs respectent le même contrat (`posterUrl` prêt à l'emploi) sans que la
   présentation ait besoin de savoir laquelle tourne.

3. **Cookies de session en SSR : forwarding manuel, pas de jar partagé.**
   TanStack Start exécute des chargements (`beforeLoad`/`loader`) côté serveur Node —
   là, `fetch` n'a pas accès aux cookies du navigateur. `HttpArrConnector` doit donc
   être construit avec le `Cookie` header de la requête entrante quand il tourne
   côté serveur (lu via le contexte de requête TanStack Start), et le laisser au
   navigateur pour les appels côté client (same-origin, cookie déjà présent).
   Concrètement : deux points de construction du connecteur — un dans
   `router.tsx`/`__root.tsx` côté client (aucun header à passer), un côté serveur pour
   les `loader`s qui ont besoin d'une requête authentifiée avant même le premier
   rendu (garde d'onboarding, page requests). Pas de token dupliqué côté frontend :
   le cookie better-auth reste la seule source de vérité, jamais recopié dans le
   `QueryClient`/`localStorage`.

4. **Le serveur frontend proxy `/api/*` vers le backend** (déjà noté dans
   `compose.yml`), donc en prod les deux tournent same-origin du point de vue du
   navigateur — pas de CORS à gérer côté `HttpArrConnector`. En dev (`task dev:front`),
   le serveur Vite doit proxier `/api` vers `http://localhost:3333` pour le même
   résultat (`vite.config.ts`, `server.proxy`) — sinon les cookies same-origin ne
   fonctionnent pas et il faudrait du CORS + `credentials: 'include'`, plus fragile.

5. **Garde de routing : onboarding avant session.** `beforeLoad` racine :
   `GET /api/onboarding/state` → si `!== 'completed'`, redirection vers `/setup/*`
   (sauf si on y est déjà) sans même regarder la session. Sinon, `GET /api/session` →
   si `null` et la route le requiert, redirection `/login`. Évite un flash "login"
   sur une instance jamais onboardée, et un flash "setup" une fois l'onboarding fini.

6. **Erreurs : un type partagé, pas un mapping par écran.**
   `infrastructure/http/api-error.ts` définit `ApiError { type: string; message:
   string; details?: unknown; status: number }`, construit depuis l'enveloppe
   documentée (`04-endpoints-http.md`). Les composants qui ont besoin de réagir à un
   `type` précis (ex : `no_active_instance` sur la page requests, `admin_already_exists`
   sur l'onboarding) le font par un `switch` local ; sinon message générique depuis
   `error.message`. Pas de table de correspondance centralisée type→message UI : elle
   dupliquerait ce que chaque écran doit déjà dire dans son contexte propre.

7. **Progression des requests : polling React Query, pas de WebSocket/SSE.**
   Cohérent avec le choix backend (`DownloadProgressPort` pensé pour un reconciler qui
   poll `*arr` toutes les 10s, cf. ADR-0003). Le hook `requests.query.ts` utilise
   `refetchInterval` conditionnel (actif seulement s'il existe au moins une request en
   statut `submitted`/`downloading`/`importing` dans la réponse courante), toutes les
   5s — plus fin que le poll backend pour rester réactif à l'œil sans le surcharger.

8. **Connexion OIDC : redirection simple, pas de popup.** Le bouton "Se connecter avec
   PocketID" appelle `POST /api/auth/sign-in/oauth2` (`{ providerId: 'pocketid',
   callbackURL: '/' }`, endpoint vérifié dans le plugin `genericOAuth` de better-auth),
   qui répond `{ url }` ; le connecteur fait `window.location.href = url` — pas de
   popup/`postMessage`, cohérent avec un flow OIDC standard et plus simple à tester en
   Fake (qui peut simplement ne pas exposer ce bouton, `oidcConfigured: false`).

## Points à valider

1. **Palette/thème shadcn.** `components.json` a `baseColor: "neutral"`, `style:
   "new-york"` — déjà décidé en Phase 1, repris tel quel. Si tu veux un thème différent
   (couleur d'accent, dark mode par défaut), dis-le avant que je génère les premiers
   composants (`button`, `input`, etc.) : les régénérer après coup implique de
   ré-appliquer les personnalisations à la main.

2. **Détail media : drawer ou route dédiée ?** L'arborescence prévoit
   `media-detail-drawer.tsx` (panneau latéral, reste sur `/requests` ou la recherche
   en arrière-plan) plutôt qu'une route `/media/:scheme/:value`. Je pars sur le
   drawer (state plus simple, pas d'URL profonde à gérer pour un MVP) — à confirmer si
   tu veux des liens partageables vers une fiche précise.

3. **Traduction de l'UI.** Le backend et les ADR sont en français, le code (identifiants,
   commentaires) en anglais. Je pars sur une UI en anglais sans i18n — pas de lib de
   traduction pour l'instant.

4. **Notifications de complétion.** Reporté hors MVP.

## Découpage des tâches

1. `domain/` — types miroirs (shared `Result`, `identity`, `settings`, `catalog`,
   `requests`) + `interfaces/arr-connector.ts` (le contrat, détaillé dans
   [01-contrat-arr-connector.md](./01-contrat-arr-connector.md)).
2. `infrastructure/http/` — `HttpArrConnector` + schémas Zod miroirs des réponses.
3. `infrastructure/fake/` — `FakeArrConnector` + fixtures + `progress-simulator.ts`.
4. `tests/contract/arr-connector.contract.spec.ts` — suite unique exécutée contre les
   deux (débloque `task test:contract`, actuellement vide/`--passWithNoTests`).
5. `application/` — `define-query`/`define-mutation`, `connector-context.tsx`, puis un
   hook par use case backend (identity, settings, catalog, requests).
6. shadcn : installer les primitives nécessaires (`button`, `input`, `card`, `dialog`,
   `command`, `progress`, `badge`, `form`, `sonner`/toast) via `shadcn add`.
7. `presentation/` — composants par contexte (onboarding wizard en dernier, le plus
   gros morceau : 5 étapes).
8. `routes/` — pages + gardes, câblage réel des composants.
9. Vérification : `task check` (lint + typecheck + test + boundaries) sur `frontend`,
   `task test:contract`, puis test manuel des deux modes (`task dev:fake`, `task
   dev:front` contre le backend réel).
