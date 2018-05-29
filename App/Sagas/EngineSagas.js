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

import { call, put, select } from 'redux-saga/effects'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
const { MessagingEngine } = require('../Engine/engine.js');

const _initEngineNoData = () => {
  // Start the engine:
  const logger = (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  };
  const privateKey = '1';
  const publicKey = '2';
  const isPlugIn = false;
  const avatarUrl = '';  // TODO
  const discoveryPath = ''; // TODO
  const configuration = {
    neverWebRTC: true
  }
  const engine =
    new MessagingEngine(logger,
                        privateKey,
                        publicKey,
                        isPlugIn,
                        avatarUrl,
                        discoveryPath,
                        configuration);
  return engine;
}

export function * startEngine () {
  const engine = _initEngineNoData()
  if (engine) {
    yield put(EngineActions.engineSuccess(engine))
  } else {
    yield put(EngineActions.engineFailure())
  }
}

export function * componentDidMountWork () {
  console.log('componentDidMountWork')
  const getEngine = EngineSelectors.getEngine
  const {engine} = yield select(getEngine)
  console.log(engine)
  engine.componentDidMountWork(false, 'alexc.id');
}
