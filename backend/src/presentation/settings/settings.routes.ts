import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OnboardingController = () => import('./onboarding.controller.js')
const SettingsController = () => import('./settings.controller.js')
const MediaServersController = () => import('./media-servers.controller.js')
const DiscoveryController = () => import('./discovery.controller.js')
const NotificationsController = () => import('./notifications.controller.js')
const RequestApprovalSettingsController = () => import('./request-approval-settings.controller.js')
const UserRequestPreferencesController = () => import('./user-request-preferences.controller.js')

/**
 * Public on purpose, and outside the `onboardingGuard` group below: the
 * root routing guard (cf. docs/phase-1 decision 5) calls this on every
 * request to decide whether to redirect to `/setup` — it must keep working
 * after onboarding completes too, or the whole app 404s on first load.
 */
router.get('/api/onboarding/state', [OnboardingController, 'state'])

router
  .group(() => {
    router.post('/admin', [OnboardingController, 'createAdmin'])
    router.post('/instances/test', [OnboardingController, 'testInstance'])
    router.post('/instances/profiles', [OnboardingController, 'instanceProfiles'])
    router.put('/instances/:kind', [OnboardingController, 'saveInstance'])
    /**
     * Deliberately does *not* go through `MarkServicesConfigured` like the
     * route above: a media server is a convenience link target, it never
     * makes the app functional on its own (cf. docs/phase-5-quality-of-life,
     * chantier 2 décision 7). Explicitly named because the settings group
     * below points at the very same controller method — Adonis derives route
     * names from `controller.method` and refuses two routes with the same one.
     */
    router
      .put('/media-servers/:kind', [MediaServersController, 'save'])
      .as('onboarding.mediaServers.save')
    /* Named explicitly: the settings group below reuses the same controller
       method, and Adonis derives route names from `controller.method`. */
    router.post('/discovery', [DiscoveryController, 'scan']).as('onboarding.discovery.scan')
    router.post('/sso/test', [OnboardingController, 'testSso'])
    router.put('/sso', [OnboardingController, 'saveSso'])
    router.post('/complete', [OnboardingController, 'complete'])
  })
  .prefix('/api/onboarding')
  .use(middleware.onboardingGuard())

router
  .group(() => {
    router.get('/instances', [SettingsController, 'listInstances'])
    router.put('/instances/:kind', [SettingsController, 'saveInstance'])
    router.delete('/instances/:kind', [SettingsController, 'deleteInstance'])
    router.post('/instances/:kind/test-connection', [SettingsController, 'testInstanceConnection'])
    router.post('/instances/:kind/profiles', [SettingsController, 'instanceProfiles'])
    router.get('/instances/:kind/catalog', [SettingsController, 'catalogForInstance'])
    router.get('/instances/:kind/saved-profiles', [SettingsController, 'listSavedProfiles'])
    router.post('/instances/:kind/saved-profiles', [SettingsController, 'createSavedProfile'])
    router.put('/instances/:kind/saved-profiles/:id', [SettingsController, 'updateSavedProfile'])
    router.delete('/instances/:kind/saved-profiles/:id', [SettingsController, 'deleteSavedProfile'])
    router.post('/instances/:kind/saved-profiles/:id/default', [
      SettingsController,
      'setDefaultSavedProfile',
    ])
    router.get('/instances/:kind/quality-profiles', [SettingsController, 'listQualityProfiles'])
    router.get('/instances/:kind/quality-profiles/schema', [
      SettingsController,
      'qualityProfileSchema',
    ])
    router.get('/instances/:kind/download-clients', [SettingsController, 'listDownloadClients'])
    router.get('/instances/:kind/download-clients/schema', [
      SettingsController,
      'downloadClientSchema',
    ])
    router.post('/instances/:kind/download-clients', [SettingsController, 'createDownloadClient'])
    router.put('/instances/:kind/download-clients/:id', [
      SettingsController,
      'updateDownloadClient',
    ])
    router.delete('/instances/:kind/download-clients/:id', [
      SettingsController,
      'deleteDownloadClient',
    ])
    router.post('/instances/:kind/download-clients/test', [
      SettingsController,
      'testDownloadClient',
    ])
    router.get('/instances/:kind/indexers', [SettingsController, 'listIndexers'])
    router.get('/instances/:kind/indexers/schema', [SettingsController, 'indexerSchema'])
    router.post('/instances/:kind/indexers', [SettingsController, 'createIndexer'])
    router.put('/instances/:kind/indexers/:id', [SettingsController, 'updateIndexer'])
    router.delete('/instances/:kind/indexers/:id', [SettingsController, 'deleteIndexer'])
    router.post('/instances/:kind/indexers/test', [SettingsController, 'testIndexer'])
    router
      .put('/media-servers/:kind', [MediaServersController, 'save'])
      .as('settings.mediaServers.save')
    router.delete('/media-servers/:kind', [MediaServersController, 'destroy'])
    router.post('/discovery', [DiscoveryController, 'scan']).as('settings.discovery.scan')
    router.get('/notifications', [NotificationsController, 'show'])
    router.put('/notifications', [NotificationsController, 'update'])
    router.post('/notifications/test', [NotificationsController, 'test'])
    router.get('/request-approval', [RequestApprovalSettingsController, 'show'])
    router.put('/request-approval', [RequestApprovalSettingsController, 'update'])
    router.get('/user-request-preferences', [UserRequestPreferencesController, 'index'])
    router.put('/user-request-preferences/:userId', [UserRequestPreferencesController, 'update'])
    router.get('/sso', [SettingsController, 'getSso'])
    router.put('/sso', [SettingsController, 'updateSso'])
    router.post('/sso/test', [SettingsController, 'testSso'])
  })
  .prefix('/api/settings')
  .use(middleware.adminOnly())

/**
 * Public on purpose: the login page needs to know whether password login is
 * enabled and whether SSO is configured *before* any session exists, to
 * decide which of the two to render — same reasoning that puts "Sign in
 * with Google" buttons in front of anonymous visitors everywhere. Only
 * booleans + an enum, nothing sensitive.
 */
router.get('/api/settings/auth', [SettingsController, 'getAuthSettings'])

/**
 * Outside `/api/settings` and only `authRequired`, unlike every write above:
 * the media detail drawer renders "open in Plex/Jellyfin/Emby" links for
 * every signed-in user, and a media server DTO carries no credential at all
 * (cf. docs/phase-5-quality-of-life, chantier 2 décisions 5 et 6).
 */
router.get('/api/media-servers', [MediaServersController, 'index']).use(middleware.authRequired())
