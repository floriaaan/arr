import { describe, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

describe('architecture boundaries', () => {
  it('src/ respects the layer dependency rule (domain -> nothing, application -> domain, infrastructure/presentation -> application+domain)', async () => {
    await execFileAsync('node_modules/.bin/depcruise', [
      '--config',
      '.dependency-cruiser.cjs',
      'src',
    ])
  })
})
