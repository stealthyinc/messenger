const utils = require('./../misc//utils.js')

class MeasureIOFrequency {
  constructor() {
    this.instanceNum = Date.now()
    this.writes = {}
    this.reads = {}
    this.deletes = {}

    this.minuteIndex = 0
    this.writesPerMinute = []
    this.readsPerMinute = []
    this.deletesPerMinute = []

    this._minuteTimer()
    this._reportTimer()
  }

  recordWrite(userName, filePath) {
    const path = `${userName}/${filePath}`
    if (!this.writes.hasOwnProperty(path)) {
      this.writes[path] = []
    }
    this.writes[path].push(Date.now())
    if (this.writesPerMinute.length === this.minuteIndex) {
      this.writesPerMinute.push(0)
    }
    this.writesPerMinute[this.minuteIndex]++
  }

  recordRead(userName, filePath) {
    const path = `${userName}/${filePath}`
    if (!this.reads.hasOwnProperty(path)) {
      this.reads[path] = []
    }
    this.reads[path].push(Date.now())
    if (this.readsPerMinute.length === this.minuteIndex) {
      this.readsPerMinute.push(0)
    }
    this.readsPerMinute[this.minuteIndex]++
  }

  recordDelete(userName, filePath) {
    const path = `${userName}/${filePath}`
    if (!this.deletes.hasOwnProperty(path)) {
      this.deletes[path] = []
    }
    this.deletes[path].push(Date.now())
    if (this.deletesPerMinute.length === this.minuteIndex) {
      this.deletesPerMinute.push(0)
    }
    this.deletesPerMinute[this.minuteIndex]++
  }

  async _minuteTimer() {
    const oneMinuteMs = 1 * 60 * 1000

    while (true) {
      await utils.resolveAfterMilliseconds(oneMinuteMs)
      this.minuteIndex++
    }
  }

  async _reportTimer() {
    const fiveMinutesMs = 5 * 60 * 1000

    while (true) {
      await utils.resolveAfterMilliseconds(fiveMinutesMs)

      // From:
      // https://stackoverflow.com/questions/1230233/how-to-find-the-sum-of-an-array-of-numbers
      const avgWritesPerMin =  this.writesPerMinute.reduce((a,b) => a+b, 0) / (this.minuteIndex + 1)
      const avgReadsPerMin =  this.readsPerMinute.reduce((a,b) => a+b, 0) / (this.minuteIndex + 1)
      const avgDeletesPerMin =  this.deletesPerMinute.reduce((a,b) => a+b, 0) / (this.minuteIndex + 1)

      console.log(`MeasureIOFrequency Report (Instance = ${this.instanceNum})`)
      console.log('---------------------------------------------------------------------------------')
      console.log(`   Avg. writes / min. = ${avgWritesPerMin}`)
      console.log(`   Avg. reads / min. = ${avgReadsPerMin}`)
      console.log(`   Avg. deletes / min. = ${avgDeletesPerMin}`)
      console.log('')
      console.log('   Most. frequent write paths:')
      console.log('----------------------------------------')
      this._printFormattedPathList(this.writes)
      console.log('')
      console.log('   Most. frequent read paths:')
      console.log('----------------------------------------')
      this._printFormattedPathList(this.reads)
      console.log('')
      console.log('   Most. frequent delete paths:')
      console.log('----------------------------------------')
      this._printFormattedPathList(this.deletes)
      console.log('')
      console.log('')
    }
  }

  _getPathsInDescendingFrequency(aPathOccurenceDict) {
    let pathArr = []
    for (const path in aPathOccurenceDict) {
      const pathLen = aPathOccurenceDict[path].length
      pathArr.push({pathLen, path})
    }

    return pathArr.sort(function (eleA, eleB) {
      return eleB.pathLen - eleA.pathLen
    })
  }

  _printFormattedPathList(aPathOccurenceDict) {
    const sortedPathAndOccurences =
      this._getPathsInDescendingFrequency(aPathOccurenceDict)

    for (const ele of sortedPathAndOccurences) {
      console.log(`   ${ele.path} (${ele.pathLen})`)
    }
  }
}

module.exports = { MeasureIOFrequency }
