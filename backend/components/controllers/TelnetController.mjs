// src/components/controllers/TerminalController.mjs

import WebSocket from "ws";
import telnetService from "../services/TelnetService.mjs"; // Adjust the path as necessary
import Logger from "../utils/Logger.mjs"; // Adjust the path as necessary

class TerminalController {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on("connection", this.handleConnection.bind(this));
  }

  async handleConnection(ws) {
    // Assign a unique key to each WebSocket connection
    const key = `telnet-${uuidv4()}`;
    ws.key = key;

    Logger.info(`New WebSocket connection established with key ${key}`);

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case "connect":
            // Establish Telnet connection
            await telnetService.connectTelnet(data.host, data.port, key);
            ws.send(
              JSON.stringify({
                type: "connected",
                message: `Connected to Telnet at ${data.host}:${data.port}`,
              }),
            );
            break;

          case "sendCommand":
            // Send command over Telnet
            const response = await telnetService.sendCommand(key, data.data);
            ws.send(JSON.stringify({ type: "telnetData", data: response }));
            break;

          case "runScript":
            // Handle script execution if applicable
            // Implement as needed
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Unknown command type.",
              }),
            );
            break;
        }
      } catch (error) {
        Logger.error(`Error handling message:`, error);
        ws.send(JSON.stringify({ type: "error", message: error.message }));
      }
    });

    ws.on("close", () => {
      Logger.info(`WebSocket connection with key ${key} closed.`);
      telnetService.stopTelnet(key);
    });

    ws.on("error", (error) => {
      Logger.error(`WebSocket error with key ${key}:`, error);
      telnetService.stopTelnet(key);
    });
  }
}

export default TerminalController;
