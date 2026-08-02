import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RequestsController = () => import('./requests.controller.js')

router
  .group(() => {
    router.get('/', [RequestsController, 'index'])
    router.post('/', [RequestsController, 'store'])
    router.get('/:id', [RequestsController, 'show'])
    router.get('/:id/episodes', [RequestsController, 'episodes'])
    router.post('/:id/cancel', [RequestsController, 'cancel'])
    router.post('/:id/approve', [RequestsController, 'approve'])
    router.post('/:id/reject', [RequestsController, 'reject'])
  })
  .prefix('/api/requests')
  .use(middleware.authRequired())
