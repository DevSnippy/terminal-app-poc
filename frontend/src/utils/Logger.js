// src/utils/Logger.js

class Logger {
  constructor() {
    // Define log levels
    this.levels = {
      LOG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };

    // Set the current log level (adjust as needed)
    this.currentLevel = this.levels.LOG;
  }

  /**
   * Formats the log message with a timestamp and level.
   * @param {string} level - The level of the log (LOG, INFO, WARN, ERROR).
   * @param {string} message - The message to log.
   * @returns {Array} - The formatted log message and style.
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    let color;
    switch (level) {
      case "INFO":
        color = "color: blue;";
        break;
      case "WARN":
        color = "color: orange;";
        break;
      case "ERROR":
        color = "color: red;";
        break;
      default:
        color = "color: white;";
    }
    return [`%c[${timestamp}] [${level}] ${message}`, color];
  }

  /**
   * Determines if the message should be logged based on the current level.
   * @param {string} level - The level of the log.
   * @returns {boolean} - True if the message should be logged, false otherwise.
   */
  shouldLog(level) {
    return this.levels[level] >= this.currentLevel;
  }

  /**
   * Logs a general message.
   * @param {string} message - The message to log.
   */
  log(message) {
    if (this.shouldLog("LOG")) {
      console.log(...this.formatMessage("LOG", message));
    }
  }

  /**
   * Logs an informational message.
   * @param {string} message - The message to log.
   */
  info(message) {
    if (this.shouldLog("INFO")) {
      console.info(...this.formatMessage("INFO", message));
    }
  }

  /**
   * Logs a warning message.
   * @param {string} message - The message to log.
   */
  warn(message) {
    if (this.shouldLog("WARN")) {
      console.warn(...this.formatMessage("WARN", message));
    }
  }

  /**
   * Logs an error message.
   * @param {string} message - The message to log.
   */
  error(message) {
    if (this.shouldLog("ERROR")) {
      console.error(...this.formatMessage("ERROR", message));
    }
  }

  /**
   * Sets the current log level.
   * @param {string} level - The desired log level (LOG, INFO, WARN, ERROR).
   */
  setLogLevel(level) {
    if (level in this.levels) {
      this.currentLevel = this.levels[level];
      this.log(`Log level set to ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }
}

// Create a singleton instance of Logger
const logger = new Logger();

// Set log level based on environment
if (process.env.NODE_ENV === "production") {
  logger.setLogLevel("WARN"); // In production, log only warnings and errors
} else {
  logger.setLogLevel("LOG"); // In development, log everything
}

// Freeze the instance to prevent modifications
Object.freeze(logger);

export default logger;
