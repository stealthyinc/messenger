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
import { apply, call, fork, put, select, take, takeLatest } from 'redux-saga/effects'
import EngineActions, { EngineSelectors, EngineTypes } from '../Redux/EngineRedux'
import {
  AsyncStorage,
} from 'react-native';
const { MessagingEngine } = require('../Engine/engine.js')

const logger = (...args) => { 
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

const createEngine = (userData) => {
  return new MessagingEngine(
                              logger,
                              userData['privateKey'],
                              userData['publicKey'],
                              false,
                              userData['profileURL'],
                              '',
                              {
                                neverWebRTC: true
                              })
}

function* watchInitialzedEventChannel(Instance) {
  const channel = eventChannel(emitter => {
    Instance.on('me-initialized', (engineInit) => emitter(engineInit))
    return () => {
      console.log(`Messaging Engine initialized`)
    }
  })
  const engineInit = yield take(channel)
  yield put(EngineActions.setEngineInitial(engineInit))
}

function* watchContactMgrEventChannel(Instance) {
  const channel = eventChannel(emitter => {
    Instance.on('me-update-contactmgr', (contactMgr) => emitter(contactMgr))
    return () => {
      console.log(`Messaging Engine updated contact manager:`)
    }
  })
  while (true) {
    const contactMgr = yield take(channel)
    yield put(EngineActions.setEngineContactMgr(contactMgr)) 
  }
}

function* watchMessagesEventChannel(Instance) {
  const channel = eventChannel(emitter => {
    Instance.on('me-update-messages', (messages) => emitter(messages))
    return () => {
      console.log(`Messaging Engine updated messages`)
    }
  })
  while (true) {
    const messages = yield take(channel)
    yield put(EngineActions.setEngineMessages(messages))
  }
}

function* handleContactClick(Instance) {
  const contact = yield select(EngineSelectors.getActiveContact)
  Instance.handleContactClick(contact)
}

function* handleOutgoingMessage(Instance) {
  const message = yield select(EngineSelectors.getOutgoingMessage)
  Instance.handleOutgoingMessage(message)
}

export function* startEngine () {
  const userData = yield select(EngineSelectors.getUserData)
  const Instance = yield call (createEngine, userData)
  const engineInit = yield select(EngineSelectors.getEngineInit)
  Instance.componentDidMountWork(engineInit, userData["username"])
  yield fork(watchInitialzedEventChannel, Instance)
  yield fork(watchContactMgrEventChannel, Instance)
  yield fork(watchMessagesEventChannel, Instance) 
  yield takeLatest(EngineTypes.SET_ACTIVE_CONTACT, handleContactClick, Instance)
  yield takeLatest(EngineTypes.SET_OUTGOING_MESSAGE, handleOutgoingMessage, Instance)
}



export function * getUserProfile (api) {
  const userData = yield select(EngineSelectors.getUserData)
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

export default function* engineSagas(api) {
  yield takeLatest(EngineTypes.SET_USER_DATA, startEngine)
  yield takeLatest(EngineTypes.SET_USER_DATA, getUserProfile, api)
}