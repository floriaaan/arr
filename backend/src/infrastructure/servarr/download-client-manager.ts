import { z } from 'zod'
import { BaseServarrClient } from './base-servarr-client.js'
import { apiPathPrefix, classifyConnectionError } from './errors.js'
import type {
  DownloadClientRecord,
  ServarrDownloadClientManager,
} from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

const ServarrFieldSchema = z.object({ name: z.string() }).passthrough()

const DownloadClientRecordSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    implementation: z.string(),
    implementationName: z.string().optional(),
    configContract: z.string(),
    protocol: z.enum(['torrent', 'usenet']),
    enable: z.boolean(),
    priority: z.number(),
    fields: z.array(ServarrFieldSchema),
  })
  .passthrough()

const DownloadClientRecordArraySchema = DownloadClientRecordSchema.array()

function path(kind: ServarrKind, suffix = ''): string {
  return `${apiPathPrefix(kind)}/downloadclient${suffix}`
}

export class HttpServarrDownloadClientManager implements ServarrDownloadClientManager {
  async list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<DownloadClientRecord[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ path: path(kind) })
      return Result.ok(DownloadClientRecordArraySchema.parse(raw) as DownloadClientRecord[])
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async getSchema(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<DownloadClientRecord[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ path: path(kind, '/schema') })
      return Result.ok(DownloadClientRecordArraySchema.parse(raw) as DownloadClientRecord[])
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async create(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: DownloadClientRecord,
  ): Promise<Result<DownloadClientRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ method: 'POST', path: path(kind), body: payload })
      return Result.ok(DownloadClientRecordSchema.parse(raw) as DownloadClientRecord)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async update(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
    payload: DownloadClientRecord,
  ): Promise<Result<DownloadClientRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({
        method: 'PUT',
        path: path(kind, `/${id}`),
        body: { ...payload, id },
      })
      return Result.ok(DownloadClientRecordSchema.parse(raw) as DownloadClientRecord)
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

  async test(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: DownloadClientRecord,
  ): Promise<Result<void, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      await client.request({ method: 'POST', path: path(kind, '/test'), body: payload })
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }
}
