// backend/routes/verifierRoutes.js
// Step 1: Basic Verifier Routes

const express = require('express');
const router = express.Router();
const vcService = require('../services/vcService');

// In-memory storage for verification sessions
const verificationSessions = new Map();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of verificationSessions.entries()) {
    if (session.expiresAt < now) {
      verificationSessions.delete(sessionId);
      console.log(`🗑️ Expired verification session: ${sessionId}`);
    }
  }
}, 300000);

// ============================================
// 1. Get Verifier Info
// ============================================
router.get('/info', async (req, res) => {
  try {
    res.json({
      success: true,
      verifier: {
        name: 'VoltusWave Verification Service',
        type: 'Credential Verifier',
        version: '1.0.0',
        supportedCredentialTypes: [
          'University Degree Certificate',
          'VerifiableCredential'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 2. Create Verification Request
// ============================================
router.post('/create-request', async (req, res) => {
  try {
    const { 
      requestedCredentials = [],
      verifierName = 'Verification Service',
      purpose = 'Credential Verification'
    } = req.body;

    const sessionId = 'verify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const challenge = 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const session = {
      id: sessionId,
      type: 'PRESENTATION_REQUEST',
      challenge: challenge,
      requestedCredentials: requestedCredentials,
      verifierName: verifierName,
      purpose: purpose,
      createdAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
      status: 'pending',
      verificationResult: null
    };

    verificationSessions.set(sessionId, session);
    console.log('✅ Verification request created:', sessionId);

    res.json({
      success: true,
      session: session
    });

  } catch (error) {
    console.error('❌ Failed to create verification request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 3. Get Session Status
// ============================================
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!verificationSessions.has(sessionId)) {
      return res.status(404).json({
        error: 'Session not found or expired'
      });
    }

    const session = verificationSessions.get(sessionId);

    // Check if expired
    if (session.expiresAt < Date.now()) {
      verificationSessions.delete(sessionId);
      return res.status(410).json({
        error: 'Session expired',
        sessionId: sessionId
      });
    }

    res.json({
      success: true,
      session: session
    });

  } catch (error) {
    console.error('❌ Failed to get session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 4. Submit Verification Response (Wallet submits VP)
// ============================================
router.post('/submit-response', async (req, res) => {
  try {
    const { sessionId, vpJwt } = req.body;

    console.log('📥 Received VP submission for session:', sessionId);

    if (!sessionId || !vpJwt) {
      return res.status(400).json({
        error: 'Session ID and VP JWT are required'
      });
    }

    // Get session
    if (!verificationSessions.has(sessionId)) {
      return res.status(404).json({
        error: 'Session not found or expired'
      });
    }

    const session = verificationSessions.get(sessionId);

    // Check expiration
    if (session.expiresAt < Date.now()) {
      verificationSessions.delete(sessionId);
      return res.status(410).json({
        error: 'Session expired'
      });
    }

    // Verify presentation with session challenge
    console.log('🔍 Verifying presentation with challenge:', session.challenge);
    const result = await vcService.verifyPresentation(vpJwt, session.challenge);

    // Update session
    session.status = result.verified ? 'verified' : 'failed';
    session.verificationResult = result;
    session.verifiedAt = Date.now();
    verificationSessions.set(sessionId, session);

    console.log(`${result.verified ? '✅' : '❌'} Verification result:`, result.verified);

    res.json({
      success: result.verified,
      verified: result.verified,
      session: session,
      result: result
    });

  } catch (error) {
    console.error('❌ Failed to submit response:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;