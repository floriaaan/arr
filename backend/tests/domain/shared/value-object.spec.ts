import { test } from '@japa/runner'
import { ValueObject } from '#domain/shared/value-object'

class Point extends ValueObject<{ x: number; y: number }> {
  static create(x: number, y: number): Point {
    return new Point({ x, y })
  }

  get x(): number {
    return this.props.x
  }

  get y(): number {
    return this.props.y
  }
}

class Color extends ValueObject<{ x: number; y: number }> {
  static create(x: number, y: number): Color {
    return new Color({ x, y })
  }
}

test.group('ValueObject', () => {
  test('two value objects of the same class with the same props are equal', ({ assert }) => {
    assert.isTrue(Point.create(1, 2).equals(Point.create(1, 2)))
  })

  test('two value objects of the same class with different props are not equal', ({ assert }) => {
    assert.isFalse(Point.create(1, 2).equals(Point.create(1, 3)))
  })

  test('value objects of different classes with identical props are not equal', ({ assert }) => {
    assert.isFalse(Point.create(1, 2).equals(Color.create(1, 2)))
  })

  test('is never equal to null or undefined', ({ assert }) => {
    assert.isFalse(Point.create(1, 2).equals(null))
    assert.isFalse(Point.create(1, 2).equals(undefined))
  })

  test('props are frozen', ({ assert }) => {
    const point = Point.create(1, 2)
    assert.throws(() => {
      // @ts-expect-error props is protected and readonly by convention
      point.props.x = 99
    })
  })
})
