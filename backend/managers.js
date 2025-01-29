// managers.js
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import net from "net";
import { TelnetInput, TelnetOutput } from "telnet-stream";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import { Logger, ConfigManager } from "./utils.js";

// ScriptsManager: Handles CRUD operations for scripts
export class ScriptsManager {
  constructor() {
    this.scriptsFile = ConfigManager.getScriptsFilePath();
    this.scripts = [];
    this.loadScripts();
  }

  async loadScripts() {
    try {
      const data = await fs.readFile(this.scriptsFile, "utf-8");
      this.scripts = JSON.parse(data);
      Logger.info("Scripts loaded successfully.");
    } catch (error) {
      if (error.code === "ENOENT") {
        this.scripts = [];
        await this.saveScripts();
        Logger.warn(
          "scripts.json not found. Initialized with an empty scripts list.",
        );
      } else {
        Logger.error(`Error loading scripts: ${error.message}`);
      }
    }
  }

  async saveScripts() {
    try {
      await fs.writeFile(
        this.scriptsFile,
        JSON.stringify(this.scripts, null, 2),
      );
      Logger.info("Scripts saved successfully.");
    } catch (error) {
      Logger.error(`Error saving scripts: ${error.message}`);
    }
  }

  getAllScripts() {
    return this.scripts;
  }

  getScriptById(id) {
    return this.scripts.find((script) => script.id === id);
  }

  async addScript(name, scriptText) {
    const newScript = { id: uuidv4(), name, scriptText };
    this.scripts.push(newScript);
    await this.saveScripts();
    return newScript;
  }

  async updateScript(id, name, scriptText) {
    const index = this.scripts.findIndex((script) => script.id === id);
    if (index === -1) throw new Error("Script not found");
    this.scripts[index] = { id, name, scriptText };
    await this.saveScripts();
    return this.scripts[index];
  }

  async deleteScript(id) {
    const index = this.scripts.findIndex((script) => script.id === id);
    if (index === -1) throw new Error("Script not found");
    const deleted = this.scripts.splice(index, 1);
    await this.saveScripts();
    return deleted[0];
  }
}

// DatabaseManager: Handles CRUD operations for the database
export class DatabaseManager {
  constructor() {
    this.databaseFile = ConfigManager.getDatabaseFilePath();
    this.data = [];
    this.loadDatabase();
  }

  async loadDatabase() {
    try {
      const fileExists = await fs
        .access(this.databaseFile)
        .then(() => true)
        .catch(() => false);
      if (fileExists) {
        const data = await fs.readFile(this.databaseFile, "utf-8");
        this.data = JSON.parse(data);
        Logger.info("Database loaded successfully.");
      } else {
        this.data = [];
        await this.saveDatabase();
        Logger.warn(
          "database.json not found. Initialized with an empty database.",
        );
      }
    } catch (error) {
      Logger.error(`Error loading database: ${error.message}`);
      this.data = [];
    }
  }

  async saveDatabase() {
    try {
      await fs.writeFile(this.databaseFile, JSON.stringify(this.data, null, 2));
      Logger.info("Database saved successfully.");
    } catch (error) {
      Logger.error(`Error saving database: ${error.message}`);
    }
  }

  getAllEntries() {
    return this.data;
  }

  getEntryById(id) {
    return this.data.find((entry) => entry.id === id);
  }

  async addEntry(entry) {
    const newEntry = {
      id: uuidv4(),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.data.push(newEntry);
    await this.saveDatabase();
    return newEntry;
  }

  async updateEntry(id, updatedEntry) {
    const index = this.data.findIndex((entry) => entry.id === id);
    if (index === -1) throw new Error("Entry not found");
    this.data[index] = {
      ...this.data[index],
      ...updatedEntry,
      updatedAt: new Date().toISOString(),
    };
    await this.saveDatabase();
    return this.data[index];
  }

  async deleteEntry(id) {
    const index = this.data.findIndex((entry) => entry.id === id);
    if (index === -1) throw new Error("Entry not found");
    const deleted = this.data.splice(index, 1);
    await this.saveDatabase();
    return deleted[0];
  }
}

// SerialPortManager: Manages serial port connections
export class SerialPortManager {
  constructor() {
    this.ports = new Map();
  }

  async listPorts() {
    try {
      const ports = await SerialPort.list();
      Logger.info("Available Serial Ports listed");
      return ports.map((port) => port.path);
    } catch (error) {
      Logger.error(`Error listing serial ports: ${error.message}`);
      throw error;
    }
  }

  openPort(ws, portName, baudRate = 115200) {
    return new Promise((resolve, reject) => {
      if (this.ports.has(ws)) {
        this.closePort(ws);
      }

      const port = new SerialPort({
        path: portName,
        baudRate,
        autoOpen: false,
      });
      const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

      const errorHandler = (error) => {
        Logger.error(`Serial port error on ${portName}: ${error.message}`);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: error.message }));
        }
      };

      const dataHandler = (data) => {
        Logger.info(`Data received from serial port ${portName}: ${data}`);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "serialData", data }));
        }
      };

      port.open((err) => {
        if (err) {
          Logger.error(`Error opening serial port ${portName}: ${err.message}`);
          return reject(err);
        }
        Logger.info(`Serial port ${portName} opened`);
        this.ports.set(ws, { port, parser, errorHandler, dataHandler });
        resolve(port);
      });

      port.on("error", errorHandler);
      parser.on("data", dataHandler);
    });
  }

  writeToPort(ws, data) {
    return new Promise((resolve, reject) => {
      const connection = this.ports.get(ws);
      if (connection && connection.port.isOpen) {
        connection.port.write(data, (err) => {
          if (err) {
            Logger.error(`Error writing to serial port: ${err.message}`);
            return reject(err);
          }
          Logger.info(`Data written to serial port: ${data}`);
          resolve();
        });
      } else {
        const errorMsg = "Serial port is not open";
        Logger.error(errorMsg);
        reject(new Error(errorMsg));
      }
    });
  }

  closePort(ws) {
    const connection = this.ports.get(ws);
    if (connection) {
      const { port, errorHandler, dataHandler } = connection;
      port.removeListener("error", errorHandler);
      connection.parser.removeListener("data", dataHandler);

      port.close((err) => {
        if (err) {
          Logger.error(`Error closing serial port: ${err.message}`);
        } else {
          Logger.info("Serial port closed");
        }
      });
      this.ports.delete(ws);
    }
  }

  closeAllPorts() {
    for (const ws of this.ports.keys()) {
      this.closePort(ws);
    }
  }
}

// TelnetManager: Manages Telnet connections and interactions
export class TelnetManager {
  constructor() {
    this.telnetConnections = new Map();
    this.scriptRunners = new Map();
    this.expectAutocomplete = new Map();
    this.autocompleteTimeouts = new Map();
    this.lastInputData = new Map();
    this.viPromises = new Map(); // { ws: {resolve, reject, buffer:[], expectedCommand:...} }
  }

  // Detect prompt lines - adjust as needed
  isPromptLine(line) {
    // Example: line ends with '#' or '$'
    return line.endsWith("#") || line.endsWith("$");
  }

  // Check if line is just the echoed command
  isCommandEcho(line, expectedCommand) {
    return expectedCommand && line.trim() === expectedCommand.trim();
  }

  async connect(ws, host, port) {
    return new Promise((resolve, reject) => {
      if (!host || !port) {
        return resolve({ success: false, message: "Invalid host or port" });
      }

      if (this.telnetConnections.has(ws)) {
        this.closeConnection(ws);
      }

      const socket = net.createConnection({ host, port }, () => {
        Logger.info(`Connected to Telnet server at ${host}:${port}`);
        resolve({
          success: true,
          message: `Connected to Telnet server at ${host}:${port}`,
        });
      });

      socket.on("error", (error) => {
        Logger.error(`Telnet socket error: ${error.message}`);
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Telnet connection error: ${error.message}`,
            }),
          );
        }
        this.closeConnection(ws);
      });

      const telnetInput = new TelnetInput();
      const telnetOutput = new TelnetOutput();
      socket.pipe(telnetInput);
      telnetOutput.pipe(socket);

      this.telnetConnections.set(ws, { socket, telnetInput, telnetOutput });

      telnetInput.on("data", (data) => {
        const dataStr = data.toString("utf-8");
        Logger.info(`Data received from Telnet: ${dataStr}`);

        if (this.viPromises.has(ws)) {
          const viData = this.viPromises.get(ws);
          const lines = dataStr.split("\n").map((l) => l.trim());

          for (const line of lines) {
            if (line.includes("No such file or directory")) {
              // File doesn't exist
              const errorMsg = `File does not exist: ${line}`;
              Logger.error(errorMsg);
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: "error", message: errorMsg }));
              }
              this.viPromises.delete(ws);
              viData.reject(new Error(errorMsg));
              return;
            }

            // Check if this line is the prompt, meaning cat is done
            if (this.isPromptLine(line)) {
              // cat is finished, assemble file content
              let fileContent = viData.buffer.join("\n");

              // Remove ANSI escape codes
              const ansiRegex = new RegExp(
                "[\\u001B\\u009B][[\\]()#;?]*(?:[\\d]{1,4}(?:;[\\d]{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]",
                "g",
              );
              fileContent = fileContent.replace(ansiRegex, "");

              // Remove non-printable control characters
              fileContent = fileContent.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

              if (ws.readyState === ws.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "viContent",
                    filePath: ws.filePath,
                    content: fileContent,
                  }),
                );
              }
              this.viPromises.delete(ws);
              viData.resolve(fileContent);
              return;
            }

            // Not prompt or no-such-file line, accumulate if not command echo and not empty
            if (
              !this.isCommandEcho(line, viData.expectedCommand) &&
              line !== ""
            ) {
              viData.buffer.push(line);
            }
          }
        } else {
          // Handle other data scenarios
          if (this.expectAutocomplete.get(ws)) {
            const lastInput = this.lastInputData.get(ws) || "";
            if (dataStr.trim() === lastInput.trim()) {
              Logger.info("Echoed autocomplete data detected and skipped.");
            } else if (dataStr.trim() === "\u0007") {
              Logger.info(
                "Received bell character for autocomplete. Not sending autocompleteData.",
              );
            } else {
              if (ws.readyState === ws.OPEN) {
                ws.send(
                  JSON.stringify({ type: "autocompleteData", data: dataStr }),
                );
              }
            }

            if (this.autocompleteTimeouts.has(ws)) {
              clearTimeout(this.autocompleteTimeouts.get(ws));
            }
            const timeout = setTimeout(() => {
              this.expectAutocomplete.set(ws, false);
              this.lastInputData.delete(ws);
              this.autocompleteTimeouts.delete(ws);
            }, 500);
            this.autocompleteTimeouts.set(ws, timeout);
          } else {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: "telnetData", data: dataStr }));
            }
          }

          // If there's a script runner, pass the data to it
          if (this.scriptRunners.has(ws)) {
            this.scriptRunners.get(ws).onData(dataStr);
          }
        }
      });

      telnetInput.on("do", (option) => {
        Logger.info(`Telnet server requested DO ${option}`);
        this.telnetConnections.get(ws).telnetOutput.writeWont(option);
      });

      telnetInput.on("will", (option) => {
        Logger.info(`Telnet server sent WILL ${option}`);
        this.telnetConnections.get(ws).telnetOutput.writeDo(option);
      });

      telnetInput.on("close", () => {
        Logger.info("Telnet connection closed");
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "telnetClosed",
              message: "Telnet connection closed",
            }),
          );
        }
        this.telnetConnections.delete(ws);
      });

      telnetInput.on("error", (error) => {
        Logger.error(`Telnet input stream error: ${error.message}`);
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Telnet input stream error: ${error.message}`,
            }),
          );
        }
        this.closeConnection(ws);
      });
    });
  }

  async sendInput(ws, data) {
    if (data.includes("\t")) {
      this.expectAutocomplete.set(ws, true);
      this.lastInputData.set(ws, data.replace(/\t/g, ""));
      if (this.autocompleteTimeouts.has(ws)) {
        clearTimeout(this.autocompleteTimeouts.get(ws));
      }
      const timeout = setTimeout(() => {
        this.expectAutocomplete.set(ws, false);
        this.lastInputData.delete(ws);
        this.autocompleteTimeouts.delete(ws);
      }, 500);
      this.autocompleteTimeouts.set(ws, timeout);
    }

    return new Promise((resolve, reject) => {
      const connection = this.telnetConnections.get(ws);
      if (connection && connection.telnetOutput) {
        connection.telnetOutput.write(Buffer.from(data, "utf-8"), (err) => {
          if (err) {
            Logger.error(`Error sending input to Telnet: ${err.message}`);
            return reject(err);
          }
          Logger.info(`Input sent to Telnet: ${data}`);

          if (data.includes("\t")) {
            const controlU = String.fromCharCode(21);
            connection.telnetOutput.write(
              Buffer.from(controlU, "utf-8"),
              (err) => {
                if (err) {
                  Logger.error(`Error sending Control+U: ${err.message}`);
                  return reject(err);
                }
                Logger.info("Control+U sent to Telnet server after Tab");
                resolve({ success: true, message: `Data and Control+U sent` });
              },
            );
          } else {
            resolve({ success: true, message: `Data sent: ${data}` });
          }
        });
      } else {
        const errorMsg = "Telnet connection is not open";
        Logger.error(errorMsg);
        reject(new Error(errorMsg));
      }
    });
  }

  async sendControlU(ws) {
    if (this.telnetConnections.has(ws)) {
      const connection = this.telnetConnections.get(ws);
      return new Promise((resolve, reject) => {
        const controlU = String.fromCharCode(21);
        connection.telnetOutput.write(Buffer.from(controlU, "utf-8"), (err) => {
          if (err) {
            Logger.error(`Error sending Control+U: ${err.message}`);
            return reject(err);
          }
          Logger.info("Control+U sent to Telnet server");
          resolve({ success: true, message: "Control+U sent" });
        });
      });
    } else {
      const errorMsg = "Telnet connection is not open";
      Logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  async executeCommand(ws, command) {
    command = command.replace(/\t/g, "");
    if (!command.endsWith("\n")) {
      command += "\n";
    }

    if (this.telnetConnections.has(ws)) {
      const connection = this.telnetConnections.get(ws);
      return new Promise((resolve, reject) => {
        connection.telnetOutput.write(Buffer.from(command, "utf-8"), (err) => {
          if (err) {
            Logger.error(`Error executing command on Telnet: ${err.message}`);
            return reject(err);
          }
          Logger.info(`Command executed on Telnet: ${command.trim()}`);
          resolve({
            success: true,
            message: `Command executed: ${command.trim()}`,
          });
        });
      });
    } else {
      const errorMsg = "Telnet connection is not open";
      Logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  async runScript(ws, scriptText) {
    const connection = this.telnetConnections.get(ws);
    if (!connection) {
      return { success: false, message: "No active Telnet connection" };
    }

    if (this.scriptRunners.has(ws)) {
      return { success: false, message: "A script is already running" };
    }

    const scriptRunner = new ScriptRunner(ws, connection, scriptText, () => {
      this.scriptRunners.delete(ws);
    });
    this.scriptRunners.set(ws, scriptRunner);
    scriptRunner.start();

    return { success: true, message: "Script started" };
  }

  async handleViCommand(ws, filePath) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        return reject(new Error("File path is required for vi command."));
      }
      this.viPromises.set(ws, {
        resolve,
        reject,
        buffer: [],
        expectedCommand: `cat ${filePath}`,
      });

      ws.filePath = filePath;
      this.sendCommand(ws, `cat ${filePath}`);
    });
  }

  async handleSaveViCommand(ws, filePath, content) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        return reject(new Error("File path is required for saveVi command."));
      }

      if (content === undefined) {
        return reject(new Error("Content is required for saveVi command."));
      }

      const escapedContent = content
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
      const command = `printf "${escapedContent}" > ${filePath}`;

      this.sendCommand(ws, command, (err) => {
        if (err) return reject(err);
        resolve({
          success: true,
          message: `File ${filePath} updated successfully.`,
        });
      });
    });
  }

  sendCommand(ws, command, callback) {
    const connection = this.telnetConnections.get(ws);
    if (connection && connection.telnetOutput) {
      connection.telnetOutput.write(
        Buffer.from(command + "\n", "utf-8"),
        (err) => {
          if (err) {
            Logger.error(`Error sending command to Telnet: ${err.message}`);
            if (callback) callback(err);
          } else {
            Logger.info(`Command sent to Telnet: ${command}`);
            if (callback) callback(null);
          }
        },
      );
    } else {
      const errorMsg = "Telnet connection is not open";
      Logger.error(errorMsg);
      if (callback) callback(new Error(errorMsg));
    }
  }

  closeConnection(ws) {
    const connection = this.telnetConnections.get(ws);
    if (connection) {
      connection.socket.destroy();
      this.telnetConnections.delete(ws);
      if (this.scriptRunners.has(ws)) {
        this.scriptRunners.get(ws).stop();
        this.scriptRunners.delete(ws);
      }
      Logger.info(
        "Telnet connection closed by client request for WebSocket:",
        ws.key,
      );
    }

    if (this.expectAutocomplete.has(ws)) this.expectAutocomplete.delete(ws);
    if (this.autocompleteTimeouts.has(ws)) {
      clearTimeout(this.autocompleteTimeouts.get(ws));
      this.autocompleteTimeouts.delete(ws);
    }
    if (this.lastInputData.has(ws)) this.lastInputData.delete(ws);
  }

  closeAllConnections() {
    for (const ws of this.telnetConnections.keys()) {
      this.closeConnection(ws);
    }
  }
}

class ScriptRunner {
  constructor(ws, connection, scriptText, onComplete) {
    this.ws = ws;
    this.connection = connection;
    this.scriptText = scriptText;
    this.commands = [];
    this.currentCommandIndex = 0;
    this.waitForString = null;
    this.isWaiting = false;
    this.onComplete = onComplete;
    this.bufferedData = "";
  }

  parseScript() {
    const lines = this.scriptText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    this.commands = lines;
  }

  async start() {
    this.parseScript();
    this.executeNextCommand();
  }

  stop() {
    this.isWaiting = false;
    this.waitForString = null;
    this.bufferedData = "";
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "scriptStopped",
          message: "Script execution stopped",
        }),
      );
    }
    if (this.onComplete) this.onComplete();
  }

  executeNextCommand() {
    if (this.currentCommandIndex >= this.commands.length) {
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "scriptCompleted",
            message: "Script execution completed",
          }),
        );
      }
      if (this.onComplete) this.onComplete();
      return;
    }

    const command = this.commands[this.currentCommandIndex++];

    const sleepMatch = command.match(/^sleep\((\d+)\)$/i);
    if (sleepMatch) {
      const time = parseInt(sleepMatch[1], 10);
      Logger.info(`Sleeping for ${time} milliseconds`);
      setTimeout(() => this.executeNextCommand(), time);
      return;
    }

    const waitForMatch = command.match(/^waitfor\(['"](.+?)['"]\)$/i);
    if (waitForMatch) {
      this.waitForString = waitForMatch[1];
      this.isWaiting = true;
      Logger.info(`Waiting for string: ${this.waitForString}`);
      return;
    }

    if (command.includes("\t")) {
      Logger.info(
        "Script command contains tab character. Command will be skipped.",
      );
      this.executeNextCommand();
      return;
    }

    this.connection.telnetOutput.write(Buffer.from(command + "\n", "utf-8"));
    Logger.info(`Command sent: ${command}`);
    this.executeNextCommand();
  }

  onData(data) {
    this.bufferedData += data;
    if (this.isWaiting && this.waitForString) {
      if (
        this.bufferedData
          .toLowerCase()
          .includes(this.waitForString.toLowerCase())
      ) {
        Logger.info(`Wait condition met for: ${this.waitForString}`);
        this.isWaiting = false;
        this.waitForString = null;
        this.bufferedData = "";
        this.executeNextCommand();
      }
    }

    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify({ type: "telnetData", data }));
    }
  }
}
