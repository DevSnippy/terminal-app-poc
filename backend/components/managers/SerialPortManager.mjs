// components/managers/SerialPortManager.mjs
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import Logger from '../utils/Logger.mjs';

class SerialPortManager {
  constructor() {
    this.ports = new Map(); // Maps WebSocket to SerialPort instances
  }

  async listPorts() {
    try {
      const ports = await SerialPort.list();
      Logger.info('Available Serial Ports listed');
      return ports.map(port => port.path);
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
        autoOpen: false
      });

      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

      port.open(err => {
        if (err) {
          Logger.error(`Error opening serial port ${portName}: ${err.message}`);
          return reject(err);
        }
        Logger.info(`Serial port ${portName} opened`);
        this.ports.set(ws, { port, parser });
        resolve(port);
      });

      port.on('error', error => {
        Logger.error(`Serial port error on ${portName}: ${error.message}`);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      });

      parser.on('data', data => {
        Logger.info(`Data received from serial port ${portName}: ${data}`);
        ws.send(JSON.stringify({ type: 'serialData', data }));
      });
    });
  }

  writeToPort(ws, data) {
    return new Promise((resolve, reject) => {
      const connection = this.ports.get(ws);
      if (connection && connection.port.isOpen) {
        connection.port.write(data, err => {
          if (err) {
            Logger.error(`Error writing to serial port: ${err.message}`);
            return reject(err);
          }
          Logger.info(`Data written to serial port: ${data}`);
          resolve();
        });
      } else {
        const errorMsg = 'Serial port is not open';
        Logger.error(errorMsg);
        reject(new Error(errorMsg));
      }
    });
  }

  closePort(ws) {
    const connection = this.ports.get(ws);
    if (connection) {
      connection.port.close(err => {
        if (err) {
          Logger.error(`Error closing serial port: ${err.message}`);
        } else {
          Logger.info('Serial port closed');
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

export default SerialPortManager;
