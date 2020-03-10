import { useState, useCallback } from 'react'
import { Button, message } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormattedMessage } from 'react-intl'
import Loading from '../../components/Loading'
import OrgBanner from '../../components/Org/OrgBanner'
import OrgTabs from '../../components/Org/OrgTabs'
import OrgDetailForm from '../../components/Org/OrgDetailForm'
import { FullPage } from '../../components/VTheme/VTheme'
import publicPage from '../../hocs/publicPage'
import reduxApi, { withOrgs, withArchivedOpportunities } from '../../lib/redux/reduxApi.js'
import { MemberStatus } from '../../server/api/member/member.constants'
import RegisterMemberSection from '../../components/Member/RegisterMemberSection'
import { Helmet } from 'react-helmet'

const blankOrg = {
  name: 'New Organisation',
  about: '',
  imgUrl: '/static/img/organisation/organisation.png',
  contactEmail: '',
  contactId: null,
  website: null,
  facebook: null,
  twitter: null,
  category: ['vp']
}

export const HomeButton = () =>
  <Button
    type='secondary'
    shape='round'
    href='/'
    style={{ float: 'right' }}
  >
    <FormattedMessage
      id='orgDetailPage.button.home'
      defaultMessage='Return Home'
      description='Button to return home after editing'
    />
  </Button>

export const OrgUnknown = () =>
  <>
    <h2>
      <FormattedMessage
        id='orgDetailPage.OrgNotFound'
        defaultMessage='Sorry, this organisation is not available'
        description='Org not found message'
      />
    </h2>
    <Link href='/orgs'>
      <Button shape='round'>
        <FormattedMessage
          id='orgDetailPage.showOrgs'
          defaultMessage='Show All'
          description='Button to show all organisations'
        />
      </Button>
    </Link>
  </>

export const OrgDetailPage = ({
  members,
  me,
  organisations,
  archivedOpportunities,
  isNew,
  dispatch,
  isAuthenticated
}) => {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState(isNew ? 'edit' : router.query.tab)

  const updateTab = (key, top) => {
    setTab(key)
    if (top) window.scrollTo(0, 0)
    //  else { window.scrollTo(0, 400) }
    const newpath = `/orgs/${org._id}?tab=${key}`
    router.replace(router.pathname, newpath, { shallow: true })
  }
  const handleTabChange = (key, e) => {
    updateTab(key, key === 'edit')
  }
  const handleCancel = useCallback(
    () => {
      updateTab('about', true)
      if (isNew) { // return to previous
        router.back()
      }
    },
    [isNew]
  )

  const handleSubmit = useCallback(
    async (org) => {
      let res = {}
      if (org._id) {
      // update existing organisation
        res = await dispatch(
          reduxApi.actions.organisations.put(
            { id: org._id },
            { body: JSON.stringify(org) }
          )
        )
      } else {
      // save new organisation
        res = await dispatch(
          reduxApi.actions.organisations.post({}, { body: JSON.stringify(org) })
        )
        org = res[0]
        router.replace(`/orgs/${org._id}`)
      }
      setSaved(true)
      updateTab('about', true)
      message.success('Saved.')
    }, [])

  if (!organisations.sync && !isNew) {
    return <Loading label='organisation' entity={organisations} />
  }

  const orgs = organisations.data
  if (orgs.length === 0 && !isNew) {
    return <OrgUnknown />
  }
  const org = isNew ? blankOrg : orgs[0]

  // Who can edit?
  const isAdmin = me && me.role.includes('admin')
  const isOrgAdmin =
    members.data.length &&
    members.data[0].status === MemberStatus.ORGADMIN
  const canManage = isAuthenticated && (isOrgAdmin || isAdmin)

  if (tab === 'edit') {
    return (
      <FullPage>
        <Helmet>
          <title>Edit {org.name} - Voluntarily</title>
        </Helmet>
        <OrgDetailForm
          org={org}
          isAdmin={isAdmin}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </FullPage>)
  }

  return (
    <FullPage>
      <Helmet>
        <title>{org.name} - Voluntarily</title>
      </Helmet>

      <OrgBanner org={org}>
        {isAuthenticated && <RegisterMemberSection orgid={org._id} meid={me._id.toString()} />}
        {saved && <HomeButton />}
      </OrgBanner>
      <OrgTabs org={org} archivedOpportunities={archivedOpportunities.data} canManage={canManage} isAuthenticated={isAuthenticated} defaultTab={tab} onChange={handleTabChange} />
    </FullPage>)
}

OrgDetailPage.getInitialProps = async ({ store, query }) => {
  // Get one Org
  const isNew = query && query.new && query.new === 'new'
  if (isNew) {
    return {
      isNew: true,
      orgid: null
    }
  } else if (query && query.id) {
    await store.dispatch(reduxApi.actions.archivedOpportunities.get({ q: JSON.stringify({ offerOrg: query.id }) }))
    await store.dispatch(reduxApi.actions.organisations.get(query))
    if (store.getState().session.isAuthenticated) {
      // get my membership of this org
      const meid = store.getState().session.me._id.toString()
      await store.dispatch(
        reduxApi.actions.members.get({ orgid: query.id, meid: meid })
      )
    }
    return {
      isNew: false,
      orgid: query.id
    }
  }
}

export const OrgDetailPageWithOrgs = withArchivedOpportunities(withOrgs(OrgDetailPage))
export default publicPage(OrgDetailPageWithOrgs)
