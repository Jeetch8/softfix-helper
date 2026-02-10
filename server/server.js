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
import keywordRoutes from './routes/keywordRoutes.js';
import ideaRoutes from './routes/ideaRoutes.js';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1']);


const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://softfix-helper.vercel.app'
  ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
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
app.use('/api', keywordRoutes);
app.use('/api', ideaRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TTS Narration API Server',
    version: '1.0.0',
    endpoints: {
      topics: {
        'POST /api/topics': 'Create a new topic for narration script generation',
        'GET /api/topics': 'Get all topics (supports ?userId=xxx filter)',
        'GET /api/topics/:id': 'Get a specific topic by ID',
        'GET /api/status/all': 'Get topic status statistics',
        'POST /api/process-now': 'Manually trigger topic processing',
        'DELETE /api/topics/:id': 'Delete a topic',
      },
      keywords: {
        'GET /api/keywords': 'Get all keywords with filtering/search',
        'GET /api/keywords/stats': 'Get keyword statistics',
        'POST /api/keywords/upload': 'Upload Excel files to import keywords',
        'GET /api/keywords/local/list': 'List Excel files in a local directory',
        'POST /api/keywords/local/import-directory': 'Import all Excel files from a local directory',
        'POST /api/keywords/local/import-file': 'Import a single local Excel file',
        'PUT /api/keywords/:id': 'Update a keyword',
        'DELETE /api/keywords/:id': 'Delete a keyword',
        'POST /api/keywords/:id/add-to-title': 'Add keyword to title queue',
      },
      health: 'GET /health',
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
