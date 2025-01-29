// components/controllers/PortsController.mjs
import PortsService from '../services/PortsService.mjs';
import TerminalService from '../services/TerminalService.mjs';
import Logger from '../utils/Logger.mjs';
import ErrorHandler from '../utils/ErrorHandler.mjs';

class PortsController {
  constructor(app, portsService) {
    this.app = app;
    this.portsService = portsService;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.app.ws('/ports', async (ws, req) => {
      Logger.info('WebSocket connection established at /ports');

      ws.on('message', async (msg) => {
        let message;
        try {
          message = JSON.parse(msg);
        } catch (error) {
          Logger.error(`Invalid JSON: ${error.message}`);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON format' }));
          return;
        }

        Logger.info(`Received message on /ports: ${JSON.stringify(message)}`);

        switch (message.type) {
          case 'getPorts':
            try {
              const ports = await this.portsService.getPorts();
              Logger.info(`Sending ports list: ${ports}`);
              ws.send(JSON.stringify({ type: 'portsList', ports }));
            } catch (error) {
              ErrorHandler.handleWebSocketError(ws, error, error.message);
            }
            break;

          case 'selectPort':
            try {
              const result = await this.portsService.selectPort(ws, message.port);
              ws.send(JSON.stringify({ type: 'portOpened', message: result.message }));
            } catch (error) {
              ErrorHandler.handleWebSocketError(ws, error, error.message);
            }
            break;

          // Handle additional message types as needed

          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      });

      ws.on('close', () => {
        Logger.info('WebSocket connection closed at /ports');
        this.portsService.closePort(ws);
      });
    });
  }
}

export default PortsController;
