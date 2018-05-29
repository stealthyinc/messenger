import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  engineSuccess: ['engine'],
  engineFailure: null,
  engineInitial: ['engineInit'],
})

export const EngineTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  fetching: null,
  error: null,
  engine: null,
  engineInit: false,
})

/* ------------- Selectors ------------- */

export const EngineSelectors = {
  getEngine: state => state.engine
}

/* ------------- Reducers ------------- */

// successful engine start
export const success = (state, action) => {
  const { engine } = action
  return state.merge({ fetching: false, error: null, engine })
}

// Something went wrong somewhere.
export const failure = state =>
  state.merge({ fetching: false, error: true, engine: null })

// engine intialized
export const initial = (state, action) => {
  const { engineInit } = action
  return state.merge({ engineInit })
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.ENGINE_SUCCESS]: success,
  [Types.ENGINE_FAILURE]: failure,
  [Types.ENGINE_INITIAL]: initial,
})
