import { test } from '@japa/runner'
import { Entity } from '#domain/shared/entity'

class DummyEntity extends Entity<string> {
  constructor(id: string) {
    super(id)
  }
}

class OtherEntity extends Entity<string> {
  constructor(id: string) {
    super(id)
  }
}

test.group('Entity', () => {
  test('two entities of the same class with the same id are equal', ({ assert }) => {
    assert.isTrue(new DummyEntity('1').equals(new DummyEntity('1')))
  })

  test('two entities of the same class with different ids are not equal', ({ assert }) => {
    assert.isFalse(new DummyEntity('1').equals(new DummyEntity('2')))
  })

  test('entities of different classes with the same id are not equal', ({ assert }) => {
    assert.isFalse(new DummyEntity('1').equals(new OtherEntity('1')))
  })

  test('an entity is never equal to a non-entity', ({ assert }) => {
    assert.isFalse(new DummyEntity('1').equals({ id: '1' }))
  })
})
