import test from 'ava'
import request from 'supertest'
import { server, appReady } from '../../../server'
import MemoryMongo from '../../../util/test-memory-mongo'
import Person from '../../person/person'
import people from '../../person/__tests__/person.fixture'
import { jwtData } from '../../../middleware/session/__tests__/setSession.fixture'
import Badge from '../badge'
import fetchMock from 'fetch-mock'
import badges from './badges.fixture'
import { config } from '../../../../config/config'

const { BADGR_API } = config

test.before('before connect to database', async (t) => {
  t.context.memMongo = new MemoryMongo()
  await t.context.memMongo.start()
  await appReady
})

test.after.always(async (t) => {
  await t.context.memMongo.stop()
})

test.beforeEach('populate fixtures', async (t) => {
  t.context.people = await Person.create(people)
})

test.afterEach.always(async () => {
  await Promise.all([
    Badge.deleteMany(),
    Person.deleteMany()
  ])
})

test.serial('Badge API - list all badges', async t => {
  const mockedFetch = fetchMock.sandbox()
    .post(`begin:${BADGR_API}/o/token`, { body: { access_token: '123456789' } })
    .get(`begin:${BADGR_API}/v2/badgeclasses`, { body: { result: badges } })

  const originalFetch = global.fetch
  global.fetch = mockedFetch

  const response = await request(server)
    .get('/api/badges')
    .set('Accept', 'application/json')

  t.is(response.status, 200)
  t.is(response.body.length, badges.length)

  global.fetch = originalFetch
})

test.serial('Badge API - list user\'s badges', async t => {
  const badgeUser = t.context.people[0]
  const issuedBadges = badges.map(badge => {
    return {
      ...badge,
      person: badgeUser._id
    }
  })

  const storedBadges = await Badge.create(issuedBadges)

  const response = await request(server)
    .get(`/api/badge/${badgeUser._id}`)
    .set('Accept', 'application/json')

  t.is(response.status, 200)
  t.is(response.body.length, storedBadges.length)
})

test.serial('Badge API - create - anon', async t => {
  const mockedFetch = fetchMock.sandbox()
    // .post(`begin:${BADGR_API}/o/token`, { body: { access_token: '123456789' } })
    // .get(`begin:${BADGR_API}/v2/badgeclasses`, { body: { result: badges } })

  const badgeToIssue = badges[0]
  const personToIssueBadgeTo = t.context.people[0]

  const originalFetch = global.fetch
  global.fetch = mockedFetch

  const response = await request(server)
    .post(`/api/badge/${badgeToIssue.entityId}`)
    .set('Accept', 'application/json')
    .send({
      email: personToIssueBadgeTo.email,
      _id: personToIssueBadgeTo._id
    })

  t.is(response.status, 403)

  global.fetch = originalFetch
})
