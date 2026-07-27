import type { UseCase } from '#application/shared/use-case'
import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { LibraryItem } from '#domain/catalog/library-item.entity'

export interface ListLibraryInput {
  kind?: MediaKind
}

export class ListLibrary implements UseCase<ListLibraryInput, LibraryItem[]> {
  constructor(private readonly library: MediaLibrary) {}

  async execute(input: ListLibraryInput): Promise<LibraryItem[]> {
    return this.library.list(input.kind)
  }
}
