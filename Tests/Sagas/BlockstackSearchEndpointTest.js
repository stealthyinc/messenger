import FixtureAPI from '../../App/Services/FixtureApi'
import { put, call } from 'redux-saga/effects'
import { getActiveUserProfile } from '../../App/Sagas/EngineSagas'
import EngineActions from '../../App/Redux/EngineRedux'
import { path } from 'ramda'

const stepper = (fn) => (mock) => fn.next(mock).value

test('first call blockstack search endpoint API', () => {
  const step = stepper(getActiveUserProfile(FixtureAPI, {activeContact: {id: 'ryan.id'}}))
  // first yield is API
  expect(step()).toEqual(call(FixtureAPI.getUserProfile, 'ryan'))
})

test('success path', () => {
  const response = FixtureAPI.getUserProfile('ryan')
  const step = stepper(getActiveUserProfile(FixtureAPI, {activeContact: {id: 'ryan.id'}}))
  // first step API
  step()
  // Second step successful return
  const stepResponse = step(response)
  const userProfile = response.data['ryan']
  expect(stepResponse).toEqual(put(EngineActions.setActiveUserProfile(userProfile)))
})

test('failure path', () => {
  const response = {ok: false}
  const step = stepper(getActiveUserProfile(FixtureAPI, {activeContact: {id: 'ryan.id'}}))
  // first step API
  step()
  // Second step failed response
  expect(step(response)).toEqual(put(EngineActions.setActiveUserProfile(null)))
})
