import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  shareUpdate: ['step'],
  shareSuccess: [''],
  shareDecline: null
})

export const TwitterShareTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  step: 0,
  complete: null,
  incomplete: null,
  activateShare: false,
})

/* ------------- Selectors ------------- */

export const TwitterShareSelectors = {
  getStep: state => state.twitter.step,
  getActivateShare: state => state.twitter.activateShare,
}

/* ------------- Reducers ------------- */

export const update = (state, { step }) => {
  if (step > 2) {
    if (!state.complete && !state.incomplete)
      state.merge({ step, activateShare: true})
  }
  return state.merge({ step })
}

export const success = state => {
  return state.merge({ complete: true, activateShare: false })
}

export const decline = state => {
  return state.merge({ incomplete: true, activateShare: false })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.SHARE_UPDATE]: update,
  [Types.SHARE_SUCCESS]: success,
  [Types.SHARE_DECLINE]: decline
})
