import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  setDapp: '',
  setDappUrl: ['dappUrl'],
  setDappData: ['dappData']
})

export const DappTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  dapp: '',
  dappUrl: '',
  dappData: null
})

/* ------------- Selectors ------------- */

export const DappSelectors = {
  getDapp: state => state.dapp.dapp,
  getDappUrl: state => state.dapp.dappUrl,
  getDappData: state => state.dapp.dappData,
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
export const setDapaData = (state, { dappData }) => {
  return state.merge({ dappData })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SET_DAPP]: setDapp,
  [Types.SET_DAPP_URL]: setDappUrl,
  [Types.SET_DAPP_DATA]: setDapaData,
})
