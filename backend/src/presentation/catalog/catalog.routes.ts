import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CatalogController = () => import('./catalog.controller.js')

router
  .group(() => {
    router.get('/search', [CatalogController, 'search'])
    router.get('/detail', [CatalogController, 'detail'])
  })
  .prefix('/api/catalog')
  .use(middleware.authRequired())
