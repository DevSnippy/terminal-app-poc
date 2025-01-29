// components/services/PortsService.mjs
import TerminalService from './TerminalService.mjs';
import Logger from '../utils/Logger.mjs';

class PortsService {
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
      return { success: true, message: 'Port opened' };
    } catch (error) {
      Logger.error(`Error opening port: ${error.message}`);
      throw error;
    }
  }

  closePort(ws) {
    this.terminalService.closePort(ws);
  }
}

export default PortsService;
