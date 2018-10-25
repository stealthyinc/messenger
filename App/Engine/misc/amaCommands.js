export default class AmaCommands {
  constructor(aUserId, amaId) {
    this.userId = aUserId
    this.amaId = amaId
  }

  static cmdToText(command, obj) {
    return `/${command} ${JSON.stringify(obj)}`
  }

  amaCreate(aTitle) {
    const obj = {
      title: aTitle
    }

    return AmaCommands.cmdToText('amaCreate', obj)
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

  answerCreate(questionId, text) {
    const obj = {
      ama_id: this.amaId,
      question_id: aQuestionId,
      text: text
    }

    return AmaCommands.cmdToText('answerCreate', obj)
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

  answerDelete(answerId) {
    // TODO
  }

  userUnblock(aUserId) {
    // TODO
  }
}
