import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  shareInit: null,
  shareSuccess: null,
  shareDecline: null
})

export const TwitterShareTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  complete: null,
  incomplete: null,
  activateShare: null,
})

/* ------------- Selectors ------------- */

export const TwitterShareSelectors = {
  getActivateShare: state => state.twitter.activateShare,
}

/* ------------- Reducers ------------- */

export const init = state => {
  if (!state.complete && !state.incomplete)
    return state.merge({ activateShare: true})
  return state
}

export const success = state => {
  return state.merge({ complete: true, activateShare: false })
}

export const decline = state => {
  return state.merge({ incomplete: true, activateShare: false })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SHARE_INIT]: init,
  [Types.SHARE_SUCCESS]: success,
  [Types.SHARE_DECLINE]: decline
})
