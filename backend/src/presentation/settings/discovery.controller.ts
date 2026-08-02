import app from '@adonisjs/core/services/app'
import { DiscoverInstances } from '#application/settings/discover-instances.use-case'
import { toDiscoveredInstanceDto } from './discovered-instance.dto.js'
import { discoveryValidator } from './discovery.validator.js'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Mounted twice — once under `onboardingGuard`, once under `adminOnly` —
 * because setting an instance up happens in both places. Always an explicit
 * user action, never a background scan (cf. docs/phase-5-quality-of-life/01,
 * décision 7).
 */
export default class DiscoveryController {
  async scan(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(discoveryValidator)
    const discovery = await app.container.make('settings.instanceDiscovery')

    const instances = await new DiscoverInstances(discovery).execute({
      extraHost: payload.extraHost,
      scanSubnet: payload.scanSubnet ?? false,
    })

    return ctx.response.json({ instances: instances.map(toDiscoveredInstanceDto) })
  }
}
