import test from 'ava'
import request from 'supertest'
import { server, appReady } from '../../../server'
import Goal from '../goal'
import goals from './goal.fixture'
import MemoryMongo from '../../../util/test-memory-mongo'
import { jwtData, jwtDataAlice, jwtDataDali } from '../../../middleware/session/__tests__/setSession.fixture'
import { GoalGroup } from '../goalGroup'

test.before('before connect to database', async (t) => {
  t.context.memMongo = new MemoryMongo()
  await t.context.memMongo.start()
  await appReady
})

test.after.always(async (t) => {
  await t.context.memMongo.stop()
})

test.beforeEach('populate fixtures', async (t) => {
  t.context.goals = await Goal.create(goals)
})

test.afterEach.always(async () => {
  await Goal.deleteMany()
})

test.serial('Goal API - anon - list', async t => {
  const response = await request(server)
    .get('/api/goals')
    .set('Accept', 'application/json')

  const actualGoals = response.body
  const expectedGoals = t.context.goals

  t.is(response.statusCode, 200)
  t.is(actualGoals.length, expectedGoals.length)
})

test.serial('Goal API - anon - read', async t => {
  const goalToRead = t.context.goals[0]

  const response = await request(server)
    .get(`/api/goals/${goalToRead._id}`)
    .set('Accept', 'application/json')

  t.is(response.statusCode, 200)
})

test.serial('Goal API - anon - create', async t => {
  const response = await request(server)
    .post('/api/goals')
    .set('Accept', 'application/json')
    .send({
      group: 'test-group',
      name: 'Test name',
      slug: 'test-slug',
      subtitle: 'Subtitle',
      description: 'Description',
      startLink: '/home',
      rank: 1,
      evaluation: 'async (personalGoal) => { return false }'
    })

  t.is(response.statusCode, 403)
})

test.serial('Goal API - anon - update', async t => {
  const goalToUpdate = t.context.goals[0]

  const response = await request(server)
    .get(`/api/goals/${goalToUpdate._id}`)
    .set('Accept', 'application/json')
    .send({
      name: 'Updated test name'
    })

  t.is(response.statusCode, 403)
})
