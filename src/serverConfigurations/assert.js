function ASSERT(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ASSERT_USER(condition, message, params) {
  if (!condition) {
    throw new Error(message);
  }
}