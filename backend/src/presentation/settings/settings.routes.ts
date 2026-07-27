import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OnboardingController = () => import('./onboarding.controller.js')
const SettingsController = () => import('./settings.controller.js')

router
  .group(() => {
    router.get('/state', [OnboardingController, 'state'])
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
