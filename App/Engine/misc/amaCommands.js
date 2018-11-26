export default class AmaCommands {
  constructor(aUserId, amaId) {
    this.userId = aUserId
    this.amaId = amaId
  }

  static cmdToText(command, obj) {
    return `/${command} ${JSON.stringify(obj)}`
  }

  static textToCmdObj(text) {
    let cmdObj = {}
    if (!text) {
      return cmdObj
    }

    const tokenizedContent = text.match(/^(\/[^ ]*) (.*)/)
    if (tokenizedContent.length < 3) {
      return cmdObj
    }

    cmdObj.cmd = tokenizedContent[1]
    try {
      cmdObj.props = JSON.parse(tokenizedContent[2])
    } catch (error) {
      console.log(`WARNING(AmaCommands::textToCmdObj): ${error}.`)
      cmdObj.props = undefined
    }

    return cmdObj
  }

  // Also if we're on Android, escape the stringified JSON in the command to prevent
  // Android evaluation from removing '\' characters. For example, this:
  //
  //   {"blah": "foo", "obj": "/cmd {\"ama_id\": \"123132\"}"}
  //
  // became this without our code here:
  //
  //   {"blah": "foo", "obj": "/cmd {"ama_id": "123132"}"}
  //
  // which would cause a JSON parse on 'obj' to fail.
  //
  // TODO: ideally we would transmit the message as JSON_DATA, but we're out
  //       of time.
  //
  static getAndroidCmdTextWorkaround(cmdText) {
    const cmdObj = AmaCommands.textToCmdObj(cmdText)

    try {
      let strObj = JSON.stringify(cmdObj.props)
      let androidStrObj = strObj.replace(/\"/g, '\\"')

      return `${cmdObj.cmd} ${androidStrObj}`
    } catch (error) {
      console.log(`WARNING(AmaCommands::getAndroidCmdTextWorkaround): ${error}`)
    }

    return undefined
  }

  static amaCreate(aTitle) {
    const obj = {
      title: aTitle
    }

    return AmaCommands.cmdToText('amaCreate', obj)
  }

  // TODO: refactor command strings into an array / data structure for DRY and
  //       ability to modify cmd prefix etc.
  //
  static isAmaCommand(text) {
    return text && (
        text.includes('/amaCreate') ||
        text.includes('/amaOpen') ||
        text.includes('/amaPause') ||
        text.includes('/amaClose') ||
        text.includes('/amaDelete') ||
        text.includes('/responderAdd') ||
        text.includes('/responderDelete') ||
        text.includes('/questionCreate') ||
        text.includes('/questionDelete') ||
        text.includes('/questionUpvote') ||
        text.includes('/questionUnvote') ||
        text.includes('/questionPin') ||
        text.includes('/questionUnpin') ||
        text.includes('/answerCreate') ||
        text.includes('/answerEdit') ||
        text.includes('/answerDelete') ||
        text.includes('/userBlock') ||
        text.includes('/userUnblock') ||
        text.includes('/delegateAdd') ||
        text.includes('/delegateDelete')
      )
  }

  static getQuestionUpvoteObj(text) {
    if (text && text.includes('/questionUpvote')) {
      const strJson = text.replace('/questionUpvote ', '')
      try {
        return JSON.parse(strJson)
      } catch(error) {
        console.log(`WARNING(AmaCommands::getQuestionUpvoteId): problem extracting ama and question id.\n${error}`)
      }
    }
    return undefined
  }

  questionCreate(text) {
    const obj = {
      ama_id: this.amaId,
      text: text
    }

    return AmaCommands.cmdToText('questionCreate', obj)
  }

  questionDelete(aQuestionId) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId
    }

    return AmaCommands.cmdToText('questionDelete', obj)
  }

  questionUpvote(aQuestionId) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId
    }

    return AmaCommands.cmdToText('questionUpvote', obj)
  }

  questionUnvote(aQuestionId) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId
    }

    return AmaCommands.cmdToText('questionUnvote', obj)
  }

  questionPin(aQuestionId) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId
    }

    return AmaCommands.cmdToText('questionPin', obj)
  }

  questionUnpin(aQuestionId) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId
    }

    return AmaCommands.cmdToText('questionUnpin', obj)
  }

  answerCreate(aQuestionId, text) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId,
      text: text
    }

    return AmaCommands.cmdToText('answerCreate', obj)
  }

  answerDelete(anAnswerId) {
    const obj = {
      ama_id: this.amaId,
      answer_id: anAnswerId
    }

    return AmaCommands.cmdToText('answerDelete', obj)
  }

  userBlock(aUserId) {
    const obj = {
      user_id: aUserId
    }

    return AmaCommands.cmdToText('userBlock', obj)
  }

  delegateAdd(aUserId) {
    const obj = {
      ama_id: this.amaId,
      user_id: aUserId
    }

    return AmaCommands.cmdToText('delegateAdd', obj)
  }

  delegateDelete(aUserId) {
    const obj = {
      ama_id: this.amaId,
      user_id: aUserId
    }

    return AmaCommands.cmdToText('delegateDelete', obj)
  }

  // Stretch / Future:
  //////////////////////////////////////////////////////////////////////////////
  objectPin() {
    // TODO
  }

  answerEdit(answerId) {
    // TODO
  }

  userUnblock(aUserId) {
    // TODO
  }
}
