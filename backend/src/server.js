const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config/config');
const didRoutes = require('./routes/didRoutes');
const issuerRoutes = require('./routes/issuerRoutes');
const verifierRoutes = require('./routes/verifierRoutes');
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/verifier', verifierRoutes);

// Mount routes
app.use('/', didRoutes);
app.use('/issuer', issuerRoutes);
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'DID Wallet API',
    endpoints: [
      'POST /create-did',
      'GET /resolve-did/:did',
      'POST /store-vc',
      'GET /list-vc',
      'POST /create-vp',
      'POST /verify-vc',
      'POST /verify-vp'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'DID Wallet Backend',
        timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// Start server
const PORT = config.port || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Connected to blockchain at ${config.rpcUrl}`);
  console.log(`📄 Registry address: ${config.registryAddress}`);
});

module.exports = app;