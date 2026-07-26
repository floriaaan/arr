export type ConnectionErrorType =
  'dns' | 'connection_refused' | 'timeout' | 'unauthorized' | 'unexpected_response'

export interface ConnectionError {
  readonly type: ConnectionErrorType
  readonly message: string
}
