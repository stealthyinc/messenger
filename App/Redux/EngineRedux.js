import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */
// Implicit Indirection:
// The name on the left maps to an engine type elsewhere in the code. For instance
// you will find setOutgoingMessage --> EngineTypes.SET_OUTGOING_MESSAGE.
//
const { Types, Creators } = createActions({
  setEngineFailure: null,
  setAppVersion: ['appVersion'],
  setUserData: ['userData'],
  addContactId: ['id'],
  setPublicKey: ['publicKey'],
  setEngineInitial: ['engineInit'],
  setEngineContactMgr: ['contactMgr'],
  setEngineMessages: ['messages'],
  setActiveContact: ['activeContact'],
  setOutgoingMessage: ['outgoingMessage', 'json'],
  setUserProfile: ['userProfile'],
  setActiveUserProfile: ['activeUserProfile'],
  addNewContact: ['newContact', 'flag'],
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
  setEngineFault: ['engineFault'],
  restartEngine: ['userData'],
  updateContactPubKey: ['aContactId'],
  foreGround: [''],
  backGround: [''],
  setSignInPending: ['flag'],
  setAmaData: ['amaData'],
  setAmaStatus: ['amaStatus'],
  sendAmaInfo: ['msgAddress', 'amaId', 'amaUserId'],
  setChannelsData: ['channels'],
  setSpinnerData: ['spinnerFlag', 'spinnerMessage'],
  setToastData: ['toastFlag', 'toastMessage']
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
  engineFault: '',
  signInPending: null,
  id: '',
  amaData: undefined,
  amaStatus: undefined,
  channels: null,
  spinnerFlag: false,
  spinnerMessage: '',
  toastFlag: false,
  toastMessage: '',
  appVersion: '',
})

/* ------------- Selectors ------------- */

export const EngineSelectors = {
  getAppVersion: state => state.engine.appVersion,
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
  getEngineFault: state => state.engine.engineFault,
  getSignInPending: state => state.engine.signInPending,
  getAmaData: state => state.engine.amaData,
  getAmaStatus: state => state.engine.amaStatus,
  getChannelsData: state => state.engine.channels,
  getSpinnerFlag: state => state.engine.spinnerFlag,
  getSpinnerMessage: state => state.engine.spinnerMessage,
  getToastFlag: state => state.engine.toastFlag,
  getToastMessage: state => state.engine.toastMessage
}

/* ------------- Reducers ------------- */

// set current platform
export const setContactId = (state, { id }) => {
  return state.merge({ id })
}

export const setCurrentPlatform = (state, { currentPlatform }) => {
  return state.merge({ currentPlatform })
}

export const setAppVersion = (state, { appVersion }) => {
  return state.merge({ appVersion })
}

// set sign in pending flag
export const setSignInPending = (state, { flag }) => {
  return state.merge({ signInPending: flag })
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
  return state.merge({ engineInit, spinnerFlag: false, spinnerMessage: '' })
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
  return state.merge({ engineShutdown })
}

// engine has gone into a bad state
export const setEngineFault = (state, { engineFault }) => {
  return state.merge({ engineFault })
}

// engine has gone into a bad state
export const restartEngine = (state) => {
  return state.merge({ engineFault: false })
}

// engine has got new ama data
export const setAmaData = (state, { amaData }) => {
  return state.merge({ amaData })
}

// engine has got new ama status
export const setAmaStatus = (state, { amaStatus }) => {
  return state.merge({ amaStatus })
}

// got new channels from firebase
export const setChannelsData = (state, { channels }) => {
  return state.merge({ channels })
}

// set Spinner Data
export const setSpinnerData = (state, { spinnerFlag, spinnerMessage }) => {
  return state.merge({ spinnerFlag, spinnerMessage })
}

// set Toast Data
export const setToastData = (state, { toastFlag, toastMessage }) => {
  return state.merge({ toastFlag, toastMessage })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SET_USER_DATA]: setUserData,
  [Types.SET_PUBLIC_KEY]: setPublicKey,
  [Types.ADD_CONTACT_ID]: setContactId,
  [Types.SET_CURRENT_PLATFORM]: setCurrentPlatform,
  [Types.SET_SIGN_IN_PENDING]: setSignInPending,
  [Types.CLEAR_USER_DATA]: clearUserData,
  [Types.SET_USER_PROFILE]: setUserProfile,
  [Types.SET_ACTIVE_USER_PROFILE]: setActiveUserProfile,
  [Types.SET_ENGINE_FAILURE]: setEngineFailure,
  [Types.SET_ENGINE_INITIAL]: setEngineInitial,
  [Types.SET_ENGINE_CONTACT_MGR]: setEngineContactMgr,
  [Types.SET_ENGINE_MESSAGES]: setEngineMessages,
  [Types.SET_AMA_DATA]: setAmaData,
  [Types.SET_AMA_STATUS]: setAmaStatus, // copy pasta is death
  [Types.SET_CONTACT_ADDED]: setContactAdded,
  [Types.SET_TOKEN]: setToken,
  [Types.SET_USER_SETTINGS]: setUserSettings,
  [Types.SET_ENGINE_SHUTDOWN]: setEngineShutdown,
  [Types.SET_BEARER_TOKEN]: setBearerToken,
  [Types.SET_SESSION]: setSession,
  [Types.SET_ENGINE_FAULT]: setEngineFault,
  [Types.RESTART_ENGINE]: restartEngine,
  [Types.SET_CHANNELS_DATA]: setChannelsData,
  [Types.SET_SPINNER_DATA]: setSpinnerData,
  [Types.SET_TOAST_DATA]: setToastData
})
