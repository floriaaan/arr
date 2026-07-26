import { test } from '@japa/runner'
import { Email } from '#domain/identity/email.vo'

test.group('Email', () => {
  test('accepts a well-formed address', ({ assert }) => {
    const result = Email.create('User@Example.com')
    assert.isTrue(result.ok)
    if (result.ok) {
      assert.equal(result.value.value, 'user@example.com')
    }
  })

  test('rejects an address without an @', ({ assert }) => {
    const result = Email.create('not-an-email')
    assert.isFalse(result.ok)
  })

  test('rejects an address without a domain', ({ assert }) => {
    const result = Email.create('user@')
    assert.isFalse(result.ok)
  })

  test('two emails with the same normalized value are equal', ({ assert }) => {
    const a = Email.create('user@example.com')
    const b = Email.create('  USER@EXAMPLE.COM  ')
    assert.isTrue(a.ok && b.ok && a.value.equals(b.value))
  })
})
