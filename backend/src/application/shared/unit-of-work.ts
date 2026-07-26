export interface UnitOfWork {
  withTransaction<T>(work: () => Promise<T>): Promise<T>
}
