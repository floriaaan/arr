import { z } from 'zod'
import { BaseServarrClient } from './base-servarr-client.js'
import { apiPathPrefix, classifyConnectionError } from './errors.js'
import type {
  IndexerRecord,
  ServarrIndexerManager,
} from '#domain/settings/interfaces/servarr-indexer-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

const ServarrFieldSchema = z.object({ name: z.string() }).passthrough()

const IndexerRecordSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    implementation: z.string(),
    implementationName: z.string().optional(),
    configContract: z.string(),
    protocol: z.enum(['torrent', 'usenet']),
    enableRss: z.boolean(),
    enableAutomaticSearch: z.boolean(),
    enableInteractiveSearch: z.boolean(),
    priority: z.number(),
    fields: z.array(ServarrFieldSchema),
  })
  .passthrough()

const IndexerRecordArraySchema = IndexerRecordSchema.array()

function path(kind: ServarrKind, suffix = ''): string {
  return `${apiPathPrefix(kind)}/indexer${suffix}`
}

export class HttpServarrIndexerManager implements ServarrIndexerManager {
  async list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<IndexerRecord[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ path: path(kind) })
      return Result.ok(IndexerRecordArraySchema.parse(raw) as IndexerRecord[])
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async getSchema(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<IndexerRecord[], ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ path: path(kind, '/schema') })
      return Result.ok(IndexerRecordArraySchema.parse(raw) as IndexerRecord[])
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async create(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: IndexerRecord,
  ): Promise<Result<IndexerRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({ method: 'POST', path: path(kind), body: payload })
      return Result.ok(IndexerRecordSchema.parse(raw) as IndexerRecord)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }

  async update(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
    payload: IndexerRecord,
  ): Promise<Result<IndexerRecord, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())
    try {
      const raw = await client.request({
        method: 'PUT',
        path: path(kind, `/${id}`),
        body: { ...payload, id },
      })
      return Result.ok(IndexerRecordSchema.parse(raw) as IndexerRecord)
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
    payload: IndexerRecord,
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
