import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

const utils = require('./../Engine/misc/utils.js')

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  setDapp: '',
  setDappUrl: ['dappUrl'],
  setDappData: ['dapp', 'data'],
  setDappError: ['dappError'],
  setDappMessage: ['dappMessage'],
  refreshIntegrationData: ['']
})

export const DappTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  dappError: '',
  dapp: '',
  dappUrl: '',
  dappData: null,
  dappMessage: null
})

/* ------------- Selectors ------------- */

export const DappSelectors = {
  getDapp: state => state.dapp.dapp,
  getDappUrl: state => state.dapp.dappUrl,
  getDappData: state => state.dapp.dappData,
  getDappError: state => state.dapp.dappError,
  getDappMessage: state => state.dapp.dappMessage
}

/* ------------- Reducers ------------- */

// send dapp
export const setDapp = (state, { dapp }) => {
  return state.merge({ dapp })
}

// send dapp url
export const setDappUrl = (state, { dappUrl }) => {
  return state.merge({ dappUrl })
}

// send dapp data
export const setDappData = (state, { dapp, data }) => {
  if (data) {
    let { dappData } = state

    // dappData is immutable, so we deep copy it to append new entries
    // TODO: PBJ to look into possible optimizations
    let dappDataCopy = utils.deepCopyObj(dappData)
    if (!dappDataCopy) {
      dappDataCopy = {}
    }
    dappDataCopy[dapp] = data[dapp]

    return state.merge({
      dappData: dappDataCopy
    })
  }
  return state
}

// send dapp message
export const setDappMessage = (state, { dappMessage }) => {
  return state.merge({ dappMessage })
}

// send dapp data
export const setDappError = (state, { dappError }) => {
  return state.merge({ dappError })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SET_DAPP]: setDapp,
  [Types.SET_DAPP_URL]: setDappUrl,
  [Types.SET_DAPP_DATA]: setDappData,
  [Types.SET_DAPP_ERROR]: setDappError,
  [Types.SET_DAPP_MESSAGE]: setDappMessage
})
