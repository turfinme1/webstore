const { ASSERT, ASSERT_USER, UserError } = require("../assert");

describe('ASSERT function', () => {
  it('should not throw an error if the condition is true', () => {
    expect(() => ASSERT(true, 'Error message')).not.toThrow();
  });

  it('should throw an error with the provided message if the condition is false', () => {
    expect(() => ASSERT(false, 'Error message')).toThrow(new Error('Error message'));
  });
});

describe('ASSERT_USER function', () => {
  it('should not throw an error if the condition is true', () => {
    expect(() => ASSERT_USER(true, 'User error message', { id: 1 })).not.toThrow();
  });

  it('should throw a UserError with the provided message and params if the condition is false', () => {
    const params = { id: 1 };
    expect(() => ASSERT_USER(false, 'User error message', params))
      .toThrow(new UserError('User error message', params));
  });

  it('should include the params in the thrown UserError', () => {
    const params = { id: 1 };
    try {
      ASSERT_USER(false, 'User error message', params);
    } catch (e) {
      expect(e).toBeInstanceOf(UserError);
      expect(e.params).toBe(params);
    }
  });
});

describe('UserError class', () => {
  it('should create an instance of UserError with the provided message and params', () => {
    const params = { id: 1 };
    const error = new UserError('User error message', params);

    expect(error).toBeInstanceOf(UserError);
    expect(error.message).toBe('User error message');
    expect(error.params).toBe(params);
  });
});