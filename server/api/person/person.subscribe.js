const { emailPerson } = require('./person.email')
const { config } = require('../../../config/clientConfig')
const PubSub = require('pubsub-js')
const {
  TOPIC_PERSON__CREATE,
  TOPIC_MEMBER__UPDATE,
  TOPIC_INTEREST__UPDATE,
  TOPIC_INTEREST__MESSAGE,
  TOPIC_PERSON__EMAIL_SENT,
  TOPIC_OPPORTUNITY__ARCHIVE
} = require('../../services/pubsub/topic.constants')
const { MemberStatus } = require('../member/member.constants')
const { InterestStatus } = require('../interest/interest.constants')
const { getICalendar } = require('../opportunity/opportunity.calendar')

const welcomeFrom = {
  nickname: 'Welcome',
  name: 'The team at Voluntarily',
  email: 'welcome@voluntarily.nz'
}

module.exports = (server) => {
  PubSub.subscribe(TOPIC_PERSON__CREATE, async (msg, person) => {
    person.href = `${config.appUrl}/home`
    const info = await emailPerson('welcome', person, {
      send: true,
      from: welcomeFrom
    })
    PubSub.publish(TOPIC_PERSON__EMAIL_SENT, info)
  })

  PubSub.subscribe(TOPIC_MEMBER__UPDATE, async (msg, member) => {
    // a new member has been created or a member status has changed
    // send email to let people know

    // skip states without emails
    if ([MemberStatus.NONE, MemberStatus.JOINER, MemberStatus.EXMEMBER]
      .includes(member.status)) {
      return
    }
    const org = member.organisation
    org.href = `${config.appUrl}/orgs/${org._id}`
    org.imgUrl = new URL(org.imgUrl, config.appUrl).href
    const template = `member_${member.status}`
    const info = await emailPerson(template, member.person, {
      send: true,
      from: welcomeFrom,
      org
    })
    PubSub.publish(TOPIC_PERSON__EMAIL_SENT, info)
  })

  PubSub.subscribe(TOPIC_INTEREST__UPDATE, async (msg, interest) => {
    // a new interest has been created or a interest status has changed
    // send email to the volunteers

    if ([
      InterestStatus.INTERESTED,
      InterestStatus.INVITED,
      InterestStatus.COMMITTED,
      InterestStatus.DECLINED,
      InterestStatus.ATTENDED,
      InterestStatus.NOTATTENDED
    ].includes(interest.status)) {
      const op = interest.opportunity
      op.href = `${config.appUrl}/ops/${op._id}`

      interest.person.href = `${config.appUrl}/home`
      const template = `interest_vp_${interest.type}_${interest.status}`
      const message = interest.messages.slice(-1)[0] // last element should be most recent
      const props = { from: op.requestor, op, interest, message }
      if (interest.status === InterestStatus.INVITED) {
        props.attachment = [getICalendar(op)]
      }
      const info = await emailPerson(template, interest.person, props)
      PubSub.publish(TOPIC_PERSON__EMAIL_SENT, info)
    }
  })

  PubSub.subscribe(TOPIC_INTEREST__UPDATE, async (msg, interest) => {
    // a new interest has been created or a interest status has changed
    // send email to the opportunity requestor
    if ([
      InterestStatus.INTERESTED,
      InterestStatus.COMMITTED
      // InterestStatus.DECLINED
    ].includes(interest.status)) {
      const op = interest.opportunity
      op.requestor.href = `${config.appUrl}/home`
      op.href = `${config.appUrl}/ops/${op._id}`

      const template = `interest_op_${interest.type}_${interest.status}`
      const message = interest.messages.slice(-1)[0] // last element should be most recent
      const props = { from: interest.person, op, interest, message }
      const info = await emailPerson(template, op.requestor, props)
      PubSub.publish(TOPIC_PERSON__EMAIL_SENT, info)
    }
  })

  PubSub.subscribe(TOPIC_OPPORTUNITY__ARCHIVE, async (msg, archivedOpportunity) => {
    PubSub.publish(TOPIC_PERSON__EMAIL_SENT, {})
  })
}

PubSub.subscribe(TOPIC_INTEREST__MESSAGE, async (msg, interest) => {
  // a new message from vp or op has been attached to an interest record
  // send email to other person.
  const op = interest.opportunity
  op.href = `${config.appUrl}/ops/${op._id}`

  const vp = interest.person
  const requestor = op.requestor
  requestor.href = `${config.appUrl}/home`
  const message = interest.messages.slice(-1)[0] // last element should be most recent

  // from vp to op
  const info = (message.author._id.toString() === vp._id.toString())
    ? emailPerson('interest_op_message', requestor, { from: vp, op, interest, message })
    : emailPerson('interest_vp_message', vp, { from: requestor, op, interest, message })
  await info
  PubSub.publish(TOPIC_PERSON__EMAIL_SENT, info)
})
