import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  setEngineFailure: null,
  setUserData:['userData'],
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
  sendNotification: ['recepientToken'],
  setUserSettings: ['userSettings'],
  updateUserSettings: ['radioSetting'],
  backgroundRefresh: [''],
  handleDeleteContact: ['deleteContact'],
  clearUserData: [''],
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
  contactMgr: null,
  messages: null,
  activeContact: '',
  outgoingMessage: '',
  newContact: null,
  contactAdded: false,
  token: '',
  recepientToken: '',
  userSettings: {},
  radioSetting: '',
  deleteContact: null,
})

/* ------------- Selectors ------------- */

export const EngineSelectors = {
  getUserProfile: state => state.engine.userProfile,
  getActiveUserProfile: state => state.engine.activeUserProfile,
  getUserData: state => state.engine.userData,
  getActiveContact: state => state.engine.activeContact,
  getEngineInit: state => state.engine.engineInit,
  getContactMgr: state => state.engine.contactMgr,
  getMessages: state => state.engine.messages,
  getOutgoingMessage: state => state.engine.outgoingMessage,
  getNewContact: state => state.engine.newContact,
  getContactAdded: state => state.engine.contactAdded,
  getToken: state => state.engine.token,
  getRecepientToken: state => state.engine.recepientToken,
  getUserSettings: state => state.engine.userSettings,
  getSettingsRadio: state => state.engine.radioSetting,
  getDeleteContact: state => state.engine.deleteContact,
}

/* ------------- Reducers ------------- */

// engine failed to start
export const setEngineFailure = state =>
  state.merge({ fetching: false, error: true, engine: null })

// engine intialized
export const setUserData = (state, { userData }) => {
  return state.merge({ userData })
}

// engine clear data
export const clearUserData = (state) => {
  return INITIAL_STATE
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

// set active contact
export const setActiveContact = (state, { activeContact }) => {
  return state.merge({ activeContact })
}

// set outgoing message
export const setOutgoingMessage = (state, { outgoingMessage }) => {
  return state.merge({ outgoingMessage })
}

// set new contact
export const addNewContact = (state, { newContact }) => {
  return state.merge({ newContact })
}

// set contact added
export const setContactAdded = (state, { contactAdded }) => {
  return state.merge({ contactAdded })
}

// set token
export const setToken = (state, { token }) => {
  return state.merge({ token })
}

// send notification
export const sendNotification = (state, { recepientToken }) => {
  return state.merge({ recepientToken })
}

// read user settings from engine
export const setUserSettings = (state, { userSettings }) => {
  return state.merge({ userSettings })
}

// read user settings from engine
export const updateUserSettings = (state, { radioSetting }) => {
  return state.merge({ radioSetting })
}

// delete contact from engine
export const handleDeleteContact = (state, { deleteContact }) => {
  return state.merge({ deleteContact })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SET_USER_DATA]: setUserData,
  [Types.CLEAR_USER_DATA]: clearUserData,
  [Types.SET_USER_PROFILE]: setUserProfile,
  [Types.SET_ACTIVE_USER_PROFILE]: setActiveUserProfile,
  [Types.SET_OUTGOING_MESSAGE]: setOutgoingMessage,
  [Types.SET_ACTIVE_CONTACT]: setActiveContact,
  [Types.SET_ENGINE_FAILURE]: setEngineFailure,
  [Types.SET_ENGINE_INITIAL]: setEngineInitial,
  [Types.SET_ENGINE_CONTACT_MGR]: setEngineContactMgr,
  [Types.SET_ENGINE_MESSAGES]: setEngineMessages,
  [Types.ADD_NEW_CONTACT]: addNewContact,
  [Types.SET_CONTACT_ADDED]: setContactAdded,
  [Types.SET_TOKEN]: setToken,
  [Types.SEND_NOTIFICATION]: sendNotification,
  [Types.SET_USER_SETTINGS]: setUserSettings,
  [Types.UPDATE_USER_SETTINGS]: updateUserSettings,
  [Types.HANDLE_DELETE_CONTACT]: handleDeleteContact,
})
