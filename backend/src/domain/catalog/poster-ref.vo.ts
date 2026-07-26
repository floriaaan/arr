import { ValueObject } from '#domain/shared/value-object'

interface PosterRefProps {
  remoteUrl: string
}

/**
 * Opaque wrapper around the raw remote poster URL (TMDB/Fanart). The domain
 * has no notion of "signing" a ref for the browser — that's a
 * presentation/infrastructure concern (cf. docs/adr/0008).
 */
export class PosterRef extends ValueObject<PosterRefProps> {
  private constructor(props: PosterRefProps) {
    super(props)
  }

  static create(remoteUrl: string): PosterRef {
    return new PosterRef({ remoteUrl })
  }

  get remoteUrl(): string {
    return this.props.remoteUrl
  }
}
