import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ImageProxyController = () => import('./image-proxy.controller.js')

router.get('/api/images', [ImageProxyController, 'show']).use(middleware.authRequired())
