import { z } from 'zod'
import { BaseServarrClient } from './base-servarr-client.js'
import { apiPathPrefix, classifyConnectionError } from './errors.js'
import type {
  QualityProfileItem,
  QualityProfileRecord,
  ServarrQualityProfileManager,
} from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

const QualityProfileItemSchema: z.ZodType<QualityProfileItem> = z.lazy(() =>
  z
    .object({
      id: z.number().optional(),
      name: z.string().optional(),
      allowed: z.boolean(),
      quality: z
        .object({
          id: z.number(),
          name: z.string(),
          source: z.string().optional(),
          resolution: z.number().optional(),
        })
        .optional(),
      items: z.array(QualityProfileItemSchema).optional(),
    })
    .passthrough(),
)

const QualityProfileRecordSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    upgradeAllowed: z.boolean(),
    cutoff: z.number(),
    items: z.array(QualityProfileItemSchema),
  })
  .passthrough()

const QualityProfileRecordArraySchema = QualityProfileRecordSchema.array()

function path(kind: ServarrKind, suffix = ''): string {
  return `${apiPathPrefix(kind)}/qualityprofile${suffix}`
}

export class HttpServarrQualityProfileManager implements ServarrQualityProfileManager {
  async list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<QualityProfileRecord[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ path: path(kind) })
      return Result.ok(QualityProfileRecordArraySchema.parse(raw) as QualityProfileRecord[])
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async getSchema(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<QualityProfileRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ path: path(kind, '/schema') })
      return Result.ok(QualityProfileRecordSchema.parse(raw) as QualityProfileRecord)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async create(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: QualityProfileRecord,
  ): Promise<Result<QualityProfileRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ method: 'POST', path: path(kind), body: payload })
      return Result.ok(QualityProfileRecordSchema.parse(raw) as QualityProfileRecord)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async update(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
    payload: QualityProfileRecord,
  ): Promise<Result<QualityProfileRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({
        method: 'PUT',
        path: path(kind, `/${id}`),
        body: { ...payload, id },
      })
      return Result.ok(QualityProfileRecordSchema.parse(raw) as QualityProfileRecord)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async delete(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
  ): Promise<Result<void, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      await client.request({ method: 'DELETE', path: path(kind, `/${id}`) })
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }
}
