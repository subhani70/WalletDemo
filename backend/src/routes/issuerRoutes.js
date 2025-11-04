const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { ES256KSigner } = require('did-jwt');
const { createVerifiableCredentialJwt } = require('did-jwt-vc');
const blockchainService = require('../services/blockchainService');
const didService = require('../services/didService');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Helper function to get issuer DID dynamically from signer's address
async function getIssuerDID() {
  const signer = await blockchainService.getSigner();
  const address = await signer.getAddress();
  return `did:ethr:${config.networkName}:${address.toLowerCase()}`;
}

// ============================================
// 1. Get Issuer Info
// ============================================
router.get('/issuer/info', async (req, res) => {
  try {
    const signer = await blockchainService.getSigner();
    const address = await signer.getAddress();
    const issuerDID = await getIssuerDID();
    
    res.json({
      success: true,
      issuer: {
        did: issuerDID,
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
    const issuerDID = await getIssuerDID();

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
      did: issuerDID,
      signer: signer,
      alg: 'ES256K'
    };

    const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

    const credential = {
      id: uuidv4(),
      issuer: issuerDID,
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
  const issuerDID = await getIssuerDID();

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
    did: issuerDID,
    signer: signer,
    alg: 'ES256K'
  };

  const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

  return {
    id: uuidv4(),
    issuer: issuerDID,
    subject: subjectDID,
    type: credentialType,
    claims: claims,
    jwt: jwt,
    issuedAt: new Date().toISOString()
  };
}

module.exports = router;
