# Arborescence détaillée

Monorepo pnpm, deux packages (`backend/`, `frontend/`), racine commune pour l'outillage.

```
arr/
  package.json                      # workspaces: ["backend", "frontend"]
  pnpm-workspace.yaml
  Taskfile.yml
  .editorconfig
  .env.example
  .gitignore
  .github/workflows/ci.yml
  compose.yml
  compose.dev.yml
  eslint.config.mjs                  # config ESLint partagée (flat config), étendue par chaque package
  .dependency-cruiser.cjs            # règles communes, chaque package a sa propre config qui l'étend
  docs/
    adr/
    phase-0/
  backend/
    package.json                     # name: arr-backend
    tsconfig.json
    adonisrc.ts
    .dependency-cruiser.cjs
    Dockerfile
    app/
      exceptions/handler.ts          # délègue à presentation/shared/error-serializer
      middleware/
        auth_middleware.ts           # résout AuthenticatedUser via identity port, glue Adonis only
        onboarding_guard_middleware.ts
        admin_only_middleware.ts
    start/
      kernel.ts
      routes.ts                     # import unique: presentation/routes.ts
      env.ts
      scheduler.ts                  # placeholder si @adonisjs/queue est retenu plus tard (cf. ADR-0003)
    providers/
      identity_provider.ts           # câble AuthenticationPort/SessionInterface -> better-auth adapter
      settings_provider.ts           # câble ServarrInstanceRepositoryInterface -> Lucid repo
      catalog_provider.ts            # câble MediaLookupInterface -> ServarrRegistry
      requests_provider.ts           # câble MediaRequestRepositoryPort, MediaProvisioningPort, DownloadProgressPort
      images_provider.ts             # câble ImageCacheInterface -> disk cache impl
    src/
      domain/
        shared/
          result.ts                  # Result<T, E>
          entity.ts                  # Entity<Id>
          aggregate-root.ts          # AggregateRoot<Id>, pullEvents()
          value-object.ts            # ValueObject<Props>
          domain-event.ts            # DomainEvent interface
          clock.interface.ts              # Clock { now(): Date }
          id-generator.interface.ts       # IdGenerator { next(): string }
        identity/
          user.entity.ts
          user-role.vo.ts
          email.vo.ts
          authenticated-user.vo.ts
          user.events.ts             # UserRegistered
          interfaces/
            user-directory.interface.ts   # findByEmail, existsAny
            authentication.interface.ts   # signInWithPassword, signOut
            session.interface.ts          # resolve(token): AuthenticatedUser | null
        settings/
          servarr-instance.aggregate.ts
          servarr-kind.vo.ts
          url.vo.ts
          api-key.vo.ts
          root-folder-path.vo.ts
          quality-profile-id.vo.ts
          metadata-profile-id.vo.ts
          language-profile-id.vo.ts
          health-check-result.vo.ts
          connection-error.vo.ts     # union: Dns | ConnectionRefused | Timeout | Unauthorized | UnexpectedResponse
          auth-settings.aggregate.ts
          oidc-config.vo.ts
          effective-auth-settings.vo.ts
          onboarding-state.aggregate.ts
          settings.events.ts         # InstanceConnected, InstanceHealthCheckFailed, OnboardingCompleted
          interfaces/
            servarr-instance-repository.interface.ts
            servarr-connection-tester.interface.ts
            servarr-profile-catalog.interface.ts
            auth-settings-repository.interface.ts
            auth-settings-provider.interface.ts
            onboarding-state-repository.interface.ts
        catalog/
          media-kind.vo.ts
          external-id.vo.ts
          poster-ref.vo.ts
          media-item.entity.ts
          media-detail.entity.ts
          interfaces/
            media-lookup.interface.ts
        requests/
          media-request.aggregate.ts
          request-status.vo.ts
          request-progress.vo.ts
          external-ref.vo.ts
          provisioning-error.vo.ts
          request-filter.vo.ts
          requests.events.ts         # MediaRequested, RequestSubmitted, RequestProgressed, RequestCompleted, RequestFailed, RequestCancelled
          interfaces/
            media-request-repository.interface.ts
            media-provisioning.interface.ts
            download-progress.interface.ts
      application/
        shared/
          use-case.ts                 # UseCase<I, O>
          unit-of-work.ts
          event-bus.ts                # in-process pub/sub, cf. ADR-0007
        identity/
          sign-in-with-password.use-case.ts
          sign-out.use-case.ts
          get-current-user.use-case.ts
        settings/
          test-instance-connection.use-case.ts
          fetch-instance-profiles.use-case.ts
          save-instance.use-case.ts
          list-instances.use-case.ts
          delete-instance.use-case.ts
          test-oidc-discovery.use-case.ts
          save-auth-settings.use-case.ts
          get-effective-auth-settings.use-case.ts
          create-admin-account.use-case.ts
          get-onboarding-state.use-case.ts
          complete-onboarding.use-case.ts
        catalog/
          search-media.use-case.ts
          get-media-detail.use-case.ts
        requests/
          create-request.use-case.ts
          list-requests.use-case.ts
          get-request.use-case.ts
          cancel-request.use-case.ts
          reconcile-progress.use-case.ts   # appelé par la commande Ace du reconciler
      infrastructure/
        shared/
          http-client.ts               # base fetch wrapper: timeout, retry backoff, circuit breaker
          system-clock.ts              # Clock impl
          uuid-id-generator.ts          # IdGenerator impl
          encryption.ts                 # wrapper autour d'Adonis Encryption (APP_KEY)
        persistence/
          settings/
            servarr_instance.lucid.ts   # modèle Lucid
            servarr-instance.repository.ts
            servarr-instance.mapper.ts  # Lucid model <-> aggregate, chiffre/déchiffre api_key
            auth_setting.lucid.ts
            auth-settings.repository.ts
            onboarding_state.lucid.ts
            onboarding-state.repository.ts
          requests/
            media_request.lucid.ts
            media-request.repository.ts
            media-request.mapper.ts
          identity/
            user-directory.kysely.ts    # lecture directe des tables better-auth via Kysely, cf. ADR-0005
        servarr/
          base-servarr-client.ts        # X-Api-Key, retry, circuit breaker
          servarr-registry.ts           # MediaKind -> adapter actif
          radarr/
            radarr.schemas.ts           # Zod : status, movie lookup, movie, queue, quality profile, root folder
            radarr.mapper.ts
            radarr.adapter.ts           # MediaLookupInterface + MediaProvisioningInterface + DownloadProgressInterface (movie)
          sonarr/
            sonarr.schemas.ts
            sonarr.mapper.ts
            sonarr.adapter.ts          # gère monitored / seasonFolder / addOptions.searchForMissingEpisodes
          lidarr/
            lidarr.schemas.ts
            lidarr.mapper.ts
            lidarr.adapter.ts          # encapsule la résolution artist-avant-album
          connection-tester.ts         # implémente ServarrConnectionTesterInterface via system/status
          profile-catalog.ts           # implémente ServarrProfileCatalogPort
        auth/
          better-auth/
            instance.ts                 # configuration better-auth (email/password, genericOAuth, admin plugin)
            authentication.adapter.ts    # implémente AuthenticationPort
            session.adapter.ts           # implémente SessionPort
            auth-settings-provider.adapter.ts  # implémente AuthSettingsProviderInterface (précédence env > db)
        images/
          image-ref-signer.ts            # HMAC signature/validation, cf. ADR-0008
          domain-allowlist.ts
          disk-image-cache.ts            # cache TTL sur disque
          image-proxy.service.ts
        scheduling/
          progress-reconciler.ts         # boucle: tant qu'il y a des requests actives, poll toutes les 10s
      presentation/
        shared/
          error-serializer.ts
          exception-handler.ts
          auth-context.ts                # helpers pour lire AuthenticatedUser depuis HttpContext
        identity/
          session.controller.ts
          auth.routes.ts
        settings/
          onboarding.controller.ts
          settings.controller.ts
          instance.validator.ts          # VineJS
          oidc.validator.ts
          settings.routes.ts
        catalog/
          catalog.controller.ts
          search.validator.ts
          catalog.routes.ts
        requests/
          requests.controller.ts
          create-request.validator.ts
          requests.routes.ts
        images/
          image-proxy.controller.ts
          images.routes.ts
        routes.ts                        # agrège tous les *.routes.ts
    database/
      migrations/
        *_create_better_auth_tables.ts   # généré via le CLI better-auth puis adapté, cf. ADR-0005
        *_create_servarr_instances.ts
        *_create_auth_settings.ts
        *_create_onboarding_state.ts
        *_create_media_requests.ts
      seeders/
        demo_seeder.ts
    tests/
      domain/
        identity/
        settings/
        catalog/
        requests/
      application/
      infrastructure/
        servarr/
          fixtures/
            radarr/
              system-status.json
              movie-lookup.json
              queue.json
            sonarr/
            lidarr/
      functional/
        onboarding.spec.ts
        requests.spec.ts
      boundaries.spec.ts                  # exécute dependency-cruiser et vérifie l'absence de violation
  frontend/
    package.json                          # name: arr-frontend
    tsconfig.json
    vite.config.ts
    Dockerfile
    .dependency-cruiser.cjs
    components.json                       # config shadcn
    src/
      domain/
        shared/
          result.ts
        interfaces/
          arr-connector.ts                # LE contrat unique avec le backend
        identity/
          session.ts
          user.ts
        settings/
          servarr-instance.ts
          instance-draft.ts
          onboarding-state.ts
          effective-auth-settings.ts
        catalog/
          media-kind.ts
          external-id.ts
          media-item.ts
          media-detail.ts
        requests/
          media-request.ts
          request-progress.ts
          request-filter.ts
      application/
        shared/
          define-query.ts
          define-mutation.ts
          use-domain-query.ts
          use-domain-mutation.ts
          connector-context.tsx
        identity/
          session.query.ts
          sign-in.mutation.ts
          sign-out.mutation.ts
        settings/
          onboarding-state.query.ts
          create-admin.mutation.ts
          test-instance.mutation.ts
          save-instance.mutation.ts
          test-oidc.mutation.ts
          save-oidc.mutation.ts
          complete-onboarding.mutation.ts
          instances.query.ts
        catalog/
          search-media.query.ts
          media-detail.query.ts
        requests/
          requests.query.ts
          request-detail.query.ts
          create-request.mutation.ts
          cancel-request.mutation.ts
      infrastructure/
        http/
          http-arr-connector.ts
          schemas/                        # Zod, miroir des réponses backend
        fake/
          fake-arr-connector.ts
          fixtures/
            movies.ts
            series.ts
            albums.ts
          progress-simulator.ts
      presentation/
        ui/                               # shadcn, non modifié
        shared/
          app-shell.tsx
          command-palette.tsx
          empty-state.tsx
          error-state.tsx
          poster-grid.tsx
          poster-card.tsx
        identity/
          login-form.tsx
        settings/
          onboarding/
            welcome-step.tsx
            admin-step.tsx
            services-step.tsx
            sso-step.tsx
            summary-step.tsx
          settings-panels.tsx
        catalog/
          search-results.tsx
          media-detail-drawer.tsx
        requests/
          requests-timeline.tsx
          request-card.tsx
      routes/
        __root.tsx
        index.tsx
        setup/
          index.tsx
        login.tsx
        requests/
          index.tsx
        settings/
          index.tsx
        api/
          # uniquement si des server routes TanStack Start sont nécessaires (à confirmer en Phase 5)
    tests/
      contract/
        arr-connector.contract.spec.ts    # exécutée contre Http + Fake
      presentation/
      application/
```

Points de convention :

- Les subpath imports (`#domain/*`, `#application/*`, `#infrastructure/*`,
  `#presentation/*` côté backend ; équivalents côté frontend) sont déclarés dans
  chaque `package.json` (`imports` field, résolu par Node natif — pas besoin de
  `tsconfig-paths` côté backend avec `ts-exec`).
- Un contexte n'a un dossier dans une couche que s'il y a quelque chose à y mettre
  (ex : `catalog` n'existe pas sous `persistence/`, `servarr`/`auth`/`images`
  n'existent que sous `infrastructure/`).
