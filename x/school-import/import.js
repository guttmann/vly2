const SchoolLookUp = require('../../server/api/school-lookup/school-lookup')
const mongoose = require('mongoose');
const { config } = require('../../config/config')
const mapImportDataToSchema = require('../../lib/school-import/map-import-data-to-schema')
const filterValidSchoolRecords = require('../../lib/school-import/filter-valid-school-records')
const axios = require('axios')

async function main () {
  mongoose.Promise = Promise

  await mongoose.connect(
    config.databaseUrl,
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true
    }
  )

  const apiBaseUrl = 'https://catalogue.data.govt.nz/api/3/action/datastore_search?resource_id=bdfe0e4c-1554-4701-a8fe-ba1c8e0cc2ce&sort=Org_Name'

  let total = 0
  let offset = 0
  const limit = 100

  let insertCount = 0

  do {
    const response = await axios.get(`${apiBaseUrl}&offset=${offset}&limit=${limit}`)

    if (total === 0) {
      total = response.data.result.total
    }

    offset += limit

    const records = response.data.result.records

    const mappedSchoolRecords = []

    for (const record of records) {
      // convert record to data that matches our schema
      const schoolLookUpRecord = mapImportDataToSchema(record)
      mappedSchoolRecords.push(schoolLookUpRecord)
    }

    const validSchoolRecords = filterValidSchoolRecords(mappedSchoolRecords)

    await SchoolLookUp.collection.insertMany(validSchoolRecords)

    insertCount += validSchoolRecords.length

    console.log(`Inserted ${insertCount} schools`)

    // mappedSchoolRecords
    //   .filter((school) => school.emailDomain !== '')
      // .filter((school) => hasValidDomain(school.emailDomain))
      // .filter((school) => emailDomainHasMxRecord(school.emailDomain))
  } while (offset <= total)

  console.log('Done')
  mongoose.disconnect()
  process.exit(0)
}

main()
