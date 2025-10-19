/**
 * Main Express server entry point
 */
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupSockets, setSocketInstance } from './sockets';
import routes from './routes';
import { errorMiddleware } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting and client IP detection
// Set to true for development, configure appropriately for production
app.set('trust proxy', true);

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Relaxed for development
app.use(cors({
  origin: '*', // TODO: Restrict in production
  credentials: true,
}));
// Increase payload size limit for base64 image uploads (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting on API routes
app.use('/api', apiLimiter);

// Routes
app.use(routes);

// Error handling
app.use(errorMiddleware);

// Start server
httpServer.listen(PORT, () => {
  console.info(`🚀 Server running on http://localhost:${PORT}`);
  console.info(`📡 Socket.IO ready`);
  console.info(`🏥 Health check: http://localhost:${PORT}/healthz`);
});

// Setup Socket.IO
const io = setupSockets(httpServer);
setSocketInstance(io);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});
