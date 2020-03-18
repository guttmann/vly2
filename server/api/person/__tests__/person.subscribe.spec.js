import test from 'ava'
import express from 'express'
import PubSub from 'pubsub-js'
import { TOPIC_PERSON__CREATE, TOPIC_MEMBER__UPDATE, TOPIC_INTEREST__UPDATE, TOPIC_PERSON__EMAIL_SENT } from '../../../services/pubsub/topic.constants'
import MemoryMongo from '../../../util/test-memory-mongo'
import Person from '../person'
import people from './person.fixture'
import Organisation from '../../organisation/organisation'
import orgs from '../../organisation/__tests__/organisation.fixture'
import Opportunity from '../../opportunity/opportunity'
import ops from '../../opportunity/__tests__/opportunity.fixture'
import Subscribe from '../person.subscribe.js'
import { MemberStatus } from '../../member/member.constants'
import { InterestStatus } from '../../interest/interest.constants'
import sinon from 'sinon'

test.before('before connect to database', async (t) => {
  t.context.server = express()
  t.context.memMongo = new MemoryMongo()
  await t.context.memMongo.start()
  t.context.people = await Person.create(people)
  t.context.orgs = await Organisation.create(orgs)
  // setup opportunities 5 items
  ops.map((op, index) => {
    // each op has a different person as requestor, but not me
    op.requestor = t.context.people[index + 1]
    // all the ops belong to the OMGTech org
    op.offerOrg = t.context.orgs[1]
  })
  t.context.ops = await Opportunity.create(ops)
  t.context.andrew = t.context.people[0]
})

test.after.always(async (t) => {
  await t.context.memMongo.stop()
})

test.beforeEach(t => {
  Subscribe(t.context.server)
})

test.afterEach.always(t => {
  PubSub.clearAllSubscriptions()
})

test.serial('Trigger TOPIC_PERSON__CREATE', async t => {
  t.plan(2)

  const newPerson = t.context.people[0]
  const done = new Promise((resolve, reject) => {
    PubSub.subscribe(TOPIC_PERSON__EMAIL_SENT, async (msg, info) => {
      t.is(info.originalMessage.to, t.context.people[0].email)
      resolve(true)
    })
  })
  t.true(PubSub.publish(TOPIC_PERSON__CREATE, newPerson))
  await done
})

test.serial('Trigger TOPIC_MEMBER__UPDATE', async t => {
  t.plan(2)

  const newMember = {
    person: t.context.people[0],
    organisation: t.context.orgs[0],
    validation: 'follower',
    status: MemberStatus.FOLLOWER
  }
  const done = new Promise((resolve, reject) => {
    PubSub.subscribe(TOPIC_PERSON__EMAIL_SENT, async (msg, info) => {
      t.is(info.originalMessage.to, t.context.people[0].email)
      resolve(true)
    })
  })
  t.true(PubSub.publish(TOPIC_MEMBER__UPDATE, newMember))
  await done
})

test.serial('TOPIC_MEMBER__UPDATE for exmember sends no email', async t => {
  t.plan(1)

  const newMember = {
    person: t.context.people[0],
    organisation: t.context.orgs[0],
    validation: 'exmember',
    status: MemberStatus.EXMEMBER
  }

  t.true(PubSub.publish(TOPIC_MEMBER__UPDATE, newMember))
  // There's no way to check for something that doesn't happen.
  // but at least we can run the code.
})

test.serial('Trigger TOPIC_INTEREST__UPDATE INTERESTED', async t => {
  t.plan(4)
  let personEmailSentCount = 0

  const newInterest = {
    person: t.context.people[0],
    opportunity: t.context.ops[0],
    messages: [{ // this works whether its an object or array.
      body: 'testing TOPIC_INTEREST__UPDATE INTERESTED',
      author: t.context.people[1]._id
    }],
    type: 'accept',
    status: InterestStatus.INTERESTED
  }

  // we're expecting two emails to be sent when TOPIC_INTEREST__UPDATE is triggered
  // in the way it is here (essentially a new interest being created)
  // 1. an email to the interest's opportunity requestor - informing of a new interest/status change
  // 2. an email to the interest's person - informing of new interest/status change
  let expectedEmailsTo = [
    t.context.people[0].email,
    t.context.people[1].email
  ]

  const done = new Promise((resolve, reject) => {
    PubSub.subscribe(TOPIC_PERSON__EMAIL_SENT, async (msg, info) => {
      t.true(expectedEmailsTo.includes(info.originalMessage.to))
      expectedEmailsTo = expectedEmailsTo.filter(email => email !== info.originalMessage.to)

      personEmailSentCount++
      if (personEmailSentCount === 2) { resolve(true) }
    })
  })

  t.true(PubSub.publish(TOPIC_INTEREST__UPDATE, newInterest))
  await done

  t.is(expectedEmailsTo.length, 0)
})

test.serial('Trigger TOPIC_INTEREST__UPDATE INVITED', async t => {
  t.plan(2)

  const newInterest = {
    person: t.context.people[0],
    opportunity: t.context.ops[0],
    messages: [{ // this works whether its an object or array.
      body: 'testing TOPIC_INTEREST__UPDATE INVITED',
      author: t.context.people[1]._id
    }],
    type: 'accept',
    status: InterestStatus.INVITED
  }

  const done = new Promise((resolve, reject) => {
    PubSub.subscribe(TOPIC_PERSON__EMAIL_SENT, async (msg, info) => {
      t.is(info.originalMessage.to, t.context.people[0].email)
      resolve()
    })
  })
  t.true(PubSub.publish(TOPIC_INTEREST__UPDATE, newInterest))
  await done
})

test.serial('Trigger TOPIC_INTEREST__UPDATE COMMITTED', async t => {
  t.plan(3)
  const spy = sinon.spy()
  const newInterest = {
    person: t.context.people[0],
    opportunity: t.context.ops[0],
    messages: [{ // this works whether its an object or array.
      body: 'testing TOPIC_INTEREST__UPDATE INTERESTED',
      author: t.context.people[1]._id
    }],
    type: 'accept',
    status: InterestStatus.COMMITTED
  }
  const done = new Promise((resolve, reject) => {
    PubSub.subscribe(TOPIC_PERSON__EMAIL_SENT, async (msg, info) => {
      t.is(info.originalMessage.to, t.context.people[0].email)
      spy()
      resolve(true)
    })
  })
  t.true(PubSub.publish(TOPIC_INTEREST__UPDATE, newInterest))
  await done
  t.true(spy.calledOnce)
})
