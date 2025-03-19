const { UserError, PeerError, ASSERT } = require("./assert");
const { ENV } = require("./constants");

class Logger {
  constructor(req) {
    this.req = req;
    this.logToDatabase = this.logToDatabase.bind(this);
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
    this.createIssue = this.createIssue.bind(this);
  }

  async logToDatabase(logObject) {
    try {
      await this.req.dbConnection.query(`
        INSERT INTO logs (admin_user_id, user_id, status_code, short_description, long_description, debug_info, log_level, audit_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          this.req?.session?.admin_user_id || null,
          this.req?.session?.user_id || null,
          logObject?.code || "INTERNAL_SERVER_ERROR",
          logObject?.short_description,
          logObject?.long_description || null,
          logObject?.debug_info || null,
          logObject?.log_level || "ERROR",
          logObject?.audit_type || "ASSERT"
        ]
      );
      await this.req.dbConnection.query("COMMIT");
    } catch (error) {
      console.error("Error saving log to database:", error);
    }
  }

  async info(infoObject) {
    const logObject = {
      code: infoObject?.code,
      short_description: infoObject?.short_description,
      long_description: infoObject?.long_description,
      log_level: "INFO",
      audit_type: "INFO"
    };
    await this.logToDatabase(logObject);
  }

  async error(errorObject) {
    let audit_type;

    if (errorObject?.params?.temporary) {
      audit_type = "TEMPORARY";
    } else if (errorObject instanceof UserError) {
      audit_type = "ASSERT_USER";
    } else if (errorObject instanceof PeerError) {
      audit_type = "TEMPORARY";
    } else {
      audit_type = "ASSERT";
    }

    const logObject = {
      code: errorObject?.params?.code,
      short_description: errorObject?.message,
      long_description: errorObject?.params?.long_description,
      debug_info: errorObject?.stack,
      log_level: "ERROR",
      audit_type
    };
    await this.logToDatabase(logObject);
  }

  async createIssue(errorObject) {
    try {
      ASSERT(errorObject, "Error object is required", { code: "LOGGER.CRT_ISS.001", long_description: "Error object is required" });
      ASSERT(errorObject.stack, "Error object must have a stack trace", { code: "LOGGER.CRT_ISS.002", long_description: "Error object must have a stack trace" });
      
      let fileName = '';
      let lineNumber = '';
      let errorLine = '';

      const stackLines = errorObject.stack.split('\n');
      if (stackLines.length >= 2) {
        if (stackLines[1] && stackLines[1].toLowerCase().includes('assert') && stackLines.length >= 3) {
          errorLine = stackLines[2];
        } else {
          errorLine = stackLines[1];
        }
      }

      const openParen = errorLine.indexOf('(');
      const closeParen = errorLine.indexOf(')');
      if (openParen !== -1 && closeParen !== -1) {
        const fileInfo = errorLine.substring(openParen + 1, closeParen);
        const parts = fileInfo.split(':');
        if (parts.length >= 3) {
          lineNumber = parts[1];
          fileName = parts[0].split('/').pop();
        }
      } else {
        let parts = errorLine.trim().split(' ');
        if (parts.length >= 2) {
          parts = parts[1].split(':');
          lineNumber = parts[1];
          fileName = parts[0].split('/').pop();
        }
      }
      
      await fetch(ENV.ISSUES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: ENV.BRANCH,
          repoOwner: ENV.REPO_OWNER,
          repoName: ENV.REPO_NAME,
          error: {
            message: errorObject.message,
            stackTrace: errorObject.stack,
            lineNumber: lineNumber,
            fileName: fileName,
          }
        })
      });
    } catch (error) {
      await this.error(error);
    }
  }
}

module.exports = Logger;
