import { ValueObject } from '#domain/shared/value-object'

interface ExternalRefProps {
  instanceId: string
  remoteId: string
}

/** Identifies the resource created in a *arr instance (e.g. a Radarr movie id). */
export class ExternalRef extends ValueObject<ExternalRefProps> {
  private constructor(props: ExternalRefProps) {
    super(props)
  }

  static create(instanceId: string, remoteId: string): ExternalRef {
    return new ExternalRef({ instanceId, remoteId })
  }

  get instanceId(): string {
    return this.props.instanceId
  }

  get remoteId(): string {
    return this.props.remoteId
  }
}
