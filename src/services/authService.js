const bcrypt = require("bcrypt");
const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");
const { createCanvas } = require('canvas');
const { Readable } = require("nodemailer/lib/xoauth2");
const STATUS_CODES = require("../serverConfigurations/constants");

class AuthService {
  constructor(mailService) {
    this.mailService = mailService;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.verifyMail = this.verifyMail.bind(this);
    this.createSession = this.createSession.bind(this);
    this.getSession = this.getSession.bind(this);
    this.refreshSessionExpiry = this.refreshSessionExpiry.bind(this);
    this.changeSessionType = this.changeSessionType.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.generateCaptcha = this.getCaptcha.bind(this);
    this.generateCaptchaImage = this.generateCaptchaImage.bind(this);
    this.verifyCaptcha = this.verifyCaptcha.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.requirePermission = this.requirePermission.bind(this);
  }

  async register(data) {
    await this.verifyCaptcha(data);
    const schema = data.entitySchemaCollection["userAuthSchema"];
    const schemaKeys = Object.keys(schema.properties);
    const dbColumns = schemaKeys.map((key) =>
      key === "password" ? "password_hash" : key
    );

    const hashedPassword = await bcrypt.hash(data.body.password, 10);
    const values = schemaKeys.map((key) => {
      if (key === "password") {
        return hashedPassword;
      }
      return data.body[key] === undefined ? null : data.body[key];
    });

    const query = `INSERT INTO ${schema.routeName}(${dbColumns.join(",")}) VALUES(${dbColumns
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;
    const createUserResult = await data.dbConnection.query(query, values);
    const user = createUserResult.rows[0];

    const createVerifyTokenResult = await data.dbConnection.query(`
      INSERT INTO email_verifications (user_id) 
      VALUES ($1) RETURNING *`,
      [user.id]
    );
    
    const requestData = { entitySchemaCollection: data.entitySchemaCollection, dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Email Verification", userId: user.id };
    const session = await this.changeSessionType(requestData);
    
    await this.mailService.sendVerificationEmail(user.email, createVerifyTokenResult.rows[0].token_hash);

    return session;
  }

  async login(data) {
    await this.verifyCaptcha(data);

    const userResult = await data.dbConnection.query(`
      SELECT * FROM ${data.entitySchemaCollection.userManagementSchema.user_table} WHERE email = $1`,
      [data.body.email]
    );
    ASSERT_USER(userResult.rows.length === 1, "Invalid login", { code: STATUS_CODES.INVALID_LOGIN, long_description: `Invalid login with email ${data.body.email}` });
    ASSERT_USER(userResult.rows[0].is_email_verified, "Email is not verified", { code: STATUS_CODES.INVALID_LOGIN, long_description: `Email ${data.body.email} is not verified` });

    const user = userResult.rows[0];
    const isPasswordCorrect = await bcrypt.compare(data.body.password, user.password_hash);
    ASSERT_USER(isPasswordCorrect, "Invalid login", { code: STATUS_CODES.INVALID_LOGIN, long_description: `Invalid login with email ${data.body.email}`});

    const requestData = { entitySchemaCollection: data.entitySchemaCollection, dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Authenticated", userId: user.id };
    const session = await this.changeSessionType(requestData);

    return session;
  }

  async logout(data) {
    const result = await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.session_table} SET is_active = FALSE 
      WHERE session_hash = $1 RETURNING *`,
      [data.session.session_hash]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session", { code: STATUS_CODES.INVALID_SESSION, long_description: `Invalid session ${data.session.session_hash}` });

    return result.rows[0];
  }

  async verifyMail(data) {
    const token = data.query.token;
    ASSERT_USER(token, "Invalid verification token", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${token}` });

    const userVerificationResult = await data.dbConnection.query(`
      SELECT ev.user_id, ev.expires_at, u.is_email_verified 
      FROM email_verifications ev
      JOIN users u ON u.id = ev.user_id
      WHERE ev.token_hash = $1 AND ev.is_active = TRUE`,
      [token]
    );
    const userVerificationInfo = userVerificationResult.rows[0];

    ASSERT_USER(userVerificationResult.rows.length === 1, "Invalid or expired token", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${token}` });
    ASSERT_USER(new Date() < userVerificationInfo.expires_at, "Verification token has expired", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${token}` });
    ASSERT_USER(userVerificationInfo.is_email_verified === false, "Email is already verified", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${token}` });

    await data.dbConnection.query(`
      UPDATE users
      SET is_email_verified = TRUE
      WHERE id = $1`,
      [userVerificationInfo.user_id]
    );
    await data.dbConnection.query(`
      UPDATE email_verifications
      SET is_active = FALSE
      WHERE token_hash = $1`,
      [token]
    );

    const requestData = { entitySchemaCollection: data.entitySchemaCollection, dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Authenticated", userId: userVerificationInfo.user_id };
    await this.changeSessionType(requestData);

    return { message: "Email successfully verified" };
  }

  async createSession(data) {
    const session = await await data.dbConnection.query(`
      INSERT INTO ${data.entitySchemaCollection.userManagementSchema.session_table} (${data.entitySchemaCollection.userManagementSchema.user_id},ip_address,session_type_id) VALUES ($1, $2, (SELECT id FROM session_types WHERE type = $3 LIMIT 1)) RETURNING *`,
      [data.userId, data.ipAddress, data.sessionType]
    );

    return session.rows[0];
  }

  async getSession(data) {
    const result = await data.dbConnection.query(`
      SELECT * FROM ${data.entitySchemaCollection.userManagementSchema.session_table} WHERE session_hash = $1 AND is_active = TRUE`,
      [data.sessionHash]
    );

    return result.rows[0];
  }

  async refreshSessionExpiry(data) {
    const result = await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.session_table} SET expires_at = NOW() + INTERVAL '10 minutes' WHERE session_hash = $1 RETURNING *`,
      [data.sessionHash]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session", { code: STATUS_CODES.INVALID_SESSION, long_description: `Invalid session ${data.sessionHash}` });

    return result.rows[0];
  }

  async changeSessionType(data) {
    const result = await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.session_table} 
      SET session_type_id = (SELECT id FROM session_types WHERE type = $2 LIMIT 1), ${data.entitySchemaCollection.userManagementSchema.user_id} = COALESCE($3, ${data.entitySchemaCollection.userManagementSchema.user_id}) 
      WHERE session_hash = $1 RETURNING *`,
      [data.sessionHash, data.sessionType, data.userId]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session", { code: STATUS_CODES.INVALID_SESSION, long_description: `Invalid session ${data.sessionHash}` });

    return result.rows[0];
  }

  async getStatus(data) {
    const result = await data.dbConnection.query(`
      SELECT u.first_name, u.last_name, u.email, u.iso_country_code_id, u.phone, u.gender_id, u.country_id, u.address, u.has_first_login, st.type as session_type
      FROM ${data.entitySchemaCollection.userManagementSchema.session_table} s
      JOIN session_types st ON s.session_type_id = st.id
      LEFT JOIN ${data.entitySchemaCollection.userManagementSchema.user_table} u ON s.${data.entitySchemaCollection.userManagementSchema.user_id} = u.id
      WHERE s.session_hash = $1`,
      [data.session.session_hash]
    );
    ASSERT(result.rows.length === 1, "Invalid session", { code: STATUS_CODES.INVALID_SESSION, long_description: `Invalid session ${data.session.session_hash}` });

    if(result.rows[0].has_first_login === false){
      await data.dbConnection.query(`
        UPDATE ${data.entitySchemaCollection.userManagementSchema.user_table} u
        SET has_first_login = TRUE
        WHERE u.id = $1`,
        [data.session.user_id]
      );
    }

    return result.rows[0];
  }

  async getCaptcha(data) {
    const number1 = Math.floor(Math.random() * 10);
    const number2 = Math.floor(Math.random() * 10);
    const operator = Math.random() > 0.5 ? "+" : "-";
    const equation = `${number1}${operator}${number2}`;
    const captchaAnswer = operator === "+" ? number1 + number2 : number1 - number2;
    
    await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.captcha_table} 
      SET is_active = FALSE WHERE ${data.entitySchemaCollection.userManagementSchema.session_id} = (SELECT id FROM ${data.entitySchemaCollection.userManagementSchema.session_table}
      WHERE session_hash = $1 LIMIT 1) RETURNING *`,
      [data.session.session_hash]
    );
    const result = await data.dbConnection.query(`
      INSERT INTO ${data.entitySchemaCollection.userManagementSchema.captcha_table} (${data.entitySchemaCollection.userManagementSchema.session_id}, equation, answer) 
      VALUES ((SELECT id FROM ${data.entitySchemaCollection.userManagementSchema.session_table} 
      WHERE session_hash = $1 LIMIT 1), $2, $3) RETURNING *`,
      [data.session.session_hash, equation, captchaAnswer]
    );
    
    const captchaImage = this.generateCaptchaImage(equation);
    return captchaImage;
  }

  generateCaptchaImage(captchaText) {
    const width = 120;
    const height = 40;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, 0, width, height);

    // Add noise lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "#b3b3b3";
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Random dots
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }

    // Draw the CAPTCHA text with slight rotation
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#333";
    for (let i = 0; i < captchaText.length; i++) {
      const x = 10 + i * 25;
      const y = Math.random() * 10 + 30;
      const angle = Math.random() * 0.3 - 0.15; // slight random rotation
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(captchaText[i], 0, 0);
      ctx.restore();
    }

    return Readable.from(canvas.toBuffer('image/png'));
  }

  async verifyCaptcha(data) {
    const appSettingsResult = await data.dbConnection.query(`
      SELECT request_limit, request_window, request_block_duration
      FROM app_settings LIMIT 1
    `);
    const appSettings = appSettingsResult.rows[0];
    const requestLimit = parseInt(appSettings.request_limit, 10);

    const failedAttemptsResult = await data.dbConnection.query(`
      SELECT COUNT(*) AS failed_attempts_count
      FROM ${data.entitySchemaCollection.userManagementSchema.failed_attempts_table}
      WHERE ${data.entitySchemaCollection.userManagementSchema.session_id} = (SELECT id FROM ${data.entitySchemaCollection.userManagementSchema.session_table} WHERE session_hash = $1 LIMIT 1)
      AND attempt_type_id = (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1)
      AND created_at >= NOW() - (SELECT request_window FROM app_settings LIMIT 1)`,
      [data.session.session_hash]
    );

    const failedAttemptsCount = parseInt(failedAttemptsResult.rows[0].failed_attempts_count, 10);
    if (failedAttemptsCount >= requestLimit) {
      await data.dbConnection.query(`
        UPDATE ${data.entitySchemaCollection.userManagementSchema.session_table}
        SET rate_limited_until = NOW() + (SELECT request_block_duration FROM app_settings LIMIT 1)
        WHERE session_hash = $1`,
        [data.session.session_hash]
      );
      data.dbConnection.query(`COMMIT`);
      ASSERT_USER(false, "Too many failed attempts. Try again later", { code: STATUS_CODES.RATE_LIMITED, long_description: `Too many failed attempts for ${data.session.session_hash}` });
    }

    const captchaResult = await data.dbConnection.query(`
      SELECT * FROM ${data.entitySchemaCollection.userManagementSchema.captcha_table}
      WHERE ${data.entitySchemaCollection.userManagementSchema.session_id} = (SELECT id FROM ${data.entitySchemaCollection.userManagementSchema.session_table} WHERE session_hash = $1 LIMIT 1) 
      AND is_active = TRUE AND expires_at > NOW()`,
      [data.session.session_hash]
    );

    const captcha = captchaResult.rows[0];
    await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.captcha_table} 
      SET is_active = FALSE WHERE id = $1`,
      [captcha.id]
    );

    if(captcha.answer !== data.body.captcha_answer) {
      await data.dbConnection.query(`
        INSERT INTO ${data.entitySchemaCollection.userManagementSchema.failed_attempts_table} (${data.entitySchemaCollection.userManagementSchema.session_id}, attempt_type_id)
        VALUES ((SELECT id FROM ${data.entitySchemaCollection.userManagementSchema.session_table} WHERE session_hash = $1 LIMIT 1),
        (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1))`,
        [data.session.session_hash]
      );

      data.dbConnection.query(`COMMIT`);
      ASSERT_USER(false, "Invalid captcha answer", { code: STATUS_CODES.INVALID_BODY, long_description: `Invalid captcha answer for ${data.session.session_hash}` });
    }
  }

  async updateProfile(data) {
    const schema = data.entitySchemaCollection["userAuthSchema"];
    const schemaKeys = Object.keys(schema.properties);
    const dbColumns = [];
    const values = [];

    let hashedPassword;
    if(data.body.password){
      hashedPassword = await bcrypt.hash(data.body.password, 10);
    }

    const userToUpdateResult = await data.dbConnection.query(`
      SELECT * FROM ${schema.routeName} WHERE id = $1`,
      [data.session.user_id]
    );

    const isPasswordValid = await bcrypt.compare(data.body.old_password, userToUpdateResult.rows[0].password_hash);
    ASSERT_USER(isPasswordValid, "Old password is incorrect", { code: STATUS_CODES.WRONG_PASSWORD, long_description: `Old password is incorrect` });

    schemaKeys.forEach((key) => {
      if (key === "password" && data.body.password) {
        dbColumns.push("password_hash");
        values.push(hashedPassword);
      } else if (key !== "password" && data.body[key] !== undefined) {
        dbColumns.push(key);
        values.push(data.body[key]);
      }
    });

    const doUpdateHaveChanges = dbColumns.some((key, i) => {
      if(key === "password_hash"){
        return userToUpdateResult.rows[0][key] != hashedPassword;
      }

      return userToUpdateResult.rows[0][key] != values[i];
    });
    ASSERT_USER(doUpdateHaveChanges, "No changes to update", { code: STATUS_CODES.NO_CHANGES, long_description: `No changes to update` });

    const query = `
      UPDATE ${schema.routeName}
      SET ${dbColumns.map((col, i) => `${col} = $${i + 1}`).join(", ")}
      WHERE id = $${dbColumns.length + 1}
      RETURNING *`;
    const updateUserResult = await data.dbConnection.query(query, [...values, data.session.user_id]);
    const user = updateUserResult.rows[0];

    return user;
  }

  async forgotPassword(data) {
    const userResult = await data.dbConnection.query(`
      SELECT * FROM users WHERE email = $1`,
      [data.body.email]
    );
    const user = userResult.rows[0];
    
    if(!user){
      return { message: "If the email exists, a password reset link will be sent"};
    }

    const emailVerificationResult = await data.dbConnection.query(`
      SELECT * FROM email_verifications 
      WHERE user_id = $1 
        AND created_at > NOW() - INTERVAL '5 minutes'
        AND is_active = TRUE`,
      [user.id]
    );
    ASSERT_USER(emailVerificationResult.rows.length === 0, "Please wait a few minutes before requesting another password reset", { code: STATUS_CODES.RATE_LIMITED, long_description: `Please wait a few minutes before requesting another password reset` });

    await data.dbConnection.query(`
      UPDATE email_verifications
      SET is_active = FALSE
      WHERE user_id = $1 AND is_active = TRUE`,
      [user.id]
    );

    const createResetTokenResult = await data.dbConnection.query(`
      INSERT INTO email_verifications (user_id) 
      VALUES ($1) RETURNING *`,
      [user.id]
    );

    await this.mailService.sendResetPasswordEmail(user.email, createResetTokenResult.rows[0].token_hash);

    return { message: "If the email exists, a password reset link will be sent"};
  }

  async resetPassword(data) {
    ASSERT_USER(data.query.token, "Invalid reset token", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${data.query.token}` });

    const userVerificationResult = await data.dbConnection.query(`
      SELECT ev.user_id, ev.expires_at
      FROM email_verifications ev
      WHERE ev.token_hash = $1 AND ev.is_active = TRUE`,
      [data.query.token]
    );
    const userVerificationInfo = userVerificationResult.rows[0];

    ASSERT_USER(userVerificationResult.rows.length === 1, "Invalid or expired token", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${data.query.token}` });
    ASSERT_USER(new Date() < userVerificationInfo.expires_at, "Invalid or expired token", { code: STATUS_CODES.INVALID_TOKEN, long_description: `Invalid or expired token ${data.query.token}` });

    const hashedPassword = await bcrypt.hash(data.body.password, 10);
    await data.dbConnection.query(`
      UPDATE users
      SET password_hash = $1
      WHERE id = $2`,
      [hashedPassword, userVerificationInfo.user_id]
    );
    await data.dbConnection.query(`
      UPDATE email_verifications
      SET is_active = FALSE
      WHERE token_hash = $1`,
      [data.query.token]
    );

    return { message: "Password successfully reset" };
  }
  
  requirePermission(req, permission, interfaceName) {
    ASSERT_USER(req.session.rolesPermissions.some((rolePermission) => rolePermission.permission === permission && rolePermission.interface === interfaceName), "You do not have permission to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: `You do not have permission to perform this action` });
  }
}

module.exports = AuthService;