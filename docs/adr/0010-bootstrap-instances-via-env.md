# ADR-0010 — Bootstrap des instances *arr par variables d'environnement

## Statut

Proposé

## Contexte

L'onboarding (`docs/phase-0`) est une machine à états stricte côté domaine
(`OnboardingState`, `backend/src/domain/settings/onboarding-state.aggregate.ts`) :

```
not_started → admin_created → services_configured → completed
```

Chaque transition est gardée (`markAdminCreated` exige `not_started`,
`markServicesConfigured` exige `admin_created`, `complete` exige
`services_configured` **et** au moins une instance active). Il n'existe pas
de raccourci pour sauter une étape.

Pour un déploiement Docker Compose « copiable-collable » (self-hosters), on
veut pouvoir pré-remplir la connexion aux instances Radarr/Sonarr/Lidarr par
variables d'environnement, pour ne pas repasser par le formulaire web à
chaque provisioning. Un précédent existe déjà pour SSO : `OIDC_ISSUER_URL` /
`OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` (`backend/start/env.ts:32-36`) ont
« precedence over database config when set ».

**Ce qu'on ne peut pas bypasser** : la création du compte admin. Elle passe
obligatoirement par l'API better-auth (ADR-0005) et implique un mot de passe
— on ne va pas le faire transiter par une variable d'env en clair dans un
`docker-compose.yml` copié-collé publiquement. `admin_created` reste une
étape manuelle via l'UI.

**Ce qu'on peut bypasser** : l'étape "services" du wizard (`services-step.tsx`
/ `media-servers-step.tsx`), qui ne fait que créer des `ServarrInstance` via
`save-instance.use-case.ts`. Si les instances existent déjà (créées au boot
depuis l'env), il n'y a rien à saisir.

## Décision

1. **Nouvelles variables d'env, optionnelles, par service** (`SONARR_`,
   `RADARR_`, `LIDARR_` — un seul de chaque, cf. ADR-0006 « une instance par
   service ») :

   ```
   SONARR_URL=
   SONARR_API_KEY=
   RADARR_URL=
   RADARR_API_KEY=
   LIDARR_URL=
   LIDARR_API_KEY=
   ```

   Déclarées dans `backend/start/env.ts` en `Env.schema.string.optional({ format: 'url', tld: false })`
   et `Env.schema.string.optional()`, à côté du bloc OIDC, avec le même
   commentaire de précédence.

   Pas de variable pour `rootFolderPath` / `qualityProfileId` /
   `minimumAvailability` etc. dans cette première itération : ces champs
   nécessitent d'interroger l'instance *arr elle-même (cf.
   `save-instance.use-case.ts` qui va chercher les profils avant `enable()`).
   Le bootstrap crée l'instance **désactivée si la config n'est pas
   complétable automatiquement** — voir point 3.

2. **Nouveau use-case applicatif** `bootstrap-instances-from-env.use-case.ts`
   (`backend/src/application/settings/`), appelé une fois au démarrage du
   serveur HTTP (provider, pas dans `src/`, cf. règle de câblage). Pour
   chaque triplet `(kind, url, apiKey)` présent dans l'env :
   - s'il existe déjà une instance de ce `kind` en base (`findByKind`), ne
     rien faire — l'env ne doit **jamais écraser silencieusement une config
     faite depuis l'UI** (contrairement à OIDC qui remplace toujours : ici
     la donnée est mutable en base et le risque de perte de config utilisateur
     est réel). Log en `warn` si les valeurs divergent.
   - sinon, réutilise `SaveInstanceUseCase` avec `kind, baseUrl, apiKey,
     enabled: true` et laisse le use-case faire la découverte des profils /
     `rootFolderPath` par défaut (déjà son comportement actuel pour l'UI —
     à vérifier qu'il a un chemin « auto » sans profils fournis ; sinon,
     ce point de la spec change pour lister aussi
     `SONARR_ROOT_FOLDER`/`SONARR_QUALITY_PROFILE_ID` optionnels en fallback).

3. **Avancement automatique de l'onboarding** : après bootstrap, si
   `OnboardingState.status === 'admin_created'` et qu'au moins une instance
   a été créée par ce mécanisme, appeler `markServicesConfigured`. Ça ne
   complète pas l'onboarding (l'admin doit toujours être créé en premier) ;
   ça saute uniquement l'étape services au prochain chargement du wizard.
   Si `status === 'not_started'` (aucun admin encore créé), le bootstrap
   crée quand même les instances en base mais ne touche pas l'état — le
   wizard, une fois l'admin créé, verra les instances déjà présentes et
   proposera de passer directement à l'étape suivante (`services-step.tsx`
   à adapter : si `findAll()` non vide, bouton "Continuer" au lieu du
   formulaire, pas de skip automatique côté serveur pour rester dans le flux
   utilisateur normal).

4. **Frontend** : aucun changement de `ArrConnector` nécessaire — le
   bootstrap est un détail backend. `services-step.tsx` doit juste gérer le
   cas "instances déjà présentes" en pré-remplissant/désactivant les champs
   déjà couverts.

5. **docker-compose du README** : ajouter les 6 variables (commentées comme
   optionnelles, à l'image du bloc OIDC ligne 139) dans le bloc `arr-backend`
   du README, plus une ligne dans le tableau de configuration.

## Conséquences

- Idempotent et sûr par défaut : ne remplace jamais une instance existante
  en base, donc pas de risque d'écraser une config faite via l'UI en
  redémarrant le conteneur avec les mêmes env vars.
- N'élimine pas complètement l'onboarding manuel (compte admin toujours
  requis), ce qui est voulu : pas de mot de passe en env var.
- Ajoute un point d'entrée applicatif de plus à tester (`tests/application/settings/`)
  et un test fonctionnel de non-régression sur le flux "boot avec env
  SONARR_* déjà set → GET onboarding state → services_configured".

## Alternatives envisagées

- Tout bypasser y compris l'admin (via un `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  d'env) — rejeté : mot de passe en clair dans un compose file public, hors
  scope de la demande.
- Écraser systématiquement la config DB par l'env (comme OIDC) — rejeté :
  contrairement à OIDC (config globale, un seul jeu de valeurs, souvent
  gérée par l'opérateur d'infra), les instances *arr sont fréquemment
  reconfigurées depuis l'UI (rotation de clé API, changement d'URL) ; un
  écrasement au redémarrage serait une régression surprenante.
