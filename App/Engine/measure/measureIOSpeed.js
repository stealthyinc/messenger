import {AsyncStorage} from 'react-native'

const utils = require('./../misc/utils.js')

module.exports.asyncIoVsGaiaIo = async function(aUserId, aContactArr, anIoInst) {
  console.log('')
  console.log('GAIA vs. Async Storage Test')
  console.log('---------------------------------------------------------------')
  console.log('')
  // Code to test Gaia vs. Async Storage performance
  //
  // (TODO) This test is somewhat silly since the server is rate limited anyway--might need to
  // stop/start (i.e. wait some Ms and subtract that from the sum to get better info).
  // That said, it points out an important limitation of GAIA vs. AsyncStorage
  //
  // Other thoughts:
  //  - may need to randomize the data to combat caching in testing
  //  - may need delays to prevent gaia limit hits
  //
  ////////////////////////////////////////////////////////////////////////////
  const RUNS = 100
  const asyncStorageNS = '@GaiaMirrorTest'
  const filePath = 'ioTest.blob'
  const asyncStorageFilePath = `${asyncStorageNS}:${filePath}`
  const testData = utils.deepCopyObj(aContactArr)
  const strTestData = JSON.stringify(testData)

  // ---- Write Tests ----

  // GAIA Robust Local Write
  let count = 0
  let errorCount = 0
  let start = Date.now()
  while (count < RUNS && errorCount < RUNS) {
    try {
      await anIoInst.robustLocalWrite(aUserId, filePath, strTestData)
      count++
    } catch (error) {
      errorCount++
    } finally {
    }
  }
  const gaiaRobustWriteTrialMs = Date.now() - start
  const gaiaRobustWriteErrors = errorCount
  console.log(`${RUNS} GAIA robust writes: ${gaiaRobustWriteTrialMs} ms, ${gaiaRobustWriteErrors} errors`)

  // GAIA Local Write
  count = 0
  errorCount = 0
  start = Date.now()
  while (count < RUNS && errorCount < RUNS) {
    try {
      await anIoInst.writeLocalFile(aUserId, filePath, strTestData)
      count++
    } catch (error) {
      errorCount++
    } finally {
    }
  }
  const gaiaWriteTrialMs = Date.now() - start
  const gaiaWriteErrors = errorCount
  console.log(`${RUNS} GAIA writes: ${gaiaWriteTrialMs} ms, ${gaiaWriteErrors} errors`)

  // AsyncStorage Local Write
  count = 0
  errorCount = 0
  start = Date.now()
  while (count < RUNS && errorCount < RUNS) {
    try {
      await AsyncStorage.setItem(asyncStorageFilePath, strTestData)
      count++
    } catch (error) {
      errorCount++
    } finally {
    }
  }
  const asyncWriteTrialMs = Date.now() - start
  const asyncWriteErrors = errorCount
  console.log(`${RUNS} AsyncStorage writes: ${asyncWriteTrialMs} ms, ${asyncWriteErrors} errors`)

  // ---- Read Tests ----
  console.log('')

  // GAIA Robust Local Read
  let strResultData = undefined
  count = 0
  errorCount = 0
  start = Date.now()
  while (count < RUNS && errorCount < RUNS) {
    try {
      strResultData = await anIoInst.robustLocalRead(aUserId, filePath)
      count++
    } catch (error) {
      errorCount++
    } finally {
    }
  }
  const gaiaRobustReadTrialMs = Date.now() - start
  const gaiaRobustReadErrors = errorCount
  console.log(`${RUNS} GAIA robust reads: ${gaiaRobustReadTrialMs} ms, ${gaiaRobustReadErrors} errors`)

  // GAIA Local Read
  strResultData = undefined
  count = 0
  errorCount = 0
  start = Date.now()
  while (count < RUNS && errorCount < RUNS) {
    try {
      strResultData = await anIoInst.readLocalFile(aUserId, filePath)
      count++
    } catch (error) {
      errorCount++
    } finally {
    }
  }
  const gaiaReadTrialMs = Date.now() - start
  const gaiaReadErrors = errorCount
  console.log(`${RUNS} GAIA reads: ${gaiaReadTrialMs} ms, ${gaiaReadErrors} errors`)

  // AsyncStorage Local Read
  setResultData = undefined
  count = 0
  errorCount = 0
  start = Date.now()
  while (count < RUNS && errorCount < RUNS) {
    try {
      setResultData = await AsyncStorage.getItem(asyncStorageFilePath)
      count++
    } catch (error) {
      errorCount++
    } finally {
    }
  }
  const asyncReadTrialMs = Date.now() - start
  const asyncReadErrors = errorCount
  console.log(`${RUNS} AsyncStorage reads: ${asyncReadTrialMs} ms, ${asyncReadErrors} errors`)
}
