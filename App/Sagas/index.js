import { takeLatest, all, fork } from 'redux-saga/effects'
import API from '../Services/Api'
import FixtureAPI from '../Services/FixtureApi'
import DebugConfig from '../Config/DebugConfig'

/* ------------- Types ------------- */

import { BlockstackContactsTypes } from '../Redux/BlockstackContactsRedux'

/* ------------- Sagas ------------- */

import { getBlockstackContacts } from './BlockstackContactsSagas'
import engineSagas from './EngineSagas'

/* ------------- API ------------- */

// The API we use is only used from Sagas, so we create it here and pass along
// to the sagas which need it.
const api = DebugConfig.useFixtures ? FixtureAPI : API.create()

/* ------------- Connect Types To Sagas ------------- */

export default function * root () {
  yield fork(engineSagas, api)
  yield takeLatest(BlockstackContactsTypes.BLOCKSTACK_CONTACTS_REQUEST, getBlockstackContacts, api)
}
