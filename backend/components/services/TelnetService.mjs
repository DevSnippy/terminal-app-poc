// src/services/telnetService.mjs

import telnet from "telnet-client"; // Ensure you have installed this package
import Logger from "../utils/Logger.mjs"; // Adjust the path as necessary
import { v4 as uuidv4 } from "uuid"; // For generating unique keys

class TelnetService {
  constructor() {
    if (!TelnetService.instance) {
      this.connections = {}; // To store active Telnet connections
      TelnetService.instance = this;
    }
    return TelnetService.instance;
  }

  /**
   * Establishes a Telnet connection.
   * @param {string} host - Telnet server host.
   * @param {number} port - Telnet server port.
   * @param {string} key - Unique key to identify the connection.
   * @returns {Promise}
   */
  connectTelnet(host, port, key) {
    return new Promise((resolve, reject) => {
      const connection = new telnet();

      const params = {
        host: host,
        port: port,
        negotiationMandatory: false,
        timeout: 1500,
      };

      connection
        .connect(params)
        .then(() => {
          Logger.info(`Telnet connected to ${host}:${port} with key ${key}`);
          this.connections[key] = connection;
          resolve(connection);
        })
        .catch((error) => {
          Logger.error(
            `Failed to connect Telnet to ${host}:${port} with key ${key}:`,
            error,
          );
          reject(error);
        });
    });
  }

  /**
   * Sends a command over an existing Telnet connection.
   * @param {string} key - Unique key identifying the connection.
   * @param {string} command - Command to send.
   * @returns {Promise<string>}
   */
  sendCommand(key, command) {
    return new Promise((resolve, reject) => {
      const connection = this.connections[key];
      if (!connection) {
        reject(new Error(`No active Telnet connection found for key: ${key}`));
        return;
      }

      connection
        .send(command, { shellPrompt: "/ # ", timeout: 1500 })
        .then((res) => {
          Logger.info(`Command sent over Telnet with key ${key}: ${command}`);
          resolve(res);
        })
        .catch((error) => {
          Logger.error(
            `Failed to send command over Telnet with key ${key}:`,
            error,
          );
          reject(error);
        });
    });
  }

  /**
   * Stops an existing Telnet connection.
   * @param {string} key - Unique key identifying the connection.
   */
  stopTelnet(key) {
    const connection = this.connections[key];
    if (connection) {
      connection.end();
      Logger.info(`Telnet connection with key ${key} has been stopped.`);
      delete this.connections[key];
    } else {
      Logger.warn(
        `Attempted to stop non-existent Telnet connection with key ${key}.`,
      );
    }
  }
}

// Create a singleton instance of TelnetService
const instance = new TelnetService();
Object.freeze(instance);

export default instance;
