import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const LibraryController = () => import('./library.controller.js')

router
  .group(() => {
    router.get('/', [LibraryController, 'index'])
  })
  .prefix('/api/library')
  .use(middleware.authRequired())

router.delete('/api/library', [LibraryController, 'remove']).use(middleware.adminOnly())
