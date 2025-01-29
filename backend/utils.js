// utils.js
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export class Logger {
  static info(message, ...optionalParams) {
    console.log(
      `[INFO] ${new Date().toISOString()} - ${message}`,
      ...optionalParams,
    );
  }

  static warn(message, ...optionalParams) {
    console.warn(
      `[WARN] ${new Date().toISOString()} - ${message}`,
      ...optionalParams,
    );
  }

  static error(message, ...optionalParams) {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      ...optionalParams,
    );
  }
}

export class ErrorHandler {
  static handleError(res, error, customMessage = "An error occurred") {
    Logger.error(`${customMessage}: ${error.message}`);
    res.status(500).json({ type: "error", message: customMessage });
  }

  static handleWebSocketError(ws, error, customMessage = "An error occurred") {
    Logger.error(`${customMessage}: ${error.message}`);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "error", message: customMessage }));
    }
  }
}

export class ConfigManager {
  static get(key) {
    return process.env[key];
  }

  static getPort() {
    return this.get("PORT") || 3005;
  }

  static getAllowedOrigins() {
    const origins = this.get("ALLOWED_ORIGINS");
    return origins ? origins.split(",") : ["http://localhost:3000"];
  }

  static getScriptsFilePath() {
    return path.join(process.cwd(), "scripts.json");
  }

  static getDatabaseFilePath() {
    return path.join(process.cwd(), "database.json");
  }
}
