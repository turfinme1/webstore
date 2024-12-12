function ASSERT(condition, message, params) {
  if (!condition) {
    throw new ApplicationError(message, params);
  }
}

function ASSERT_USER(condition, message, params) {
  if (!condition) {
    throw new UserError(message, params);
  }
}

function ASSERT_PEER(condition, message, params) {
  if (!condition) {
    throw new ApplicationError(message, params);
  }
}

class UserError extends Error {
  constructor(message, params) {
    super(message);
    this.params = params;
  }
}

class ApplicationError extends Error {
  constructor(message, params) {
    super(message);
    this.params = params;
  }
}

module.exports = { ASSERT, ASSERT_USER, ASSERT_PEER, UserError, ApplicationError };