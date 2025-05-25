import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ServerError } from './types.js';

// Import WordPress routes
import wordpressRoutes from './routes/wordpressRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/wordpress', wordpressRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'WordPress Plugin Troubleshooting RAG System',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/wordpress/troubleshoot',
      'GET /api/wordpress/health'
    ]
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'WordPress Plugin Troubleshooting RAG API',
    version: '1.0.0',
    description: 'AI-powered WordPress plugin troubleshooting using RAG',
    documentation: {
      troubleshoot: 'POST /api/wordpress/troubleshoot',
      health: 'GET /health',
      example: {
        endpoint: '/api/wordpress/troubleshoot',
        method: 'POST',
        body: {
          naturalLanguageQuery: 'My WooCommerce orders are not syncing to Mailchimp'
        }
      }
    }
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/wordpress/troubleshoot',
      'GET /api/wordpress/health'
    ]
  });
});

// Global error handler
app.use((err: ServerError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  const status = err.status || 500;
  const message = err.message || { err: 'An unexpected error occurred' };
  
  res.status(status).json({
    error: true,
    message: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      log: err.log 
    })
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 WordPress RAG Troubleshooting API Server Started');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Troubleshoot endpoint: http://localhost:${PORT}/api/wordpress/troubleshoot`);
  console.log(`📖 API documentation: http://localhost:${PORT}/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('---');
  console.log('Ready to help with WordPress plugin troubleshooting! 🎯');
});

export default app;