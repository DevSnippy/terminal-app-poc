// components/controllers/HttpController.mjs
import DataProcessingService from '../services/DataProcessingService.mjs';
import Logger from '../utils/Logger.mjs';
import ErrorHandler from '../utils/ErrorHandler.mjs';

class HttpController {
  constructor(app, dataProcessingService) {
    this.app = app;
    this.dataProcessingService = dataProcessingService;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.app.post('/telnet-data', (req, res) => {
      const { data } = req.body;
      Logger.info(`Received Telnet Data via HTTP POST: ${data}`);
      try {
        this.dataProcessingService.processTelnetData(data);
        res.status(200).json({ message: 'Data received successfully' });
      } catch (error) {
        ErrorHandler.handleError(res, error, 'Failed to process Telnet data');
      }
    });

    // Add more HTTP routes as needed
  }
}

export default HttpController;
