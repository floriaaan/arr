import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const WatchlistAccountsController = () => import('./watchlist-accounts.controller.js')

/**
 * Self-service, not admin-only: each user links and manages their own
 * account (cf. docs/phase-7-watchlist-sync, chantier 2 décision 3).
 */
router
  .group(() => {
    router.get('/', [WatchlistAccountsController, 'index'])
    router.post('/plex/start', [WatchlistAccountsController, 'startPlexLink'])
    router.post('/plex/complete', [WatchlistAccountsController, 'completePlexLink'])
    router.put('/:kind', [WatchlistAccountsController, 'linkMediaServer'])
    router.put('/:id/enabled', [WatchlistAccountsController, 'setEnabled'])
    router.delete('/:id', [WatchlistAccountsController, 'destroy'])
  })
  .prefix('/api/watchlist/accounts')
  .use(middleware.authRequired())
