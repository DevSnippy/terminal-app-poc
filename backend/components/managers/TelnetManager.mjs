// components/managers/TelnetManager.mjs

import { Telnet } from "telnet-client";
import Logger from "../utils/Logger.mjs";
import ConfigManager from "../utils/ConfigManager.mjs";

class TelnetManager {
  constructor() {
    this.telnetConnections = new Map(); // Maps WebSocket to Telnet instances
    this.endpoint = ConfigManager.getTelnetEndpoint();
  }

  async connect(ws, host, port) {
    if (!host || !port) {
      return { success: false, message: "Invalid host or port" };
    }

    if (this.telnetConnections.has(ws)) {
      this.closeConnection(ws);
    }

    const connection = new Telnet();
    const params = {
      host,
      port,
      negotiationMandatory: false,
      timeout: 10000,
      shellPrompt: /[$%#>]$/,
      irs: "\r\n",
      ors: "\n",
    };

    try {
      await connection.connect(params);
      Logger.info(`Connected to Telnet server at ${host}:${port}`);
      this.telnetConnections.set(ws, connection);

      connection.on("data", (data) => {
        const dataStr = data.toString();
        Logger.info(`Data received from Telnet: ${dataStr}`);
        ws.send(JSON.stringify({ type: "telnetData", data: dataStr }));
        this.sendDataToBackend(dataStr);
      });

      connection.on("close", () => {
        Logger.info("Telnet connection closed");
        ws.send(
          JSON.stringify({
            type: "telnetClosed",
            message: "Telnet connection closed",
          }),
        );
        this.telnetConnections.delete(ws);
      });

      connection.on("error", (error) => {
        Logger.error(`Telnet error: ${error.message}`);
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Telnet error: ${error.message}`,
          }),
        );
      });

      return {
        success: true,
        message: `Connected to Telnet server at ${host}:${port}`,
      };
    } catch (error) {
      Logger.error(`Failed to connect to Telnet server: ${error.message}`);
      return {
        success: false,
        message: `Failed to connect to Telnet server: ${error.message}`,
      };
    }
  }

  async sendCommand(ws, command) {
    const connection = this.telnetConnections.get(ws);
    if (connection && command) {
      try {
        await connection.send(command);
        Logger.info(`Command sent to Telnet: ${command}`);
        return { success: true, message: `Command sent: ${command}` };
      } catch (error) {
        Logger.error(`Failed to send command to Telnet: ${error.message}`);
        return {
          success: false,
          message: `Failed to send command: ${error.message}`,
        };
      }
    } else {
      const errorMsg = "No active Telnet connection or no command provided";
      Logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  closeConnection(ws) {
    const connection = this.telnetConnections.get(ws);
    if (connection) {
      connection.end();
      this.telnetConnections.delete(ws);
      Logger.info("Telnet connection closed by client");
    }
  }

  /**
   * Sends Telnet data to the backend's /telnet-data HTTP endpoint.
   * @param {string} data - The data received from Telnet.
   */
  async sendDataToBackend(data) {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }

      Logger.info(`Data successfully sent to ${this.endpoint}`);
    } catch (error) {
      Logger.error(`Failed to send data to backend: ${error.message}`);
    }
  }

  closeAllConnections() {
    for (const ws of this.telnetConnections.keys()) {
      this.closeConnection(ws);
    }
  }
}

export default TelnetManager;
