function ASSERT(condition, message) {
  if (!condition) {
    throw new ApplicationError(message);
  }
}

function ASSERT_USER(condition, message, params) {
  if (!condition) {
    throw new UserError(message, params);
  }
}

class UserError extends Error {
  constructor(message, params) {
    super(message);
    this.params = params;
  }
}

class ApplicationError extends Error {
  constructor(message) {
    super(message);
  }
}

module.exports = { ASSERT, ASSERT_USER, UserError };