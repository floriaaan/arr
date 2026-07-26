import { test } from '@japa/runner'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

test.group('architecture boundaries', () => {
  test('src/ respects the layer dependency rule (domain -> nothing, application -> domain, infrastructure/presentation -> application+domain)', async ({
    assert,
  }) => {
    try {
      await execFileAsync('node_modules/.bin/depcruise', [
        '--config',
        '.dependency-cruiser.cjs',
        'src',
      ])
    } catch (error) {
      const { stdout } = error as { stdout?: string }
      assert.fail(stdout || String(error))
    }
  })
})
