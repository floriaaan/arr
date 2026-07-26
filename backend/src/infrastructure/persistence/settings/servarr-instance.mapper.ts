import { DateTime } from 'luxon'
import type ServarrInstanceLucidModel from './servarr_instance.lucid.js'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionErrorType } from '#domain/settings/connection-error.vo'
import type { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { encryptSecret, decryptSecret } from '#infrastructure/shared/encryption'

function okOrThrow<T>(result: Result<T, ValidationError>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

export function toDomain(row: ServarrInstanceLucidModel): ServarrInstance {
  const baseUrl = okOrThrow(Url.create(row.baseUrl))
  const apiKey = okOrThrow(ApiKey.create(decryptSecret(row.apiKeyEncrypted)))

  let lastHealthCheck: HealthCheckResult | null = null
  if (row.lastHealthCheckAt) {
    const checkedAt = row.lastHealthCheckAt.toJSDate()
    lastHealthCheck = row.lastHealthCheckOk
      ? HealthCheckResult.healthy(checkedAt, row.detectedVersion ?? 'unknown')
      : HealthCheckResult.unhealthy(checkedAt, {
          type: (row.lastHealthCheckErrorType ?? 'unexpected_response') as ConnectionErrorType,
          message: row.lastHealthCheckErrorMessage ?? 'Unknown error',
        })
  }

  return ServarrInstance.reconstruct(row.id, {
    kind: row.kind as ServarrKind,
    baseUrl,
    apiKey,
    rootFolderPath: row.rootFolderPath
      ? okOrThrow(RootFolderPath.create(row.rootFolderPath))
      : null,
    qualityProfileId: row.qualityProfileId
      ? okOrThrow(QualityProfileId.create(row.qualityProfileId))
      : null,
    metadataProfileId: row.metadataProfileId
      ? okOrThrow(MetadataProfileId.create(row.metadataProfileId))
      : null,
    languageProfileId: row.languageProfileId
      ? okOrThrow(LanguageProfileId.create(row.languageProfileId))
      : null,
    enabled: row.enabled,
    lastHealthCheck,
  })
}

export function applyToModel(instance: ServarrInstance, model: ServarrInstanceLucidModel): void {
  model.id = instance.id
  model.kind = instance.kind
  model.baseUrl = instance.baseUrl.value
  model.apiKeyEncrypted = encryptSecret(instance.apiKey.reveal())
  model.rootFolderPath = instance.rootFolderPath?.value ?? null
  model.qualityProfileId = instance.qualityProfileId?.value ?? null
  model.metadataProfileId = instance.metadataProfileId?.value ?? null
  model.languageProfileId = instance.languageProfileId?.value ?? null
  model.enabled = instance.enabled
  model.lastHealthCheckAt = instance.lastHealthCheck
    ? DateTime.fromJSDate(instance.lastHealthCheck.checkedAt)
    : null
  model.lastHealthCheckOk = instance.lastHealthCheck?.healthy ?? null
  model.lastHealthCheckErrorType = instance.lastHealthCheck?.error?.type ?? null
  model.lastHealthCheckErrorMessage = instance.lastHealthCheck?.error?.message ?? null
  model.detectedVersion = instance.lastHealthCheck?.detectedVersion ?? null
}
