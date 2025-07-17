const bcrypt = require("bcrypt");
const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");
const { createCanvas } = require('canvas');
const { Readable } = require("nodemailer/lib/xoauth2");
const { ENV }  = require("../serverConfigurations/constants");

class AuthService {
  constructor(messageService, cartService) {
    this.messageService = messageService;
    this.cartService = cartService;
    this.passwordVersion = 2;
  }

  async register(data) {
    await this.verifyCaptcha(data);
    const schema = data.entitySchemaCollection["userAuthSchema"];
    const schemaKeys = Object.keys(schema.properties);
    const dbColumns = schemaKeys.map((key) =>
      key === "password" ? "password_hash" : key
    );

    const values = schemaKeys.map((key) => {
      if (key === "password_version") {
        return this.passwordVersion;
      }
      return data.body[key] === undefined ? null : data.body[key];
    });

    const query = `INSERT INTO ${schema.routeName}(${dbColumns.join(",")}) VALUES(${dbColumns
      .map((column, i) => {
        if (column === "password_hash") {
          return `crypt($${i + 1}, gen_salt('bf', 10))`;
        }
        return `$${i + 1}`;
      })
      .join(",")}) RETURNING *`;
    const createUserResult = await data.dbConnection.query(query, values);
    const user = createUserResult.rows[0];

    const createVerifyTokenResult = await data.dbConnection.query(`
      INSERT INTO email_verifications (user_id) 
      VALUES ($1) RETURNING *`,
      [user.id]
    );
    const verifyToken = createVerifyTokenResult.rows[0].token_hash;
    
    const requestData = { entitySchemaCollection: data.entitySchemaCollection, dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Email Verification", userId: user.id };
    const session = await this.changeSessionType(requestData);
    
    const emailObject = {
      dbConnection: data.dbConnection,
      emailData: {
        templateType: "Email verification",
        recipient_email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        address: `<a href="${data.context.settings.url}:${ENV.FRONTOFFICE_PORT}/auth/verify-mail?token=${verifyToken}">Verify Email</a>`
      }
    }
    await this.messageService.queueEmail(emailObject);

    return session;
  }

  async login(data) {
    await this.verifyCaptcha(data);

    const userResult = await data.dbConnection.query(`
      SELECT * FROM ${data.entitySchemaCollection.userManagementSchema.user_table} WHERE email = $1`,
      [data.body.email]
    );
    ASSERT_USER(userResult.rows.length === 1, "Invalid login", { code: "SERVICE.AUTH.00081.INVALID_LOGIN", long_description: `Invalid login with email ${data.body.email}` });
    ASSERT_USER(userResult.rows[0].is_email_verified, "Email is not verified", { code: "SERVICE.AUTH.00082.INVALID_LOGIN", long_description: `Email ${data.body.email} is not verified` });

    const user = userResult.rows[0];
    
    let isPasswordCorrect = false;
    if(user.password_version == 1) {
      isPasswordCorrect = await bcrypt.compare(data.body.password, user.password_hash);
      if (isPasswordCorrect) {
        await data.dbConnection.query(`
          UPDATE ${data.entitySchemaCollection.userManagementSchema.user_table} 
          SET password_hash = crypt($1, gen_salt('bf', 10)), password_version = $2
          WHERE id = $3`,
          [data.body.password, this.passwordVersion, user.id]
        );
      }
    } else if (user.password_version == 2) {
      const passwordResult = await data.dbConnection.query(`
        SELECT 1 FROM ${data.entitySchemaCollection.userManagementSchema.user_table}
        WHERE id = $1 AND password_hash = crypt($2, password_hash)`,
        [user.id, data.body.password]
      );
      isPasswordCorrect = passwordResult.rows.length === 1;
    } else {
      isPasswordCorrect = false;
    }
    ASSERT_USER(isPasswordCorrect, "Invalid login", { code: "SERVICE.AUTH.00086.INVALID_LOGIN", long_description: `Invalid login with email ${data.body.email}`});

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
    ASSERT_USER(result.rows.length === 1, "Invalid session", { code: "SERVICE.AUTH.00100.INVALID_SESSION", long_description: `Invalid session ${data.session.session_hash}` });

    const newSessionData = {
      entitySchemaCollection: data.entitySchemaCollection,
      dbConnection: data.dbConnection,
      userId: null,
      ipAddress: data.session.ip_address,
      sessionType: "Anonymous"
    };
    const newSession = await this.createSession(newSessionData);

    if(data.session.user_id){ 
      await this.cartService.cloneCartForNewSession(data.session.user_id, newSession.id, data.dbConnection);
    }

    return newSession;
  }

  async verifyMail(data) {
    const token = data.query.token;
    ASSERT_USER(token, "Invalid verification token", { code: "SERVICE.AUTH.00107.INVALID_TOKEN", long_description: `Invalid or expired token ${token}` });

    const userVerificationResult = await data.dbConnection.query(`
      SELECT ev.user_id, ev.expires_at, u.is_email_verified 
      FROM email_verifications ev
      JOIN users u ON u.id = ev.user_id
      WHERE ev.token_hash = $1 AND ev.is_active = TRUE`,
      [token]
    );
    const userVerificationInfo = userVerificationResult.rows[0];

    ASSERT_USER(userVerificationResult.rows.length === 1, "Invalid or expired token", { code: "SERVICE.AUTH.00118.INVALID_TOKEN", long_description: `Invalid or expired token ${token}` });
    ASSERT_USER(new Date() < userVerificationInfo.expires_at, "Verification token has expired", { code: "SERVICE.AUTH.00119.INVALID_TOKEN", long_description: `Invalid or expired token ${token}` });
    ASSERT_USER(userVerificationInfo.is_email_verified === false, "Email is already verified", { code: "SERVICE.AUTH.000120.INVALID_TOKEN", long_description: `Invalid or expired token ${token}` });

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

  async getUserIdBySession(data) {
    return data.session.user_id;
  }

  async refreshSessionExpiry(data) {
    const result = await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.session_table} SET expires_at = NOW() + INTERVAL '40 minutes' WHERE session_hash = $1 RETURNING *`,
      [data.sessionHash]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session", { code: "SERVICE.AUTH.00164.INVALID_SESSION", long_description: `Invalid session ${data.sessionHash}` });

    return result.rows[0];
  }

  async changeSessionType(data) {
    const result = await data.dbConnection.query(`
      UPDATE ${data.entitySchemaCollection.userManagementSchema.session_table} 
      SET session_type_id = (SELECT id FROM session_types WHERE type = $2 LIMIT 1), ${data.entitySchemaCollection.userManagementSchema.user_id} = COALESCE($3, ${data.entitySchemaCollection.userManagementSchema.user_id}) 
      WHERE session_hash = $1 RETURNING *`,
      [data.sessionHash, data.sessionType, data.userId]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session", { code: "SERVICE.AUTH.00176.INVALID_SESSION", long_description: `Invalid session ${data.sessionHash}` });

    return result.rows[0];
  }

  async getStatus(data) {
    const result = await data.dbConnection.query(`
      SELECT u.first_name, u.last_name, u.email, u.has_first_login, st.type as session_type
      FROM ${data.entitySchemaCollection.userManagementSchema.session_table} s
      JOIN session_types st ON s.session_type_id = st.id
      LEFT JOIN ${data.entitySchemaCollection.userManagementSchema.user_table} u ON s.${data.entitySchemaCollection.userManagementSchema.user_id} = u.id
      WHERE s.session_hash = $1`,
      [data.session.session_hash]
    );
    ASSERT(result.rows.length === 1, "Invalid session", { code: "SERVICE.AUTH.00190.INVALID_SESSION", long_description: `Invalid session ${data.session.session_hash}` });

    if(result.rows[0].has_first_login === false){
      await data.dbConnection.query(`
        UPDATE ${data.entitySchemaCollection.userManagementSchema.user_table} u
        SET has_first_login = TRUE
        WHERE u.id = $1`,
        [data.session.user_id]
      );
    }
    
    let userStatus = result.rows[0];
    userStatus.role_permissions = data.session.role_permissions;
    userStatus.user_type = data.entitySchemaCollection.userManagementSchema.user_type;
    return userStatus;
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
      ASSERT_USER(false, "Too many failed attempts. Try again later", { code: "SERVICE.AUTH.00298.RATE_LIMITED", long_description: `Too many failed attempts for ${data.session.session_hash}` });
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
      ASSERT_USER(false, "Invalid captcha answer", { code: "SERVICE.AUTH.00324.INVALID_BODY", long_description: `Invalid captcha answer for ${data.session.session_hash}` });
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
    ASSERT_USER(isPasswordValid, "Old password is incorrect", { code: "SERVICE.AUTH.00345.WRONG_PASSWORD", long_description: `Old password is incorrect` });

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
    ASSERT_USER(doUpdateHaveChanges, "No changes to update", { code: "SERVICE.AUTH.00364.NO_CHANGES", long_description: `No changes to update` });

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
    ASSERT_USER(emailVerificationResult.rows.length === 0, "Please wait a few minutes before requesting another password reset", { code: "SERVICE.AUTH.00395.RATE_LIMITED", long_description: `Please wait a few minutes before requesting another password reset` });

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

    const emailObject = {
      dbConnection: data.dbConnection,
      emailData: {
        templateType: "Forgot password",
        recipient_email: user.email,
        address: `<a href="${data.context.settings.url}:${ENV.FRONTOFFICE_PORT}/reset-password?token=${createResetTokenResult.rows[0].token_hash}">Reset Password</a>`
      }
    }
    await this.messageService.queueEmail(emailObject);

    return { message: "If the email exists, a password reset link will be sent"};
  }

  async resetPassword(data) {
    ASSERT_USER(data.query.token, "Invalid reset token", { code: "SERVICE.AUTH.00424.INVALID_TOKEN", long_description: `Invalid or expired token ${data.query.token}` });

    const userVerificationResult = await data.dbConnection.query(`
      SELECT ev.user_id, ev.expires_at
      FROM email_verifications ev
      WHERE ev.token_hash = $1 AND ev.is_active = TRUE`,
      [data.query.token]
    );
    const userVerificationInfo = userVerificationResult.rows[0];

    ASSERT_USER(userVerificationResult.rows.length === 1, "Invalid or expired token", { code: "SERVICE.AUTH.00434.INVALID_TOKEN", long_description: `Invalid or expired token ${data.query.token}` });
    ASSERT_USER(new Date() < userVerificationInfo.expires_at, "Invalid or expired token", { code: "SERVICE.AUTH.00435.INVALID_TOKEN", long_description: `Invalid or expired token ${data.query.token}` });

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
    ASSERT_USER(req.session.role_permissions.some((rolePermission) => rolePermission.permission === permission && rolePermission.interface === interfaceName), "You do not have permission to perform this action", { code: "SERVICE.AUTH.00455.UNAUTHORIZED", long_description: `You do not have permission to perform this action` });
  }
}

module.exports = AuthService;