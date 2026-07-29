import { AggregateRoot } from '#domain/shared/aggregate-root'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'
import type { ServarrKind } from './servarr-kind.vo.js'
import type { Url } from './url.vo.js'
import type { ApiKey } from './api-key.vo.js'
import type { RootFolderPath } from './root-folder-path.vo.js'
import type { QualityProfileId } from './quality-profile-id.vo.js'
import type { MetadataProfileId } from './metadata-profile-id.vo.js'
import type { LanguageProfileId } from './language-profile-id.vo.js'
import type { HealthCheckResult } from './health-check-result.vo.js'
import { instanceConnected, instanceHealthCheckFailed } from './settings.events.js'
import { validateProfileSelection } from './profile-selection-rules.js'

export interface ServarrInstanceProps {
  kind: ServarrKind
  baseUrl: Url
  apiKey: ApiKey
  rootFolderPath: RootFolderPath | null
  qualityProfileId: QualityProfileId | null
  metadataProfileId: MetadataProfileId | null
  languageProfileId: LanguageProfileId | null
  enabled: boolean
  lastHealthCheck: HealthCheckResult | null
}

export class ServarrInstance extends AggregateRoot<string> {
  private props: ServarrInstanceProps

  private constructor(id: string, props: ServarrInstanceProps) {
    super(id)
    this.props = props
  }

  static draft(id: string, kind: ServarrKind, baseUrl: Url, apiKey: ApiKey): ServarrInstance {
    return new ServarrInstance(id, {
      kind,
      baseUrl,
      apiKey,
      rootFolderPath: null,
      qualityProfileId: null,
      metadataProfileId: null,
      languageProfileId: null,
      enabled: false,
      lastHealthCheck: null,
    })
  }

  /** Used by the persistence mapper to rehydrate an already-valid aggregate. */
  static reconstruct(id: string, props: ServarrInstanceProps): ServarrInstance {
    return new ServarrInstance(id, props)
  }

  get kind(): ServarrKind {
    return this.props.kind
  }

  get baseUrl(): Url {
    return this.props.baseUrl
  }

  get apiKey(): ApiKey {
    return this.props.apiKey
  }

  get rootFolderPath(): RootFolderPath | null {
    return this.props.rootFolderPath
  }

  get qualityProfileId(): QualityProfileId | null {
    return this.props.qualityProfileId
  }

  get metadataProfileId(): MetadataProfileId | null {
    return this.props.metadataProfileId
  }

  get languageProfileId(): LanguageProfileId | null {
    return this.props.languageProfileId
  }

  get enabled(): boolean {
    return this.props.enabled
  }

  get lastHealthCheck(): HealthCheckResult | null {
    return this.props.lastHealthCheck
  }

  /** Changing the connection details invalidates any previous health check and disables the instance. */
  updateConnection(baseUrl: Url, apiKey: ApiKey): void {
    this.props.baseUrl = baseUrl
    this.props.apiKey = apiKey
    this.props.lastHealthCheck = null
    this.props.enabled = false
  }

  configure(
    rootFolderPath: RootFolderPath,
    qualityProfileId: QualityProfileId,
    metadataProfileId: MetadataProfileId | null,
    languageProfileId: LanguageProfileId | null,
  ): Result<void, ValidationError> {
    const selection = validateProfileSelection(
      this.props.kind,
      metadataProfileId,
      languageProfileId,
    )
    if (!selection.ok) return selection

    this.props.rootFolderPath = rootFolderPath
    this.props.qualityProfileId = qualityProfileId
    this.props.metadataProfileId = metadataProfileId
    this.props.languageProfileId = languageProfileId
    return Result.ok(undefined)
  }

  /** A failed check disables the instance — "enabled" always implies "last known check was healthy". */
  recordHealthCheck(result: HealthCheckResult): void {
    this.props.lastHealthCheck = result

    if (result.healthy) {
      this.record(
        instanceConnected(
          {
            instanceId: this.id,
            kind: this.props.kind,
            detectedVersion: result.detectedVersion ?? 'unknown',
          },
          result.checkedAt,
        ),
      )
      return
    }

    const error = result.error ?? {
      type: 'unexpected_response',
      message: 'Unknown health-check failure',
    }
    this.record(
      instanceHealthCheckFailed(
        { instanceId: this.id, kind: this.props.kind, error },
        result.checkedAt,
      ),
    )
    this.props.enabled = false
  }

  enable(): Result<void, ValidationError> {
    if (!this.props.rootFolderPath || !this.props.qualityProfileId) {
      return Result.err({
        field: 'enabled',
        message: 'Instance must be configured before it can be enabled',
      })
    }
    if (!this.props.lastHealthCheck || !this.props.lastHealthCheck.healthy) {
      return Result.err({
        field: 'enabled',
        message: 'Instance must pass a health check before it can be enabled',
      })
    }

    this.props.enabled = true
    return Result.ok(undefined)
  }

  disable(): void {
    this.props.enabled = false
  }
}
