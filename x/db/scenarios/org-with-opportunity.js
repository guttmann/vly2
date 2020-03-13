const mongoose = require('mongoose')
const { config } = require('../../../config/serverConfig')
const Organisation = require('../../../server/api/organisation/organisation')
const Person = require('../../../server/api/person/person')
const Member = require('../../../server/api/member/member')
const { MemberStatus } = require('../../../server/api/member/member.constants')
const { OpportunityStatus } = require('../../../server/api/opportunity/opportunity.constants')
const Opportunity = require('../../../server/api/opportunity/opportunity')
const { Role } = require('../../../server/services/authorize/role')
const { Interest } = require('../../../server/api/interest/interest')
const { InterestStatus } = require('../../../server/api/interest/interest.constants')

async function main () {
  mongoose.Promise = Promise

  if (process.env.NODE_ENV !== 'development') {
    console.log('This script can only be run in development')
    process.exit(1)
  }

  try {
    await mongoose.connect(
      config.databaseUrl,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
      }
    )
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  if (!process.argv[2]) {
    console.log('Provide an email for the person to link to the organisation')
    console.log('Usage: node x/db/scenarios/org-with-opportunity.js test@example.com')
    process.exit(1)
  }

  const person = await Person.findOne({ email: process.argv[2] })

  if (person === null) {
    console.log(`Could not find person for email: ${process.argv[2]}`)
    process.exit(1)
  }

  const organisationWithHistoryData = {
    name: 'Organisation with opportunity',
    slug: 'organisation-with-opportunity',
    category: ['op']
  }

  const organisation = await Organisation.findOneAndUpdate(
    organisationWithHistoryData,
    {
      $set: organisationWithHistoryData
    },
    { upsert: true, new: true }
  )

  const memberData = {
    person: person._id,
    organisation: organisation._id,
    status: MemberStatus.MEMBER
  }

  await Member.findOneAndUpdate(
    memberData,
    {
      $set: memberData
    },
    { upsert: true }
  )

  const opportunityData = {
    name: 'Opportunity 1',
    status: OpportunityStatus.ACTIVE,
    requestor: person,
    offerOrg: organisation
  }

  const opportunity = await Opportunity.findOneAndUpdate(
    opportunityData,
    {
      $set: opportunityData
    },
    { upsert: true, new: true }
  )

  const interestedPersonData = {
    name: 'Interested Person',
    nickname: 'Interested',
    email: 'interested.person@example.com',
    role: [Role.VOLUNTEER_PROVIDER]
  }

  const interestedPerson = await Person.findOneAndUpdate(
    { email: interestedPersonData.email },
    {
      $set: interestedPersonData
    },
    { upsert: true, new: true }
  )

  await Interest.deleteMany({
    person: interestedPerson
  })

  await Interest.create({
    person: interestedPerson,
    opportunity: opportunity,
    status: InterestStatus.INTERESTED,
    messages: [{
      body: 'I am interested',
      author: interestedPerson
    }],
    termsAccepted: true
  })

  console.log('Done')
  await mongoose.disconnect()
  process.exit(0)
}

main()
