const Organisation = require('./organisation')
// const Tag = require('../tag/tag')
// const escapeRegex = require('../../util/regexUtil')

// import slug from 'limax'
// import sanitizeHtml from 'sanitize-html'

/**
 * Get all orgs
 * @param req
 * @param res
 * @returns void
 */

const getOrganisations = async (req, res) => {
  let query = {}
  let sort = 'name'
  let select = null
  try {
    query = req.query.q ? JSON.parse(req.query.q) : query
    sort = req.query.s ? JSON.parse(req.query.s) : sort
    select = req.query.p ? req.query.p : null
  } catch (e) {
    // if there is something wrong with the query return a Bad Query
    return res.status(400).send(e)
  }
  try {
    const got = await Organisation.find(query, select).sort(sort).exec()
    res.json(got)
  } catch (e) {
    // If we can't find a match return 404
    res.status(404).send(e)
  }
}

module.exports = {
  getOrganisations
}
