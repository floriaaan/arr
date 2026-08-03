import env from '#start/env'
import type { EnvInstanceConfig } from '#application/settings/bootstrap-instances-from-env.use-case'

/** Reads SONARR_/RADARR_/LIDARR_ URL+API_KEY pairs set for docker-compose bootstrap, cf. docs/adr/0010. */
export function readEnvInstanceConfigs(): EnvInstanceConfig[] {
  const configs: EnvInstanceConfig[] = []

  const sonarrUrl = env.get('SONARR_URL')
  const sonarrApiKey = env.get('SONARR_API_KEY')
  if (sonarrUrl && sonarrApiKey) {
    configs.push({ kind: 'sonarr', baseUrl: sonarrUrl, apiKey: sonarrApiKey })
  }

  const radarrUrl = env.get('RADARR_URL')
  const radarrApiKey = env.get('RADARR_API_KEY')
  if (radarrUrl && radarrApiKey) {
    configs.push({ kind: 'radarr', baseUrl: radarrUrl, apiKey: radarrApiKey })
  }

  const lidarrUrl = env.get('LIDARR_URL')
  const lidarrApiKey = env.get('LIDARR_API_KEY')
  if (lidarrUrl && lidarrApiKey) {
    configs.push({ kind: 'lidarr', baseUrl: lidarrUrl, apiKey: lidarrApiKey })
  }

  return configs
}
