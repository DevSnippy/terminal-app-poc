// components/utils/ErrorHandler.mjs
import Logger from './Logger.mjs';

class ErrorHandler {
  static handleError(res, error, customMessage = 'An error occurred') {
    Logger.error(`${customMessage}: ${error.message}`);
    res.status(500).json({ type: 'error', message: customMessage });
  }

  static handleWebSocketError(ws, error, customMessage = 'An error occurred') {
    Logger.error(`${customMessage}: ${error.message}`);
    ws.send(JSON.stringify({ type: 'error', message: customMessage }));
  }
}

export default ErrorHandler;
