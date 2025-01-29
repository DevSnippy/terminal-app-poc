// components/utils/ConfigManager.mjs
import dotenv from 'dotenv';

dotenv.config();

class ConfigManager {
  static get(key) {
    return process.env[key];
  }

  static getPort() {
    return this.get('PORT') || 3005;
  }

  static getTelnetEndpoint() {
    return this.get('TELNET_ENDPOINT');
  }
}

export default ConfigManager;
