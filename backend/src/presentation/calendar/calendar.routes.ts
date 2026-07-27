import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CalendarController = () => import('./calendar.controller.js')

router
  .group(() => {
    router.get('/', [CalendarController, 'index'])
  })
  .prefix('/api/calendar')
  .use(middleware.authRequired())
