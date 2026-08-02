import { test } from '@japa/runner'
import { RequestApprovalSettings } from '#domain/requests/request-approval-settings.aggregate'

test.group('RequestApprovalSettings', () => {
  test('create() defaults every kind to auto', ({ assert }) => {
    const settings = RequestApprovalSettings.create('1')

    assert.equal(settings.policyFor('movie'), 'auto')
    assert.equal(settings.policyFor('series'), 'auto')
    assert.equal(settings.policyFor('album'), 'auto')
  })

  test('policyFor() reflects configure() per kind', ({ assert }) => {
    const settings = RequestApprovalSettings.create('1')

    settings.configure({ moviePolicy: 'manual', seriesPolicy: 'auto', albumPolicy: 'manual' })

    assert.equal(settings.policyFor('movie'), 'manual')
    assert.equal(settings.policyFor('series'), 'auto')
    assert.equal(settings.policyFor('album'), 'manual')
  })
})
