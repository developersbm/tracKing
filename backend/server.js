const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Load environment variables from .env when present
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST;

// Middleware
app.use(cors());
app.use(express.json());

let hardwareState = {
  sessionActive: false,
  sessionId: null,
  userId: null,
  deviceIp: null, // Will be set when device registers
  repCount: 0,
  isConnected: false,
  lastHeartbeat: null
};

// Command queue for LILYGO to poll
let pendingCommands = [];

// TTGO calls this endpoint on startup to register its IP
app.post('/api/device/register', (req, res) => {
  const { deviceIp, deviceId } = req.body;
  
  console.log(`Device registered: ${deviceId} at IP ${deviceIp}`);
  hardwareState.deviceIp = deviceIp;
  hardwareState.isConnected = true;
  hardwareState.lastHeartbeat = new Date();
  
  res.json({ 
    success: true, 
    message: 'Device registered successfully' 
  });
});

// TTGO pings this periodically to maintain connection status
app.post('/api/device/heartbeat', (req, res) => {
  hardwareState.lastHeartbeat = new Date();
  hardwareState.isConnected = true;
  
  res.json({ 
    success: true,
    sessionActive: hardwareState.sessionActive,
    sessionId: hardwareState.sessionId
  });
});

// LILYGO calls this to get pending commands
app.get('/api/poll-commands', (req, res) => {
  // Return all pending commands and clear the queue
  const commands = [...pendingCommands];
  pendingCommands = [];
  
  if (commands.length > 0) {
    console.log(` Sending ${commands.length} command(s) to LILYGO`);
  }
  
  res.json({
    success: true,
    commands: commands
  });
});

// React app calls this when user clicks "Start Workout"
app.post('/api/start-workout', async (req, res) => {
  const { sessionId, userId } = req.body;
  
  console.log(`Starting workout - Session: ${sessionId}, User: ${userId}`);
  
  // Update server state
  hardwareState.sessionActive = true;
  hardwareState.sessionId = sessionId;
  hardwareState.userId = userId;
  hardwareState.repCount = 0;
  
  const isHardwareConnected = hardwareState.deviceIp && hardwareState.isConnected;
  
  // Queue command for LILYGO to poll
  if (isHardwareConnected) {
    pendingCommands.push({
      type: 'start',
      sessionId: sessionId,
      userId: userId,
      timestamp: Date.now()
    });
    console.log(' START command queued for LILYGO');
  }
  
  res.json({
    success: true,
    message: isHardwareConnected 
      ? 'Workout started - LILYGO will be notified' 
      : 'Workout started on software only',
    hardwareConnected: isHardwareConnected,
    sessionId: sessionId
  });
});

// React app calls this when user clicks "End Workout"
app.post('/api/end-workout', async (req, res) => {
  const { sessionId } = req.body;
  
  console.log(`Ending workout - Session: ${sessionId}`);
  
  const finalRepCount = hardwareState.repCount;
  const isHardwareConnected = hardwareState.deviceIp && hardwareState.isConnected;
  
  // Queue command for LILYGO to poll
  if (isHardwareConnected) {
    pendingCommands.push({
      type: 'stop',
      sessionId: sessionId,
      timestamp: Date.now()
    });
    console.log(' STOP command queued for LILYGO');
  }
  
  // Reset server state
  hardwareState.sessionActive = false;
  hardwareState.sessionId = null;
  hardwareState.userId = null;
  hardwareState.repCount = 0;
  
  res.json({
    success: true,
    message: 'Workout ended',
    finalRepCount
  });
});

// React app calls this when a rep is detected with form quality
app.post('/api/rep-detected', async (req, res) => {
  const { sessionId, repNumber, isCorrect, repDuration } = req.body;
  
  console.log(`Rep detected - Session: ${sessionId}, Rep: ${repNumber}, Form: ${isCorrect ? 'GOOD' : 'BAD'}, Duration: ${repDuration}s`);
  
  // Verify session is active
  if (!hardwareState.sessionActive || hardwareState.sessionId !== sessionId) {
    return res.status(400).json({
      success: false,
      error: 'No active session or session mismatch'
    });
  }
  
  // Update rep count
  hardwareState.repCount = repNumber;
  
  // Queue rep feedback for LILYGO to poll
  const isHardwareConnected = hardwareState.deviceIp && hardwareState.isConnected;
  if (isHardwareConnected) {
    pendingCommands.push({
      type: 'rep-feedback',
      repNumber: repNumber,
      isCorrect: isCorrect,
      repDuration: repDuration,
      timestamp: Date.now()
    });
    console.log(` REP FEEDBACK queued: ${isCorrect ? 'GREEN' : 'RED'}`);
  }
  
  res.json({
    success: true,
    message: 'Rep logged',
    totalReps: hardwareState.repCount
  });
});

// TTGO calls this endpoint whenever a rep is completed
app.post('/api/hardware-rep', (req, res) => {
  const { sessionId, repCount, deviceId, timestamp } = req.body;
  
  console.log(`Hardware rep received - Session: ${sessionId}, Rep: ${repCount}`);
  
  // Verify session is active
  if (!hardwareState.sessionActive || hardwareState.sessionId !== sessionId) {
    return res.status(400).json({
      success: false,
      error: 'No active session or session mismatch'
    });
  }
  
  // Update rep count
  hardwareState.repCount = repCount;
  
  res.json({
    success: true,
    message: 'Rep logged',
    totalReps: hardwareState.repCount
  });
});

// React app can call this to check hardware connection status
app.get('/api/hardware-status', (req, res) => {
  // Check if device has sent heartbeat recently (within last 10 seconds)
  const isAlive = hardwareState.lastHeartbeat && 
                  (new Date() - hardwareState.lastHeartbeat) < 10000;
  
  res.json({
    isConnected: isAlive,
    sessionActive: hardwareState.sessionActive,
    sessionId: hardwareState.sessionId,
    repCount: hardwareState.repCount,
    deviceIp: hardwareState.deviceIp,
    lastHeartbeat: hardwareState.lastHeartbeat
  });
});

// React app can poll this to get real-time hardware rep count
app.get('/api/hardware-reps', (req, res) => {
  res.json({
    sessionId: hardwareState.sessionId,
    repCount: hardwareState.repCount,
    sessionActive: hardwareState.sessionActive
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Start server and bind to configured HOST (so hardware on local network can reach it)
app.listen(PORT, HOST, () => {
  console.log(`TracKing Backend Server running on http://${HOST}:${PORT}`);
  console.log('Endpoints:');
  console.log(`  POST http://${HOST}:${PORT}/api/device/register`);
  console.log(`  POST http://${HOST}:${PORT}/api/device/heartbeat`);
  console.log(`  POST http://${HOST}:${PORT}/api/start-workout`);
  console.log(`  POST http://${HOST}:${PORT}/api/end-workout`);
  console.log(`  POST http://${HOST}:${PORT}/api/hardware-rep`);
  console.log(`  GET  http://${HOST}:${PORT}/api/hardware-status`);
  console.log(`  GET  http://${HOST}:${PORT}/api/hardware-reps`);
  console.log(`  GET  http://${HOST}:${PORT}/api/health`);
});
