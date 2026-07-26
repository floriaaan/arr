import type { UseCase } from '#application/shared/use-case'
import type {
  ProfileOption,
  RootFolderOption,
  ServarrProfileCatalog,
} from '#domain/settings/interfaces/servarr-profile-catalog.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'

export interface FetchInstanceProfilesInput {
  kind: ServarrKind
  baseUrl: string
  apiKey: string
}

export interface ProfileCatalogResult {
  rootFolders: RootFolderOption[]
  qualityProfiles: ProfileOption[]
  metadataProfiles?: ProfileOption[]
  languageProfiles?: ProfileOption[]
}

export type FetchInstanceProfilesError = ConnectionError | ValidationError

export class FetchInstanceProfiles implements UseCase<
  FetchInstanceProfilesInput,
  Result<ProfileCatalogResult, FetchInstanceProfilesError>
> {
  constructor(private readonly catalog: ServarrProfileCatalog) {}

  async execute(
    input: FetchInstanceProfilesInput,
  ): Promise<Result<ProfileCatalogResult, FetchInstanceProfilesError>> {
    const baseUrl = Url.create(input.baseUrl)
    if (!baseUrl.ok) return baseUrl

    const apiKey = ApiKey.create(input.apiKey)
    if (!apiKey.ok) return apiKey

    const rootFolders = await this.catalog.listRootFolders(input.kind, baseUrl.value, apiKey.value)
    if (!rootFolders.ok) return rootFolders

    const qualityProfiles = await this.catalog.listQualityProfiles(
      input.kind,
      baseUrl.value,
      apiKey.value,
    )
    if (!qualityProfiles.ok) return qualityProfiles

    const result: ProfileCatalogResult = {
      rootFolders: rootFolders.value,
      qualityProfiles: qualityProfiles.value,
    }

    if (input.kind === 'lidarr') {
      const metadataProfiles = await this.catalog.listMetadataProfiles(baseUrl.value, apiKey.value)
      if (!metadataProfiles.ok) return metadataProfiles
      result.metadataProfiles = metadataProfiles.value
    }

    if (input.kind === 'sonarr') {
      const languageProfiles = await this.catalog.listLanguageProfiles(baseUrl.value, apiKey.value)
      if (!languageProfiles.ok) return languageProfiles
      result.languageProfiles = languageProfiles.value
    }

    return Result.ok(result)
  }
}
