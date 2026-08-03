/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

await import('reflect-metadata')
const { Ignitor, prettyPrintError } = await import('@adonisjs/core')

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.ready(async () => {
      const { readEnvInstanceConfigs } =
        await import('#infrastructure/servarr/env-instance-configs')
      const configs = readEnvInstanceConfigs()
      if (configs.length === 0) return

      const { BootstrapInstancesFromEnv } =
        await import('#application/settings/bootstrap-instances-from-env.use-case')
      const logger = await app.container.make('logger')
      const useCase = new BootstrapInstancesFromEnv(
        await app.container.make('settings.instanceRepository'),
        await app.container.make('settings.connectionTester'),
        await app.container.make('settings.profileCatalog'),
        await app.container.make('shared.idGenerator'),
        await app.container.make('settings.instanceProfileRepository'),
        await app.container.make('settings.onboardingStateRepository'),
        await app.container.make('shared.clock'),
      )
      const result = await useCase.execute(configs)
      for (const kind of result.bootstrapped) logger.info(`bootstrapped ${kind} instance from env`)
      for (const { kind, reason } of result.failed) {
        logger.warn(`failed to bootstrap ${kind} instance from env: ${reason}`)
      }
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
