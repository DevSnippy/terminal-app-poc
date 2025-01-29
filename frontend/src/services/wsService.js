import Logger from "../utils/Logger"; // Ensure the correct path to Logger
import { v4 as uuidv4 } from "uuid"; // Importing UUID for unique keys

class WebSocketService {
  constructor() {
    if (!WebSocketService.instance) {
      this.validEndpoints = ["/terminal", "/telnet", "/ports"];
      this.sockets = {};
      this.messageHandlers = {};
      this.statusCallbacks = {};
      this.maxReconnectAttempts = 5;
      WebSocketService.instance = this;
    }

    return WebSocketService.instance;
  }

  /**
   * Connects to a WebSocket endpoint with a unique key.
   * Ensures only one connection per endpoint.
   * @param {string} key - Unique identifier for the connection.
   * @param {string} endpoint - The WebSocket endpoint to connect to.
   * @returns {Promise}
   */
  connect(key, endpoint) {
    return new Promise((resolve, reject) => {
      // Validate the endpoint
      if (!this.validEndpoints.includes(endpoint)) {
        Logger.error(`Attempted to connect to invalid endpoint: ${endpoint}`);
        reject(new Error(`Invalid endpoint: ${endpoint}`));
        return;
      }

      // Ensure the key is consistently tied to the endpoint
      if (this.sockets[key] && this.sockets[key].endpoint !== endpoint) {
        Logger.error(
          `Key "${key}" is already associated with endpoint "${this.sockets[key].endpoint}".`,
        );
        reject(
          new Error(
            `Key "${key}" is already associated with endpoint "${this.sockets[key].endpoint}". Choose a different key or endpoint.`,
          ),
        );
        return;
      }

      // Prevent multiple connections to the same endpoint with different keys
      const existingSocket = Object.values(this.sockets).find(
        (socketObj) => socketObj.endpoint === endpoint,
      );
      if (existingSocket) {
        Logger.info(
          `WebSocket is already connected or connecting to ${endpoint} with key "${existingSocket.key}".`,
        );
        resolve();
        return;
      }

      // Create a new WebSocket connection
      const backendUrl =
        process.env.REACT_APP_BACKEND_URL || "ws://localhost:3005";
      const socket = new WebSocket(`${backendUrl}${endpoint}`);

      this.sockets[key] = {
        key, // Store the key for reference
        endpoint,
        socket,
        shouldReconnect: true, // Flag to determine if reconnection should occur
        reconnectDelay: 1000, // Start with 1 second
        reconnectAttempts: 0, // Current reconnection attempts
        isManuallyDisconnected: false, // Initial state
      };

      Logger.info(`Attempting to connect to ${endpoint} with key "${key}"`);

      // Handle the 'open' event
      socket.onopen = () => {
        Logger.info(
          `WebSocket connection established at ${endpoint} with key "${key}"`,
        );
        // Reset reconnection parameters upon successful connection
        this.sockets[key].reconnectDelay = 1000;
        this.sockets[key].reconnectAttempts = 0;
        this.triggerStatus(key, "connected");
        resolve();
      };

      // Handle incoming messages
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          Logger.info(
            `Received message from ${endpoint} (key: "${key}"):`,
            data,
          );
          if (this.messageHandlers[key]) {
            this.messageHandlers[key](data);
          }
        } catch (err) {
          Logger.error(
            `Error parsing message from ${endpoint} (key: "${key}"):`,
            err,
          );
        }
      };

      // Handle errors
      socket.onerror = (errorEvent) => {
        Logger.error(
          `WebSocket error at ${endpoint} (key: "${key}"):`,
          errorEvent,
        );
        this.triggerStatus(key, "error");
      };

      // Handle the 'close' event
      socket.onclose = (event) => {
        Logger.warn(
          `WebSocket connection closed at ${endpoint} with key "${key}":`,
          event,
        );
        this.triggerStatus(key, "disconnected");

        // Guard clause to prevent reconnection if manually disconnected
        if (this.sockets[key] && this.sockets[key].isManuallyDisconnected) {
          Logger.info(
            `Manual disconnection for ${endpoint} with key "${key}". No reconnection.`,
          );
          delete this.sockets[key];
          return;
        }

        // Attempt reconnection if allowed
        if (this.sockets[key] && this.sockets[key].shouldReconnect) {
          if (this.sockets[key].reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.sockets[key].reconnectDelay;
            Logger.info(
              `Reconnecting to ${endpoint} with key "${key}" in ${
                delay / 1000
              } seconds...`,
            );
            setTimeout(() => {
              this.sockets[key].reconnectAttempts += 1;
              this.sockets[key].reconnectDelay = Math.min(
                this.sockets[key].reconnectDelay * 2,
                30000, // Cap the delay at 30 seconds
              );
              this.connect(key, endpoint)
                .then(() => {
                  Logger.info(`Reconnected to ${endpoint} with key "${key}"`);
                })
                .catch((err) => {
                  Logger.error(
                    `Reconnection failed at ${endpoint} with key "${key}":`,
                    err,
                  );
                });
            }, delay);
          } else {
            Logger.error(
              `Max reconnection attempts reached for ${endpoint} with key "${key}".`,
            );
          }
        } else {
          delete this.sockets[key]; // Clean up if manual disconnection
        }
      };
    });
  }

  /**
   * Disconnects a WebSocket connection using its unique key.
   * @param {string} key - Unique identifier for the connection.
   */
  disconnect(key) {
    if (this.sockets[key]) {
      this.sockets[key].shouldReconnect = false; // Prevent reconnection
      this.sockets[key].isManuallyDisconnected = true; // Mark as manual disconnection
      this.sockets[key].socket.close();
      Logger.info(
        `WebSocket disconnected at ${this.sockets[key].socket.url} with key "${key}"`,
      );
      // Remove the handler to prevent duplicate listeners upon reconnection
      delete this.messageHandlers[key];
      // Trigger status as disconnected
      this.triggerStatus(key, "disconnected");
      // Clean up the socket from the sockets object
      delete this.sockets[key];
    } else {
      Logger.warn(`No active WebSocket connection found with key "${key}"`);
    }
  }

  /**
   * Sends a message to a specified WebSocket connection using its unique key.
   * @param {string} key - Unique identifier for the connection.
   * @param {object} message - The message object to send.
   */
  sendMessage(key, message) {
    if (!message || Object.keys(message).length === 0) {
      Logger.warn(`Attempted to send empty message on key "${key}". Aborting.`);
      return;
    }

    const socketObj = this.sockets[key];
    if (!socketObj) {
      Logger.error(
        `Cannot send message. No active WebSocket connection with key "${key}".`,
      );
      return;
    }

    const socket = socketObj.socket;
    if (socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        Logger.info(`Sending message to server at key "${key}":`, messageStr);
        socket.send(messageStr);
      } catch (err) {
        Logger.error(`Failed to stringify message for key "${key}":`, err);
      }
    } else {
      Logger.error(
        `WebSocket with key "${key}" is not connected. Cannot send message.`,
      );
    }
  }

  /**
   * Registers a callback to handle incoming messages from a specified connection.
   * Ensures only one handler exists per connection key to prevent duplicates.
   * @param {string} key - Unique identifier for the connection.
   * @param {function} callback - The callback function to execute upon receiving a message.
   */
  onMessage(key, callback) {
    if (!this.sockets[key]) {
      Logger.error(
        `Cannot register message handler. No active WebSocket connection with key "${key}".`,
      );
      return;
    }

    if (this.messageHandlers[key]) {
      Logger.warn(`Overwriting existing message handler for key "${key}".`);
    }

    this.messageHandlers[key] = callback;
  }

  /**
   * Registers a callback to handle connection status changes for a specified connection key.
   * @param {string} key - Unique identifier for the connection.
   * @param {function} callback - The callback function receiving the status.
   */
  onStatusChange(key, callback) {
    if (!this.sockets[key]) {
      Logger.error(
        `Cannot register status handler. No active WebSocket connection with key "${key}".`,
      );
      return;
    }

    if (!this.statusCallbacks[key]) {
      this.statusCallbacks[key] = [];
    }

    this.statusCallbacks[key].push(callback);
  }

  /**
   * Triggers status callbacks for a specified connection key.
   * @param {string} key - Unique identifier for the connection.
   * @param {string} status - The status ('connected', 'disconnected', 'error').
   */
  triggerStatus(key, status) {
    if (this.statusCallbacks[key]) {
      this.statusCallbacks[key].forEach((cb) => cb(status));
    }
  }

  /**
   * Checks if a WebSocket connection is active.
   * @param {string} key - Unique identifier for the connection.
   * @returns {boolean} - True if connected or connecting, false otherwise.
   */
  isConnected(key) {
    const socket = this.sockets[key]?.socket;
    return (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    );
  }
}

// Create a singleton instance of WebSocketService
const instance = new WebSocketService();
Object.freeze(instance);

export default instance;
