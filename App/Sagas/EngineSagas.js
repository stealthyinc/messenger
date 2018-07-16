/* ***********************************************************
* A short word on how to use this automagically generated file.
* We're often asked in the ignite gitter channel how to connect
* to a to a third party api, so we thought we'd demonstrate - but
* you should know you can use sagas for other flow control too.
*
* Other points:
*  - You'll need to add this saga to sagas/index.js
*  - This template uses the api declared in sagas/index.js, so
*    you'll need to define a constant in that file.
*************************************************************/
import { eventChannel } from 'redux-saga'
import { apply, call, fork, put, select, take, takeLatest, takeEvery } from 'redux-saga/effects'
import EngineActions, { EngineSelectors, EngineTypes } from '../Redux/EngineRedux'
import {
  AsyncStorage,
} from 'react-native';
import API from '../Services/Api'
import DebugConfig from '../Config/DebugConfig'

const common = require('./../common.js');

let EngineInstance = undefined;

const logger = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

const createEngine = (userData) => {
  const { MessagingEngine } = require('../Engine/engine.js')
  return new MessagingEngine(
                              logger,
                              userData['privateKey'],
                              userData['appPublicKey'],   // publicKey
                              false,                      // plugIn
                              userData['profileURL'],     // avatarUrl
                              common.getSessionId(),      // sessionId
                              true,                       // isMobile
                            )
}

function* watchInitialzedEventChannel() {
  const channel = eventChannel(emitter => {
    EngineInstance.on('me-initialized', (engineInit) => emitter(engineInit))
    return () => {
      console.log(`Messaging Engine initialized`)
    }
  })
  const engineInit = yield take(channel)
  yield put(EngineActions.setEngineInitial(engineInit))
}

function* watchContactMgrEventChannel() {
  const channel = eventChannel(emitter => {
    EngineInstance.on('me-update-contactmgr', (contactMgr) => emitter(contactMgr))
    return () => {
      console.log(`Messaging Engine updated contact manager:`)
    }
  })
  while (true) {
    const contactMgr = yield take(channel)
    yield put(EngineActions.setEngineContactMgr(contactMgr))
  }
}

function* watchMessagesEventChannel() {
  const channel = eventChannel(emitter => {
    EngineInstance.on('me-update-messages', (messages) => emitter(messages))
    return () => {
      console.log(`Messaging Engine updated messages`)
    }
  })
  while (true) {
    const messages = yield take(channel)
    yield put(EngineActions.setEngineMessages(messages))
  }
}

function* watchContactAddedChannel() {
  const channel = eventChannel(emitter => {
    EngineInstance.on('me-close-contact-search', (flag) => emitter(flag))
    return () => {
      console.log(`Messaging Engine updated messages`)
    }
  })
  while (true) {
    const flag = yield take(channel)
    yield put(EngineActions.setContactAdded(flag))
  }
}

function* watchUserSettingsChannel() {
  const channel = eventChannel(emitter => {
    EngineInstance.on('me-update-settings', (settings) => emitter(settings))
    return () => {
      console.log(`Messaging Engine Settings`)
    }
  })
  while (true) {
    const settings = yield take(channel)
    yield put(EngineActions.setUserSettings(settings))
  }
}

function* watchShutDownChannel() {
  const channel = eventChannel(emitter => {
    EngineInstance.on('me-shutdown-complete', (engineShutdown) => emitter(engineShutdown))
    return () => { console.log('Messaging Engine Shutdown')}
  })
  const engineShutdown = yield take(channel)
  yield put(EngineActions.setEngineShutdown(engineShutdown))
}

function* handleShutDownRequest() {
  EngineInstance.handleShutDownRequest();
}

function* handleContactClick(action) {
  const { activeContact } = action
  EngineInstance.handleContactClick(activeContact)
}

function* handleOutgoingMessage(action) {
  const { outgoingMessage } = action
  EngineInstance.handleOutgoingMessage(outgoingMessage)
}

function* handleSearchSelect(action) {
  const { newContact } = action
  EngineInstance.handleSearchSelect(newContact)
}

function* updateUserSettings(action) {
  const { radioSetting } = action
  EngineInstance.handleRadio(null, { name: radioSetting })
}

function* deleteContact(action) {
  const { deleteContact } = action
  EngineInstance.handleDeleteContact(null, { contact: deleteContact })
}

function* getToken() {
  const api = DebugConfig.useFixtures ? FixtureAPI : API.getAccessToken("https://us-central1-coldmessage-ae5bc.cloudfunctions.net/getAccessToken")
  const response = yield call (api.token)
  if (response.ok) {
    yield put(EngineActions.setBearerToken(response.data))
  }
}

function* sendNotificationWorker(action) {
  // process for sending a notification
  // - check fb under /global/notifications/senderPK
  // - decrypt data and look up receiver's user device token
  // - send a request to fb server to notify the person of a new message
  const { recepientToken, publicKey, bearerToken } = action
  const pk = publicKey.substr(publicKey.length - 4)
  const api = DebugConfig.useFixtures ? FixtureAPI : API.notification('https://fcm.googleapis.com/v1/projects/coldmessage-ae5bc/messages:send', recepientToken, pk, bearerToken)
  const response = yield call (api.send)
}

function* backgroundTasks() {
  EngineInstance.handleMobileBackgroundUpdate()
}

function* notificationTasks(action) {
  const { senderInfo } = action
  EngineInstance.handleMobileNotifications(senderInfo)
}

export function* startEngine (action) {
  const { userData } = action
  EngineInstance = yield call (createEngine, userData)
  const engineInit = yield select(EngineSelectors.getEngineInit)
  EngineInstance.componentDidMountWork(engineInit, userData["username"])
  yield fork(watchInitialzedEventChannel)
  yield fork(watchContactMgrEventChannel)
  yield fork(watchMessagesEventChannel)
  yield fork(watchContactAddedChannel)
  yield fork(watchUserSettingsChannel)
  yield fork(watchShutDownChannel)
  yield takeLatest(EngineTypes.INIT_SHUTDOWN, handleShutDownRequest)
  yield takeLatest(EngineTypes.SET_ACTIVE_CONTACT, handleContactClick)
  yield takeLatest(EngineTypes.SET_OUTGOING_MESSAGE, handleOutgoingMessage)
  yield takeLatest(EngineTypes.ADD_NEW_CONTACT, handleSearchSelect)
  yield takeLatest(EngineTypes.SEND_NOTIFICATION, sendNotificationWorker)
  yield takeLatest(EngineTypes.UPDATE_USER_SETTINGS, updateUserSettings)
  yield takeLatest(EngineTypes.BACKGROUND_REFRESH, backgroundTasks)
  yield takeLatest(EngineTypes.HANDLE_DELETE_CONTACT, deleteContact)
  yield takeEvery(EngineTypes.NEW_NOTIFICATION, notificationTasks)
}

export function * getUserProfile (api, action) {
  const { userData } = action
  const { username } = userData
  const response = yield call(api.getUserProfile, username)
  if (response.ok) {
    const userProfile = response.data[username]
    yield put(EngineActions.setUserProfile(userProfile))
    AsyncStorage.setItem('userProfile', JSON.stringify(userProfile))
  } else {
    yield put(EngineActions.setUserProfile(null))
  }
}

export function * getActiveUserProfile (api, action) {
  const { activeContact } = action
  if (activeContact) {
    const { id } = activeContact
    const response = yield call(api.getUserProfile, id)
    if (response.ok) {
      const userProfile = response.data[id]
      yield put(EngineActions.setActiveUserProfile(userProfile))
    } else {
      yield put(EngineActions.setActiveUserProfile(null))
    }
  } else {
    yield put(EngineActions.setActiveUserProfile(null))
  }
}

export default function* engineSagas(api) {
  yield takeLatest(EngineTypes.SET_USER_DATA, getToken)
  yield takeLatest(EngineTypes.SET_USER_DATA, startEngine)
  yield takeLatest(EngineTypes.SET_USER_DATA, getUserProfile, api)
  yield takeLatest(EngineTypes.SET_ACTIVE_CONTACT, getActiveUserProfile, api)
}
