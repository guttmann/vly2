const { Role } = require('../../services/authorize/role')
const { Action } = require('../../services/abilities/ability.constants')

const ruleBuilder = session => {
  // const anonAbilities = {
  //   list: 'if active',
  //   create: 'no',
  //   read: 'if active',
  //   update: 'no',
  //   delete: 'no'
  // }

  const

  return {
    [Role.ANON]: [],
    [Role.VOLUNTEER_PROVIDER]: [],
    [Role.OPPORTUNITY_PROVIDER]: [],
    [Role.ADMIN]: [],
    [Role.ACTIVITY_PROVIDER]: [],
    [Role.ALL]: [],
    [Role.ORG_ADMIN]: []
  }
}

module.exports = ruleBuilder
