/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#middleware/force_json_response_middleware'),
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('#middleware/auth_middleware'),
])

/**
 * Named middleware, explicitly assigned to routes/groups that need it —
 * `auth_middleware` above already runs on every routed request and sets
 * `ctx.authenticatedUser` (possibly `null`), these two layer stricter
 * guards on top of that for the route groups that need them.
 */
export const middleware = router.named({
  onboardingGuard: () => import('#middleware/onboarding_guard_middleware'),
  adminOnly: () => import('#middleware/admin_only_middleware'),
})
