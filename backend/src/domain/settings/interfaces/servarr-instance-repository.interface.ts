import type { ServarrInstance } from '../servarr-instance.aggregate.js'
import type { ServarrKind } from '../servarr-kind.vo.js'

export interface ServarrInstanceRepository {
  findAll(): Promise<ServarrInstance[]>
  findByKind(kind: ServarrKind): Promise<ServarrInstance | null>
  findById(id: string): Promise<ServarrInstance | null>
  findActive(): Promise<ServarrInstance[]>
  save(instance: ServarrInstance): Promise<void>
  delete(id: string): Promise<void>
}
