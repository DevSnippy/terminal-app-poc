// main.mjs
import express from "express";
import expressWs from "express-ws";
import cors from "cors";

import { Logger, ConfigManager } from "./utils.js";
import {
  ScriptsManager,
  DatabaseManager,
  SerialPortManager,
  TelnetManager,
} from "./managers.js";
import {
  TerminalService,
  TelnetService,
  PortsService,
  DataProcessingService,
  ScriptsService,
  DatabaseService,
  TerminalController,
  TelnetController,
  PortsController,
  HttpController,
  DatabaseController,
} from "./services.js";

const app = express();

const allowedOrigins = ConfigManager.getAllowedOrigins();

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.options("*", cors());

expressWs(app);

const scriptsManager = new ScriptsManager();
const databaseManager = new DatabaseManager();
const serialPortManager = new SerialPortManager();
const telnetManager = new TelnetManager();

const terminalService = new TerminalService(serialPortManager);
const telnetService = new TelnetService(telnetManager);
const portsService = new PortsService(terminalService);
const dataProcessingService = new DataProcessingService();
const scriptsService = new ScriptsService(scriptsManager);
const databaseService = new DatabaseService(databaseManager);

new TerminalController(app, telnetService, dataProcessingService);
new TelnetController(app, telnetService);
new PortsController(app, portsService);
new HttpController(app, dataProcessingService, scriptsService);
new DatabaseController(app, databaseService);

const shutdown = () => {
  Logger.info("Shutting down server...");
  serialPortManager.closeAllPorts();
  telnetManager.closeAllConnections();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const PORT = ConfigManager.getPort();
app.listen(PORT, () => {
  Logger.info(`Server is listening on port ${PORT}`);
});
