import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OnboardingController = () => import('./onboarding.controller.js')
const SettingsController = () => import('./settings.controller.js')

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
    router.post('/instances/:kind/quality-profiles', [SettingsController, 'createQualityProfile'])
    router.put('/instances/:kind/quality-profiles/:id', [
      SettingsController,
      'updateQualityProfile',
    ])
    router.delete('/instances/:kind/quality-profiles/:id', [
      SettingsController,
      'deleteQualityProfile',
    ])
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
