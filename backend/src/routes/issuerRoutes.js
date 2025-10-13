const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { ES256KSigner } = require('did-jwt');
const { createVerifiableCredentialJwt } = require('did-jwt-vc');
const blockchainService = require('../services/blockchainService');
const didService = require('../services/didService');
const { v4: uuidv4 } = require('uuid');

// Issuer's DID and keys (from environment or config)
const ISSUER_DID = process.env.ISSUER_DID || 'did:ethr:VoltusWave:0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';

// ============================================
// 1. Get Issuer Info
// ============================================
router.get('/issuer/info', async (req, res) => {
  try {
    const signer = await blockchainService.getSigner();
    const address = await signer.getAddress();
    
    res.json({
      success: true,
      issuer: {
        did: ISSUER_DID,
        address: address,
        name: 'VoltusWave University', // Customize this
        type: 'Educational Institution',
        description: 'Official credential issuer'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 2. Issue Credential to User
// ============================================
router.post('/issuer/issue', async (req, res) => {
  try {
    const { subjectDID, credentialType, claims } = req.body;

    if (!subjectDID || !credentialType || !claims) {
      return res.status(400).json({ 
        error: 'Missing required fields: subjectDID, credentialType, claims' 
      });
    }

    console.log('📜 Issuing credential...');
    console.log('   To:', subjectDID);
    console.log('   Type:', credentialType);
    console.log('   Claims:', claims);

    // Get issuer's signing key
    const ethersSigner = await blockchainService.getSigner();
    const privateKey = ethersSigner.privateKey.slice(2);
    const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));

    // Build credential payload
    const vcPayload = {
      sub: subjectDID,
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", credentialType],
        credentialSubject: {
          id: subjectDID,
          ...claims
        }
      }
    };

    // Sign credential as issuer
    const issuer = {
      did: ISSUER_DID,
      signer: signer,
      alg: 'ES256K'
    };

    const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

    const credential = {
      id: uuidv4(),
      issuer: ISSUER_DID,
      subject: subjectDID,
      type: credentialType,
      claims: claims,
      jwt: jwt,
      issuedAt: new Date().toISOString()
    };

    console.log('✅ Credential issued successfully');

    res.json({
      success: true,
      credential: credential,
      message: 'Credential issued by VoltusWave University'
    });

  } catch (err) {
    console.error('❌ Failed to issue credential:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 3. Batch Issue Credentials
// ============================================
router.post('/issuer/batch-issue', async (req, res) => {
  try {
    const { credentials } = req.body; // Array of { subjectDID, credentialType, claims }

    if (!credentials || !Array.isArray(credentials)) {
      return res.status(400).json({ error: 'Invalid credentials array' });
    }

    const issued = [];
    const failed = [];

    for (const cred of credentials) {
      try {
        const result = await issueCredential(cred.subjectDID, cred.credentialType, cred.claims);
        issued.push(result);
      } catch (error) {
        failed.push({ ...cred, error: error.message });
      }
    }

    res.json({
      success: true,
      issued: issued.length,
      failed: failed.length,
      results: { issued, failed }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function
async function issueCredential(subjectDID, credentialType, claims) {
  const ethersSigner = await blockchainService.getSigner();
  const privateKey = ethersSigner.privateKey.slice(2);
  const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));

  const vcPayload = {
    sub: subjectDID,
    nbf: Math.floor(Date.now() / 1000),
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", credentialType],
      credentialSubject: {
        id: subjectDID,
        ...claims
      }
    }
  };

  const issuer = {
    did: ISSUER_DID,
    signer: signer,
    alg: 'ES256K'
  };

  const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

  return {
    id: uuidv4(),
    issuer: ISSUER_DID,
    subject: subjectDID,
    type: credentialType,
    claims: claims,
    jwt: jwt,
    issuedAt: new Date().toISOString()
  };
}

module.exports = router;
