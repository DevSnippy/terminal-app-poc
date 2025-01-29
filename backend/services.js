// services.js
import express from "express";
import { Logger, ErrorHandler } from "./utils.js";
import { v4 as uuidv4 } from "uuid";

// Import managers
import {
  ScriptsManager,
  DatabaseManager,
  SerialPortManager,
  TelnetManager,
} from "./managers.js";

// TerminalService: Manages terminal-related operations
export class TerminalService {
  constructor(serialPortManager) {
    this.serialPortManager = serialPortManager;
  }

  async getAvailablePorts() {
    return await this.serialPortManager.listPorts();
  }

  async openPort(ws, portName) {
    return await this.serialPortManager.openPort(ws, portName);
  }

  async writeToPort(ws, data) {
    return await this.serialPortManager.writeToPort(ws, data);
  }

  closePort(ws) {
    this.serialPortManager.closePort(ws);
  }

  stopTerminal(ws) {
    this.serialPortManager.closePort(ws);
  }
}

// TelnetService: Manages Telnet-related operations
export class TelnetService {
  constructor(telnetManager) {
    this.telnetManager = telnetManager;
  }

  async connectTelnet(ws, host, port) {
    return await this.telnetManager.connect(ws, host, port);
  }

  async sendInput(ws, data) {
    return await this.telnetManager.sendInput(ws, data);
  }

  async executeCommand(ws, command) {
    return await this.telnetManager.executeCommand(ws, command);
  }

  async clearTerminal(ws) {
    return await this.telnetManager.sendControlU(ws);
  }

  async runScript(ws, scriptText) {
    return await this.telnetManager.runScript(ws, scriptText);
  }

  async vi(ws, filePath) {
    try {
      ws.filePath = filePath; // Store file path in ws for later reference
      await this.telnetManager.handleViCommand(ws, filePath);
      // The TelnetManager will send viContent or error messages
    } catch (error) {
      ErrorHandler.handleWebSocketError(
        ws,
        error,
        "Failed to open file with vi",
      );
    }
  }

  async saveVi(ws, filePath, content) {
    try {
      const result = await this.telnetManager.handleSaveViCommand(
        ws,
        filePath,
        content,
      );
      ws.send(JSON.stringify({ type: "viSaved", message: result.message }));
    } catch (error) {
      ErrorHandler.handleWebSocketError(
        ws,
        error,
        "Failed to save file with vi",
      );
    }
  }

  stopTelnet(ws) {
    this.telnetManager.closeConnection(ws);
  }
}

// PortsService: Handles port-related operations
export class PortsService {
  constructor(terminalService) {
    this.terminalService = terminalService;
  }

  async getPorts() {
    return await this.terminalService.getAvailablePorts();
  }

  async selectPort(ws, port) {
    try {
      await this.terminalService.openPort(ws, port);
      Logger.info(`Port selected and opened: ${port}`);
      return { success: true, message: "Port opened" };
    } catch (error) {
      Logger.error(`Error opening port: ${error.message}`);
      throw error;
    }
  }

  closePort(ws) {
    this.terminalService.closePort(ws);
  }
}

// DataProcessingService: Processes incoming data
export class DataProcessingService {
  processTelnetData(data) {
    Logger.info(`Processing Telnet data: ${data}`);
  }

  processSerialData(data) {
    Logger.info(`Processing Serial data: ${data}`);
  }

  processScriptData(scripts) {
    Logger.info(`Processing Scripts Data`);
  }
}

// ScriptsService: Manages scripts via ScriptsManager
export class ScriptsService {
  constructor(scriptsManager) {
    this.scriptsManager = scriptsManager;
  }

  getAllScripts() {
    return this.scriptsManager.getAllScripts();
  }

  getScript(id) {
    return this.scriptsManager.getScriptById(id);
  }

  async addScript(name, scriptText) {
    return await this.scriptsManager.addScript(name, scriptText);
  }

  async updateScript(id, name, scriptText) {
    return await this.scriptsManager.updateScript(id, name, scriptText);
  }

  async deleteScript(id) {
    return await this.scriptsManager.deleteScript(id);
  }
}

// DatabaseService: Manages database operations via DatabaseManager
export class DatabaseService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  getAllEntries() {
    return this.databaseManager.getAllEntries();
  }

  getEntry(id) {
    return this.databaseManager.getEntryById(id);
  }

  async addEntry(entry) {
    return await this.databaseManager.addEntry(entry);
  }

  async updateEntry(id, updatedEntry) {
    return await this.databaseManager.updateEntry(id, updatedEntry);
  }

  async deleteEntry(id) {
    return await this.databaseManager.deleteEntry(id);
  }
}

// TerminalController
export class TerminalController {
  constructor(app, telnetService, dataProcessingService) {
    this.telnetService = telnetService;
    this.dataProcessingService = dataProcessingService;
    this.setupWebSocket(app);
    Logger.info("TerminalController initialized.");
  }

  async setupWebSocket(app) {
    app.ws("/terminal", (ws, req) => {
      const key = `terminal-${uuidv4()}`;
      ws.key = key;
      Logger.info(`New WebSocket connection established with key ${key}`);

      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message);
          switch (data.type) {
            case "connect":
              {
                const connectResult = await this.telnetService.connectTelnet(
                  ws,
                  data.host,
                  data.port,
                );
                if (connectResult.success) {
                  ws.send(
                    JSON.stringify({
                      type: "connected",
                      message: connectResult.message,
                    }),
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: connectResult.message,
                    }),
                  );
                }
              }
              break;

            case "sendInput":
              {
                const inputData = data.data;
                if (inputData === undefined) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "No data provided in 'data' field.",
                    }),
                  );
                  Logger.error("No data provided in 'data' field.");
                  break;
                }
                const inputResponse = await this.telnetService.sendInput(
                  ws,
                  inputData,
                );
                if (inputResponse.success) {
                  ws.send(
                    JSON.stringify({
                      type: "inputSent",
                      message: inputResponse.message,
                    }),
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: inputResponse.message,
                    }),
                  );
                }
              }
              break;

            case "executeCommand":
              {
                const command = data.command;
                if (command === undefined) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "No command provided in 'command' field.",
                    }),
                  );
                  Logger.error("No command provided in 'command' field.");
                  break;
                }
                const response = await this.telnetService.executeCommand(
                  ws,
                  command,
                );
                if (response.success) {
                  ws.send(
                    JSON.stringify({
                      type: "commandExecuted",
                      message: response.message,
                    }),
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: response.message,
                    }),
                  );
                }
              }
              break;

            case "clearTerminal":
              {
                const response = await this.telnetService.clearTerminal(ws);
                if (response.success) {
                  ws.send(
                    JSON.stringify({
                      type: "terminalCleared",
                      message: response.message,
                    }),
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: response.message,
                    }),
                  );
                }
              }
              break;

            case "vi":
              {
                const filePath = data.command;
                if (!filePath) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "No file path provided in 'command' field.",
                    }),
                  );
                  Logger.error("No file path provided in 'command' field.");
                  break;
                }
                await this.telnetService.vi(ws, filePath);
              }
              break;

            case "saveVi":
              {
                const { command: filePath, content } = data;
                if (!filePath || content === undefined) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message:
                        "Both 'command' (file path) and 'content' are required.",
                    }),
                  );
                  Logger.error(
                    "Both 'command' and 'content' are required for saveVi.",
                  );
                  break;
                }
                await this.telnetService.saveVi(ws, filePath, content);
              }
              break;

            case "runScript":
              {
                const scriptText = data.scriptText;
                if (!scriptText) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "No scriptText provided.",
                    }),
                  );
                  Logger.error("No scriptText provided.");
                  break;
                }
                const scriptResponse = await this.telnetService.runScript(
                  ws,
                  scriptText,
                );
                if (scriptResponse.success) {
                  ws.send(
                    JSON.stringify({
                      type: "scriptQueued",
                      message: scriptResponse.message,
                    }),
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: scriptResponse.message,
                    }),
                  );
                }
              }
              break;

            case "disconnect":
              Logger.info(`Received disconnect request from key ${key}`);
              ws.close(1000, "Client initiated disconnect");
              break;

            default:
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Unknown message type.",
                }),
              );
              break;
          }
        } catch (error) {
          Logger.error(`Error handling message on key ${key}:`, error);
          ws.send(JSON.stringify({ type: "error", message: error.message }));
        }
      });

      ws.on("close", () => {
        Logger.info(`WebSocket connection with key ${key} closed.`);
        this.telnetService.stopTelnet(ws);
      });

      ws.on("error", (error) => {
        Logger.error(`WebSocket error with key ${key}:`, error);
        this.telnetService.stopTelnet(ws);
      });
    });
  }
}

// TelnetController
export class TelnetController {
  constructor(app, telnetService) {
    this.app = app;
    this.telnetService = telnetService;
    this.initializeRoutes();
    Logger.info("TelnetController initialized.");
  }

  initializeRoutes() {
    this.app.ws("/telnet", (ws, req) => {
      const key = `telnet-${uuidv4()}`;
      ws.key = key;
      Logger.info(
        `New Telnet WebSocket connection established with key ${key}`,
      );

      ws.on("message", async (msg) => {
        let message;
        try {
          message = JSON.parse(msg);
        } catch (error) {
          Logger.error(`Invalid JSON: ${error.message}`);
          ws.send(
            JSON.stringify({ type: "error", message: "Invalid JSON format" }),
          );
          return;
        }

        Logger.info(`Received message on /telnet: ${JSON.stringify(message)}`);

        switch (message.type) {
          case "connect":
            try {
              const result = await this.telnetService.connectTelnet(
                ws,
                message.host,
                message.port,
              );
              if (result.success) {
                ws.send(
                  JSON.stringify({
                    type: "telnetConnected",
                    message: result.message,
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({ type: "error", message: result.message }),
                );
              }
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to connect Telnet",
              );
            }
            break;

          case "sendInput":
            try {
              const inputData = message.data;
              if (inputData === undefined) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "No data provided in 'data' field.",
                  }),
                );
                Logger.error("No data provided in 'data' field.");
                break;
              }
              const inputResponse = await this.telnetService.sendInput(
                ws,
                inputData,
              );
              if (inputResponse.success) {
                ws.send(
                  JSON.stringify({
                    type: "inputSent",
                    message: inputResponse.message,
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: inputResponse.message,
                  }),
                );
              }
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to send input",
              );
            }
            break;

          case "executeCommand":
            try {
              const command = message.command;
              if (command === undefined) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "No command provided in 'command' field.",
                  }),
                );
                Logger.error("No command provided in 'command' field.");
                break;
              }
              const response = await this.telnetService.executeCommand(
                ws,
                command,
              );
              if (response.success) {
                ws.send(
                  JSON.stringify({
                    type: "commandExecuted",
                    message: response.message,
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({ type: "error", message: response.message }),
                );
              }
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to execute command",
              );
            }
            break;

          case "clearTerminal":
            try {
              const response = await this.telnetService.clearTerminal(ws);
              if (response.success) {
                ws.send(
                  JSON.stringify({
                    type: "terminalCleared",
                    message: response.message,
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({ type: "error", message: response.message }),
                );
              }
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to clear terminal",
              );
            }
            break;

          case "vi":
            try {
              const filePath = message.command;
              if (!filePath) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "No file path provided in 'command' field.",
                  }),
                );
                Logger.error("No file path provided in 'command' field.");
                break;
              }
              await this.telnetService.vi(ws, filePath);
            } catch (error) {
              ErrorHandler.handleWebSocketError(ws, error, "Failed to open vi");
            }
            break;

          case "saveVi":
            try {
              const { command: filePath, content } = message;
              if (!filePath || content === undefined) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Both 'command' and 'content' are required.",
                  }),
                );
                Logger.error(
                  "Both 'command' and 'content' are required for saveVi.",
                );
                break;
              }
              await this.telnetService.saveVi(ws, filePath, content);
            } catch (error) {
              ErrorHandler.handleWebSocketError(ws, error, "Failed to save vi");
            }
            break;

          case "runScript":
            {
              const scriptText = message.scriptText;
              if (!scriptText) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "No scriptText provided.",
                  }),
                );
                Logger.error("No scriptText provided.");
                break;
              }
              try {
                const scriptResponse = await this.telnetService.runScript(
                  ws,
                  scriptText,
                );
                if (scriptResponse.success) {
                  ws.send(
                    JSON.stringify({
                      type: "scriptQueued",
                      message: scriptResponse.message,
                    }),
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: scriptResponse.message,
                    }),
                  );
                }
              } catch (error) {
                ErrorHandler.handleWebSocketError(
                  ws,
                  error,
                  "Failed to run script",
                );
              }
            }
            break;

          case "disconnect":
            try {
              Logger.info(`Received disconnect request from key ${key}`);
              ws.close(1000, "Client initiated disconnect");
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to disconnect Telnet",
              );
            }
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Unknown message type",
              }),
            );
        }
      });

      ws.on("close", () => {
        Logger.info(`Telnet WebSocket connection with key ${key} closed.`);
        this.telnetService.stopTelnet(ws);
      });

      ws.on("error", (error) => {
        Logger.error(`Telnet WebSocket error with key ${key}:`, error);
        this.telnetService.stopTelnet(ws);
      });
    });
  }
}

// PortsController
export class PortsController {
  constructor(app, portsService) {
    this.app = app;
    this.portsService = portsService;
    this.initializeRoutes();
    Logger.info("PortsController initialized.");
  }

  initializeRoutes() {
    this.app.ws("/ports", (ws, req) => {
      Logger.info("WebSocket connection established at /ports");

      ws.on("message", async (msg) => {
        let message;
        try {
          message = JSON.parse(msg);
        } catch (error) {
          Logger.error(`Invalid JSON: ${error.message}`);
          ws.send(
            JSON.stringify({ type: "error", message: "Invalid JSON format" }),
          );
          return;
        }

        Logger.info(`Received message on /ports: ${JSON.stringify(message)}`);

        switch (message.type) {
          case "getPorts":
            try {
              const ports = await this.portsService.getPorts();
              Logger.info(`Sending ports list: ${ports}`);
              ws.send(JSON.stringify({ type: "portsList", ports }));
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to get ports",
              );
            }
            break;

          case "selectPort":
            try {
              const result = await this.portsService.selectPort(
                ws,
                message.port,
              );
              if (result.success) {
                ws.send(
                  JSON.stringify({
                    type: "portOpened",
                    message: result.message,
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({ type: "error", message: result.message }),
                );
              }
            } catch (error) {
              ErrorHandler.handleWebSocketError(
                ws,
                error,
                "Failed to open port",
              );
            }
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Unknown message type",
              }),
            );
        }
      });

      ws.on("close", () => {
        Logger.info("WebSocket connection closed at /ports");
        this.portsService.closePort(ws);
      });
    });
  }
}

// HttpController
export class HttpController {
  constructor(app, dataProcessingService, scriptsService) {
    this.app = app;
    this.dataProcessingService = dataProcessingService;
    this.scriptsService = scriptsService;
    this.initializeRoutes();
    Logger.info("HttpController initialized.");
  }

  initializeRoutes() {
    this.app.post("/telnet-data", express.json(), (req, res) => {
      const { data } = req.body;
      Logger.info(`Received Telnet Data via HTTP POST: ${data}`);
      try {
        this.dataProcessingService.processTelnetData(data);
        res.status(200).json({ message: "Data received successfully" });
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to process Telnet data");
      }
    });

    // Scripts Management
    this.app.get("/scripts", async (req, res) => {
      try {
        const scripts = this.scriptsService.getAllScripts();
        res.status(200).json(scripts);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to retrieve scripts");
      }
    });

    this.app.post("/scripts", express.json(), async (req, res) => {
      const { name, scriptText } = req.body;
      if (!name || !scriptText) {
        return res
          .status(400)
          .json({
            type: "error",
            message: "Both 'name' and 'scriptText' are required.",
          });
      }
      try {
        const newScript = await this.scriptsService.addScript(name, scriptText);
        res.status(201).json(newScript);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to add script");
      }
    });

    this.app.put("/scripts/:id", express.json(), async (req, res) => {
      const { id } = req.params;
      const { name, scriptText } = req.body;
      if (!name || !scriptText) {
        return res
          .status(400)
          .json({
            type: "error",
            message: "Both 'name' and 'scriptText' are required.",
          });
      }
      try {
        const updatedScript = await this.scriptsService.updateScript(
          id,
          name,
          scriptText,
        );
        res.status(200).json(updatedScript);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to update script");
      }
    });

    this.app.delete("/scripts/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const deletedScript = await this.scriptsService.deleteScript(id);
        res.status(200).json(deletedScript);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to delete script");
      }
    });

    // Database endpoints are handled by DatabaseController
  }
}

// DatabaseController
export class DatabaseController {
  constructor(app, databaseService) {
    this.app = app;
    this.databaseService = databaseService;
    this.initializeRoutes();
    Logger.info("DatabaseController initialized.");
  }

  initializeRoutes() {
    this.app.get("/database", async (req, res) => {
      try {
        const entries = this.databaseService.getAllEntries();
        res.status(200).json(entries);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to retrieve entries");
      }
    });

    this.app.post("/database", express.json(), async (req, res) => {
      const { project, location, type, deviceVersion, serialNumber } = req.body;
      if (!project || !location || !type || !deviceVersion || !serialNumber) {
        return res.status(400).json({
          type: "error",
          message:
            "All fields (project, location, type, deviceVersion, serialNumber) are required.",
        });
      }

      try {
        const newEntry = await this.databaseService.addEntry({
          project,
          location,
          type,
          deviceVersion,
          serialNumber,
        });
        res.status(201).json(newEntry);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to add entry");
      }
    });

    this.app.put("/database/:id", express.json(), async (req, res) => {
      const { id } = req.params;
      const { project, location, type, deviceVersion, serialNumber } = req.body;

      if (!project || !location || !type || !deviceVersion || !serialNumber) {
        return res.status(400).json({
          type: "error",
          message:
            "All fields (project, location, type, deviceVersion, serialNumber) are required.",
        });
      }

      try {
        const updatedEntry = await this.databaseService.updateEntry(id, {
          project,
          location,
          type,
          deviceVersion,
          serialNumber,
        });
        res.status(200).json(updatedEntry);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to update entry");
      }
    });

    this.app.delete("/database/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const deletedEntry = await this.databaseService.deleteEntry(id);
        res.status(200).json(deletedEntry);
      } catch (error) {
        ErrorHandler.handleError(res, error, "Failed to delete entry");
      }
    });
  }
}
