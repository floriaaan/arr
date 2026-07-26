import { z } from 'zod'
import { BaseServarrClient } from './base-servarr-client.js'
import { apiPathPrefix, classifyConnectionError } from './errors.js'
import type {
  ProfileOption,
  RootFolderOption,
  ServarrProfileCatalog,
} from '#domain/settings/interfaces/servarr-profile-catalog.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

const RootFolderSchema = z.object({ id: z.number(), path: z.string() }).array()
const ProfileSchema = z.object({ id: z.number(), name: z.string() }).array()

async function fetchList<T>(
  client: BaseServarrClient,
  path: string,
  schema: z.ZodType<T>,
): Promise<Result<T, ConnectionError>> {
  try {
    const raw = await client.request({ path })
    return Result.ok(schema.parse(raw))
  } catch (error) {
    return Result.err(classifyConnectionError(error))
  }
}

export class HttpServarrProfileCatalog implements ServarrProfileCatalog {
  async listRootFolders(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<RootFolderOption[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    return fetchList(client, `${apiPathPrefix(kind)}/rootfolder`, RootFolderSchema)
  }

  async listQualityProfiles(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<ProfileOption[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    return fetchList(client, `${apiPathPrefix(kind)}/qualityprofile`, ProfileSchema)
  }

  async listMetadataProfiles(
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<ProfileOption[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    return fetchList(client, '/api/v1/metadataprofile', ProfileSchema)
  }

  async listLanguageProfiles(
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<ProfileOption[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    return fetchList(client, '/api/v3/languageprofile', ProfileSchema)
  }
}
