import { AggregateRoot } from '#domain/shared/aggregate-root'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'
import type { ServarrKind } from './servarr-kind.vo.js'
import type { RootFolderPath } from './root-folder-path.vo.js'
import type { QualityProfileId } from './quality-profile-id.vo.js'
import type { MetadataProfileId } from './metadata-profile-id.vo.js'
import type { LanguageProfileId } from './language-profile-id.vo.js'
import type { SeriesType } from './series-type.vo.js'
import type { MinimumAvailability } from './minimum-availability.vo.js'
import { validateProfileSelection } from './profile-selection-rules.js'

export interface InstanceProfileProps {
  instanceId: string
  name: string
  rootFolderPath: RootFolderPath
  qualityProfileId: QualityProfileId
  metadataProfileId: MetadataProfileId | null
  languageProfileId: LanguageProfileId | null
  seriesType: SeriesType | null
  minimumAvailability: MinimumAvailability | null
  isDefault: boolean
}

function validateName(name: string): Result<string, ValidationError> {
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > 64) {
    return Result.err({
      field: 'name',
      message: 'Profile name must be between 1 and 64 characters',
    })
  }
  return Result.ok(trimmed)
}

/**
 * A named preset of the same fields `ServarrInstance` carries inline
 * (root folder / quality profile / metadata / language profile / series
 * type / minimum availability). `kind` is intentionally not stored on this
 * aggregate — it's the owning instance's, passed in by the caller for
 * validation only (cf. docs/phase-3-instance-profiles).
 */
export class InstanceProfile extends AggregateRoot<string> {
  private props: InstanceProfileProps

  private constructor(id: string, props: InstanceProfileProps) {
    super(id)
    this.props = props
  }

  static create(
    id: string,
    kind: ServarrKind,
    instanceId: string,
    name: string,
    rootFolderPath: RootFolderPath,
    qualityProfileId: QualityProfileId,
    metadataProfileId: MetadataProfileId | null,
    languageProfileId: LanguageProfileId | null,
    seriesType: SeriesType | null,
    minimumAvailability: MinimumAvailability | null,
    isDefault: boolean,
  ): Result<InstanceProfile, ValidationError> {
    const nameResult = validateName(name)
    if (!nameResult.ok) return nameResult

    const selection = validateProfileSelection(
      kind,
      metadataProfileId,
      languageProfileId,
      seriesType,
      minimumAvailability,
    )
    if (!selection.ok) return selection

    return Result.ok(
      new InstanceProfile(id, {
        instanceId,
        name: nameResult.value,
        rootFolderPath,
        qualityProfileId,
        metadataProfileId,
        languageProfileId,
        seriesType,
        minimumAvailability,
        isDefault,
      }),
    )
  }

  /** Used by the persistence mapper to rehydrate an already-valid aggregate. */
  static reconstruct(id: string, props: InstanceProfileProps): InstanceProfile {
    return new InstanceProfile(id, props)
  }

  get instanceId(): string {
    return this.props.instanceId
  }

  get name(): string {
    return this.props.name
  }

  get rootFolderPath(): RootFolderPath {
    return this.props.rootFolderPath
  }

  get qualityProfileId(): QualityProfileId {
    return this.props.qualityProfileId
  }

  get metadataProfileId(): MetadataProfileId | null {
    return this.props.metadataProfileId
  }

  get languageProfileId(): LanguageProfileId | null {
    return this.props.languageProfileId
  }

  get seriesType(): SeriesType | null {
    return this.props.seriesType
  }

  get minimumAvailability(): MinimumAvailability | null {
    return this.props.minimumAvailability
  }

  get isDefault(): boolean {
    return this.props.isDefault
  }

  rename(name: string): Result<void, ValidationError> {
    const result = validateName(name)
    if (!result.ok) return result
    this.props.name = result.value
    return Result.ok(undefined)
  }

  updateSelection(
    kind: ServarrKind,
    rootFolderPath: RootFolderPath,
    qualityProfileId: QualityProfileId,
    metadataProfileId: MetadataProfileId | null,
    languageProfileId: LanguageProfileId | null,
    seriesType: SeriesType | null,
    minimumAvailability: MinimumAvailability | null,
  ): Result<void, ValidationError> {
    const selection = validateProfileSelection(
      kind,
      metadataProfileId,
      languageProfileId,
      seriesType,
      minimumAvailability,
    )
    if (!selection.ok) return selection

    this.props.rootFolderPath = rootFolderPath
    this.props.qualityProfileId = qualityProfileId
    this.props.metadataProfileId = metadataProfileId
    this.props.languageProfileId = languageProfileId
    this.props.seriesType = seriesType
    this.props.minimumAvailability = minimumAvailability
    return Result.ok(undefined)
  }

  markDefault(): void {
    this.props.isDefault = true
  }

  unmarkDefault(): void {
    this.props.isDefault = false
  }
}
