import { createReducer, createActions } from 'reduxsauce'
import { NativeModules } from 'react-native'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  setEngineFailure: null,
  setUserData:['userData'],
  setPublicKey: ['publicKey'],
  setEngineInitial: ['engineInit'],
  setEngineContactMgr: ['contactMgr'],
  setEngineMessages: ['messages'],
  setActiveContact: ['activeContact'],
  setOutgoingMessage: ['outgoingMessage'],
  setUserProfile: ['userProfile'],
  setActiveUserProfile: ['activeUserProfile'],
  addNewContact: ['newContact'],
  setContactAdded: ['contactAdded'],
  setToken: ['token'],
  sendNotification: ['recepientToken', 'publicKey', 'bearerToken'],
  setUserSettings: ['userSettings'],
  setEngineShutdown: ['engineShutdown'],
  updateUserSettings: ['radioSetting'],
  backgroundRefresh: [''],
  handleDeleteContact: ['deleteContact'],
  clearUserData: ['publicKey'],
  setCurrentPlatform: ['currentPlatform'],
  initShutdown: [''],
  newNotification: ['senderInfo'],
  setBearerToken: ['bearerToken'],
  setSession: ['session'],
  sendFileUrl: ['fileUrl']
})

export const EngineTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  fetching: null,
  error: null,
  userData: null,
  userProfile: null,
  activeUserProfile: null,
  engineInit: false,
  engineShutdown: false,
  contactMgr: null,
  messages: null,
  contactAdded: false,
  token: '',
  userSettings: {},
  currentPlatform: '',
  lockEngine: false,
  publicKey: '',
  bearerToken: '',
  session: '',
  fileUrl: '',
})

/* ------------- Selectors ------------- */

export const EngineSelectors = {
  getUserProfile: state => state.engine.userProfile,
  getActiveUserProfile: state => state.engine.activeUserProfile,
  getUserData: state => state.engine.userData,
  getEngineInit: state => state.engine.engineInit,
  getContactMgr: state => state.engine.contactMgr,
  getMessages: state => state.engine.messages,
  getContactAdded: state => state.engine.contactAdded,
  getToken: state => state.engine.token,
  getUserSettings: state => state.engine.userSettings,
  getCurrentPlatform: state => state.engine.currentPlatform,
  getEngineLock: state => state.engine.lockEngine,
  getPublicKey: state => state.engine.publicKey,
  getEngineShutdown: state => state.engine.engineShutdown,
  getBearerToken: state => state.engine.bearerToken,
  getSession: state => state.engine.session,
  getFileUrl: state => state.engine.fileUrl,
}

/* ------------- Reducers ------------- */

// set current platform
export const setCurrentPlatform = (state, { currentPlatform }) => {
  return state.merge({ currentPlatform })
}

// engine failed to start
export const setEngineFailure = state =>
  state.merge({ fetching: false, error: true, engine: null })

// engine intialized
export const setUserData = (state, { userData }) => {
  return state.merge({ userData })
}

// engine clear data
export const clearUserData = (state, { publicKey }) => {
  let newState = INITIAL_STATE
  newState.merge({ publicKey })
  return newState
}

export const setPublicKey = (state, { publicKey }) => {
  return state.merge({ publicKey })
}

export const setUserProfile = (state, { userProfile }) => {
  return state.merge({ userProfile })
}

export const setActiveUserProfile = (state, { activeUserProfile }) => {
  return state.merge({ activeUserProfile })
}

// engine intialized
export const setEngineInitial = (state, { engineInit }) => {
  return state.merge({ engineInit })
}

// set contact manager
export const setEngineContactMgr = (state, { contactMgr }) => {
  return state.merge({ contactMgr })
}

// set messages
export const setEngineMessages = (state, { messages }) => {
  return state.merge({ messages })
}

// set contact added
export const setContactAdded = (state, { contactAdded }) => {
  return state.merge({ contactAdded })
}

// set token
export const setToken = (state, { token }) => {
  return state.merge({ token })
}

// set bearer token
export const setBearerToken = (state, { bearerToken }) => {
  return state.merge({ bearerToken })
}

// set session
export const setSession = (state, { session }) => {
  return state.merge({ session })
}

// read user settings from engine
export const setUserSettings = (state, { userSettings }) => {
  return state.merge({ userSettings })
}

// engine has shutdown (done saving stuff - safe to terminate)
export const setEngineShutdown = (state, { engineShutdown }) => {
  if (engineShutdown) {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.signOut(); // Promise, might need return in .then
  }
  return state.merge({ engineShutdown })
}

// send file url
export const sendFileUrl = (state, { fileUrl }) => {
  return state.merge({ fileUrl })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SET_USER_DATA]: setUserData,
  [Types.SET_PUBLIC_KEY]: setPublicKey,
  [Types.SET_CURRENT_PLATFORM]: setCurrentPlatform,
  [Types.CLEAR_USER_DATA]: clearUserData,
  [Types.SET_USER_PROFILE]: setUserProfile,
  [Types.SET_ACTIVE_USER_PROFILE]: setActiveUserProfile,
  [Types.SET_ENGINE_FAILURE]: setEngineFailure,
  [Types.SET_ENGINE_INITIAL]: setEngineInitial,
  [Types.SET_ENGINE_CONTACT_MGR]: setEngineContactMgr,
  [Types.SET_ENGINE_MESSAGES]: setEngineMessages,
  [Types.SET_CONTACT_ADDED]: setContactAdded,
  [Types.SET_TOKEN]: setToken,
  [Types.SET_USER_SETTINGS]: setUserSettings,
  [Types.SET_ENGINE_SHUTDOWN]: setEngineShutdown,
  [Types.SET_BEARER_TOKEN]: setBearerToken,
  [Types.SET_SESSION]: setSession,
  [Types.SEND_FILE_URL]: sendFileUrl,
})
