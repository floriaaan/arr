/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| This file only imports the aggregated route definitions. All actual
| route registration happens in src/presentation/routes.ts (Phase 4),
| kept out of this AdonisJS glue file on purpose.
|
*/

import router from '@adonisjs/core/services/router'
import '#presentation/routes'

router.get('/health', () => {
  return { status: 'ok' }
})
