const bcrypt = require("bcrypt");
const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");
const { createCanvas } = require('canvas');
const { Readable } = require("nodemailer/lib/xoauth2");

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
    this.requireAuthorization = this.requireAuthorization.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  async register(data) {
    await this.verifyCaptcha(data);
    const schema = data.entitySchemaCollection["users"];
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

    const query = `INSERT INTO ${schema.name}(${dbColumns.join(",")}) VALUES(${dbColumns
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;
    const createUserResult = await data.dbConnection.query(query, values);
    const user = createUserResult.rows[0];

    const createVerifyTokenResult = await data.dbConnection.query(`
      INSERT INTO email_verifications (user_id) 
      VALUES ($1) RETURNING *`,
      [user.id]
    );
    
    const requestData = { dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Email Verification", userId: user.id };
    const session = await this.changeSessionType(requestData);
    
    await this.mailService.sendVerificationEmail(user.email, createVerifyTokenResult.rows[0].token_hash);

    return session;
  }

  async login(data) {
    await this.verifyCaptcha(data);

    const userResult = await data.dbConnection.query(`
      SELECT * FROM users WHERE email = $1`,
      [data.body.email]
    );
    ASSERT_USER(userResult.rows.length === 1, "Invalid login");
    ASSERT_USER(userResult.rows[0].is_email_verified, "Email is not verified");

    const user = userResult.rows[0];
    const isPasswordCorrect = await bcrypt.compare(data.body.password, user.password_hash);
    ASSERT_USER(isPasswordCorrect, "Invalid login");

    const requestData = { dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Authenticated", userId: user.id };
    const session = await this.changeSessionType(requestData);

    return session;
  }

  async logout(data) {
    const result = await data.dbConnection.query(`
      UPDATE sessions SET is_active = FALSE 
      WHERE session_hash = $1 RETURNING *`,
      [data.session.session_hash]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session");

    return result.rows[0];
  }

  async verifyMail(data) {
    const token = data.query.token;
    ASSERT_USER(token, "Invalid verification token");

    const userVerificationResult = await data.dbConnection.query(`
      SELECT ev.user_id, ev.expires_at, u.is_email_verified 
      FROM email_verifications ev
      JOIN users u ON u.id = ev.user_id
      WHERE ev.token_hash = $1 AND ev.is_active = TRUE`,
      [token]
    );
    const userVerificationInfo = userVerificationResult.rows[0];

    ASSERT_USER(userVerificationResult.rows.length === 1, "Invalid or expired token");
    ASSERT_USER(new Date() < userVerificationInfo.expires_at, "Verification token has expired");
    ASSERT_USER(userVerificationInfo.is_email_verified === false, "Email is already verified");

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

    const requestData = { dbConnection: data.dbConnection, sessionHash: data.session.session_hash, sessionType: "Authenticated", userId: userVerificationInfo.user_id };
    await this.changeSessionType(requestData);

    return { message: "Email successfully verified" };
  }

  async createSession(data) {
    const session = await await data.dbConnection.query(`
      INSERT INTO sessions (user_id,ip_address,session_type_id) VALUES ($1, $2, (SELECT id FROM session_types WHERE type = $3 LIMIT 1)) RETURNING *`,
      [data.userId, data.ipAddress, data.sessionType]
    );

    return session.rows[0];
  }

  async getSession(data) {
    const result = await data.dbConnection.query(`
      SELECT * FROM sessions WHERE session_hash = $1 AND is_active = TRUE`,
      [data.sessionHash]
    );

    return result.rows[0];
  }

  async refreshSessionExpiry(data) {
    const result = await data.dbConnection.query(`
      UPDATE sessions SET expires_at = NOW() + INTERVAL '10 minutes' WHERE session_hash = $1 RETURNING *`,
      [data.sessionHash]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session");

    return result.rows[0];
  }

  async changeSessionType(data) {
    const result = await data.dbConnection.query(`
      UPDATE sessions 
      SET session_type_id = (SELECT id FROM session_types WHERE type = $2 LIMIT 1), user_id = COALESCE($3, user_id) 
      WHERE session_hash = $1 RETURNING *`,
      [data.sessionHash, data.sessionType, data.userId]
    );
    ASSERT_USER(result.rows.length === 1, "Invalid session");

    return result.rows[0];
  }

  async getStatus(data) {
    const result = await data.dbConnection.query(`
      SELECT u.name, u.email, u.iso_country_code_id, u.phone, u.gender_id, u.address, st.type as session_type
      FROM sessions s
      JOIN session_types st ON s.session_type_id = st.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.session_hash = $1`,
      [data.session.session_hash]
    );
    ASSERT(result.rows.length === 1, "Invalid session");

    return result.rows[0];
  }

  async getCaptcha(data) {
    const number1 = Math.floor(Math.random() * 10);
    const number2 = Math.floor(Math.random() * 10);
    const operator = Math.random() > 0.5 ? "+" : "-";
    const equation = `${number1}${operator}${number2}`;
    const captchaAnswer = operator === "+" ? number1 + number2 : number1 - number2;
    
    await data.dbConnection.query(`
      UPDATE captchas SET is_active = FALSE WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1) RETURNING *`,
      [data.session.session_hash]
    );
    await data.dbConnection.query(`
      INSERT INTO captchas (session_id, equation, answer) 
      VALUES ((SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1), $2, $3) RETURNING *`,
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
    const failedAttemptsResult = await data.dbConnection.query(`
      SELECT COUNT(*) AS failed_attempts_count
      FROM failed_attempts
      WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1)
      AND attempt_type_id = (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1)
      AND created_at >= NOW() - INTERVAL '1 hour'`,
      [data.session.session_hash]
    );
    const failedAttemptsCount = parseInt(failedAttemptsResult.rows[0].failed_attempts_count, 10);
    const maxFailedAttempts = 5; 
    ASSERT_USER(failedAttemptsCount < maxFailedAttempts, "Too many failed attempts try again later");

    const captchaResult = await data.dbConnection.query(`
      SELECT * FROM captchas
      WHERE session_id = (SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1) 
      AND is_active = TRUE AND expires_at > NOW()`,
      [data.session.session_hash]
    );
    // ASSERT(captchaResult.rows.length === 1, "Invalid captcha answer");

    const captcha = captchaResult.rows[0];
    await data.dbConnection.query(`
      UPDATE captchas SET is_active = FALSE WHERE id = $1`,
      [captcha.id]
    );

    if(captcha.answer !== data.body.captcha_answer) {
      await data.dbConnection.query(
        `
        INSERT INTO failed_attempts (session_id, attempt_type_id)
        VALUES ((SELECT id FROM sessions WHERE session_hash = $1 LIMIT 1),
        (SELECT id FROM attempt_types WHERE type = 'Captcha' LIMIT 1))`,
        [data.session.session_hash]
      );

      data.dbConnection.query(`COMMIT`);
      ASSERT_USER(false, "Invalid captcha answer");
    }

    // return captchaResult.rows[0];
  }

  async requireAuthorization(session) {
    ASSERT_USER(session?.user_id, "You must be logged in to perform this action");
  }

  async updateProfile(data) {
    const schema = data.entitySchemaCollection["users"];
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

    const query = `UPDATE ${schema.name} SET ${dbColumns.map((key, i) => `${key} = $${i + 1}`).join(",")} WHERE id = $${dbColumns.length + 1} RETURNING *`;
    const updateUserResult = await data.dbConnection.query(query, [...values, data.session.user_id]);
    const user = updateUserResult.rows[0];

    return user;
  }
}

module.exports = AuthService;