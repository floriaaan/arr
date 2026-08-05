import { describe, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

describe('architecture boundaries', () => {
  // Spawns depcruise over the whole src/ tree — the default 5s test timeout
  // is tight enough to flake under load even though the process itself
  // completes fine (observed ~2.7s locally).
  const TIMEOUT_MS = 15_000

  it(
    'src/ respects the layer dependency rule (domain -> nothing, application -> domain, infrastructure/presentation -> application+domain)',
    async () => {
      await execFileAsync('node_modules/.bin/depcruise', [
        '--config',
        '.dependency-cruiser.cjs',
        'src',
      ])
    },
    TIMEOUT_MS,
  )
})
