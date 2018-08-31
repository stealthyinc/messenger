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

import { call, put } from 'redux-saga/effects'
import BlockstackContactsActions from '../Redux/BlockstackContactsRedux'
import { BlockstackContactsSelectors } from '../Redux/BlockstackContactsRedux'

export function * getBlockstackContacts (api, action) {
  const { data } = action
  // get current data from Store
  // const currentData = yield select(BlockstackContactsSelectors.getData)
  // make the call to the api
  const name = data.data
  const response = yield call(api.getBlockstackContacts, name)

  if (name) {
    // success?
    if (response.ok) {
      // You might need to change the response here - do this with a 'transform',
      // located in ../Transforms/. Otherwise, just pass the data back from the api.
      const {results} = response.data
      if (!results.length) {
        const namesResponse = yield call (api.getBlockstackNames, name)
        if (namesResponse) {
          const item = {
            profile: namesResponse,
            fullyQualifiedName: name,
            username: name
          }
          let newResults = [item]
          yield put(BlockstackContactsActions.blockstackContactsSuccess(newResults))
        }
      }
      else {
        yield put(BlockstackContactsActions.blockstackContactsSuccess(results))
      }
    } else {
      yield put(BlockstackContactsActions.blockstackContactsFailure())
    }
  }
}
