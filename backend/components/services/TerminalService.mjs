// components/services/TerminalService.mjs
import SerialPortManager from '../managers/SerialPortManager.mjs';
import Logger from '../utils/Logger.mjs';

class TerminalService {
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
}

export default TerminalService;
