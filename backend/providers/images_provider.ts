import type { ApplicationService } from '@adonisjs/core/types'
import type { ImageProxyService as ImageProxyServiceType } from '#infrastructure/images/image-proxy.service'
import type { ImageRefSigner } from '#presentation/shared/interfaces/image-ref-signer.interface'

export default class ImagesProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('images.proxyService', async (resolver) => {
      const { ImageProxyService } = await import('#infrastructure/images/image-proxy.service')
      const { DiskImageCache } = await import('#infrastructure/images/disk-image-cache')
      const instanceRepository = await resolver.make('settings.instanceRepository')
      const cache = new DiskImageCache(this.app.tmpPath('image-cache'))
      return new ImageProxyService(cache, instanceRepository)
    })

    this.app.container.singleton('images.refSigner', async () => {
      const { signImageRef } = await import('#infrastructure/images/image-ref-signer')
      return { sign: (remoteUrl: string) => signImageRef(remoteUrl) }
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'images.proxyService': ImageProxyServiceType
    'images.refSigner': ImageRefSigner
  }
}
