#!/usr/bin/env node

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// import dotenv from 'dotenv';
// import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import { startCronJob, stopCronJob } from './services/cronService.js';
import topicRoutes from './routes/topicRoutes.js';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1']);

// Load environment variables from root directory
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
// import { GoogleGenAI } from '@google/genai';

// async function listAvailableModels() {
//   try {
//     const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
//     const models = await ai.models.list();

//     console.log('✅ Available Gemini Models:');
//     console.log(models);
//     models.forEach((model) => {
//       console.log(`  - ${model.name}`);
//     });

//     return models;
//   } catch (error) {
//     console.error('❌ Error listing models:', error.message);
//   }
// }

// listAvailableModels();

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', topicRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TTS Narration API Server',
    version: '1.0.0',
    endpoints: {
      'POST /api/topics': 'Create a new topic for narration script generation',
      'GET /api/topics': 'Get all topics (supports ?userId=xxx filter)',
      'GET /api/topics/:id': 'Get a specific topic by ID',
      'GET /api/status/all': 'Get topic status statistics',
      'POST /api/process-now': 'Manually trigger topic processing',
      'DELETE /api/topics/:id': 'Delete a topic',
      'GET /health': 'Health check',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// 404 handler for unknown paths
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API point not found',
    path: req.path,
    method: req.method,
  });
});

// Initialize server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(
        `📊 API Documentation available at http://localhost:${PORT}\n`,
      );
    });

    // Start the cron job
    startCronJob();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️ Shutting down server...');
      stopCronJob();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
