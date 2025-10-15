// backend/routes/didRoutes.js
// FIXED: Add DID validation before credential operations

const express = require('express');
const router = express.Router();
const didService = require('../services/didService');
const vcService = require('../services/vcService');
const blockchainService = require('../services/blockchainService');
const { ethers } = require('ethers');
const { Buffer } = require('buffer');

// In-memory storage for claim tokens (use Redis in production)
const claimTokens = new Map();

// Clean up expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [tokenId, token] of claimTokens.entries()) {
    if (token.expiresAt < now) {
      claimTokens.delete(tokenId);
      console.log(`🗑️ Expired claim token: ${tokenId}`);
    }
  }
}, 60000);

// ============================================
// HELPER FUNCTION: Check if DID is registered
// ============================================
async function isDIDRegistered(address) {
  try {
    const registry = await blockchainService.getRegistry();
    const lastChanged = await registry.changed(address);
    
    // If changed > 0, it means the DID has been registered
    return lastChanged.gt(0);
  } catch (error) {
    console.error('Error checking DID registration:', error);
    return false;
  }
}

// ============================================
// HELPER FUNCTION: Extract address from DID
// ============================================
function extractAddressFromDID(did) {
  // Format: did:ethr:VoltusWave:0xABC...
  const parts = did.split(':');
  if (parts.length >= 4) {
    return parts[3]; // Return the address part
  }
  // Fallback for did:ethr:0xABC...
  if (parts.length === 3) {
    return parts[2];
  }
  throw new Error('Invalid DID format');
}

// Create DID
router.post('/create-did', async (req, res) => {
  try {
    const result = await didService.createDID();
    res.json({ success: true, did: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve DID
router.get('/resolve-did/:did', async (req, res) => {
  try {
    const doc = await didService.resolveDID(req.params.did);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue & store VC
router.post('/store-vc', async (req, res) => {
  try {
    const { issuerDID, subjectDID, credentialData } = req.body;

    if (!issuerDID || !subjectDID || !credentialData) {
      return res.status(400).json({
        error: 'Missing required fields: issuerDID, subjectDID, credentialData'
      });
    }

    // ✅ FIX: Validate issuer DID is registered
    const issuerAddress = extractAddressFromDID(issuerDID);
    const issuerRegistered = await isDIDRegistered(issuerAddress);
    
    if (!issuerRegistered) {
      return res.status(403).json({
        error: 'Issuer DID is not registered on blockchain. Please register your DID first.',
        issuerDID: issuerDID
      });
    }

    // ✅ FIX: Validate subject DID is registered
    const subjectAddress = extractAddressFromDID(subjectDID);
    const subjectRegistered = await isDIDRegistered(subjectAddress);
    
    if (!subjectRegistered) {
      return res.status(403).json({
        error: 'Subject DID is not registered on blockchain. Please register your DID first.',
        subjectDID: subjectDID
      });
    }

    const vc = await vcService.issueCredential(issuerDID, subjectDID, credentialData);
    res.json(vc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List VCs
router.get('/list-vc', (req, res) => {
  res.json(vcService.listCredentials());
});

// Create VP
router.post('/create-vp', async (req, res) => {
  try {
    const { holderDID, credentials, challenge } = req.body;

    if (!holderDID || !credentials || !Array.isArray(credentials)) {
      return res.status(400).json({
        error: 'Missing required fields: holderDID, credentials (array of credential objects)'
      });
    }

    // ✅ FIX: Validate holder DID is registered
    const holderAddress = extractAddressFromDID(holderDID);
    const holderRegistered = await isDIDRegistered(holderAddress);
    
    if (!holderRegistered) {
      return res.status(403).json({
        error: 'Holder DID is not registered on blockchain. Cannot create presentation.',
        holderDID: holderDID
      });
    }

    const ethersSigner = await blockchainService.getSigner();
    const privateKey = ethersSigner.privateKey.slice(2);
    const signer = require('did-jwt').ES256KSigner(Buffer.from(privateKey, 'hex'), true);

    const vpPayload = {
      vp: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: credentials.map(c => c.jwt)
      }
    };

    if (challenge) {
      vpPayload.nonce = challenge;
    }

    const holder = {
      did: holderDID,
      signer: signer,
      alg: 'ES256K-R'
    };

    const { createVerifiablePresentationJwt } = require('did-jwt-vc');
    const vpJwt = await createVerifiablePresentationJwt(vpPayload, holder);

    res.json({ vpJwt });
  } catch (err) {
    console.error('Error in createPresentation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify VC
router.post('/verify-vc', async (req, res) => {
  try {
    const { jwt } = req.body;

    if (!jwt) {
      return res.status(400).json({ error: 'Missing required field: jwt' });
    }

    const result = await vcService.verifyCredential(jwt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify VP
router.post('/verify-vp', async (req, res) => {
  console.log('=== /verify-vp endpoint called ===');

  try {
    const { vpJwt, challenge } = req.body;

    console.log('Request body:', {
      vpJwt: vpJwt ? `${vpJwt.substring(0, 50)}...` : 'undefined',
      challenge: challenge
    });

    if (!vpJwt) {
      console.log('Error: Missing vpJwt');
      return res.status(400).json({ error: 'Missing required field: vpJwt' });
    }

    console.log('Calling vcService.verifyPresentation...');

    try {
      const result = await vcService.verifyPresentation(vpJwt, challenge);
      console.log('Verification successful:', result);
      res.json(result);
    } catch (serviceError) {
      console.error('Service error:', serviceError.message);
      console.error('Stack:', serviceError.stack);

      res.status(400).json({
        error: serviceError.message,
        verified: false
      });
    }

  } catch (err) {
    console.error('Route handler error:', err.message);
    console.error('Stack:', err.stack);

    res.status(500).json({
      error: 'Internal server error: ' + err.message,
      verified: false
    });
  }
});

// Register DID on blockchain (backend pays gas, user proves ownership)
router.post('/register-on-chain', async (req, res) => {
  try {
    const { did, publicKey, address, signature, message } = req.body;

    if (!did || !publicKey || !address || !signature || !message) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    console.log('📥 Registration request received');
    console.log('   DID:', did);
    console.log('   Address:', address);
    console.log('   Public Key:', publicKey);

    // ✅ CHECK: DID already registered?
    const alreadyRegistered = await isDIDRegistered(address);
    if (alreadyRegistered) {
      return res.status(409).json({
        error: 'DID is already registered on blockchain',
        address: address,
        did: did
      });
    }

    // Verify signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    const registry = await blockchainService.getRegistry();

    const attributeName = ethers.utils.formatBytes32String('did/pub/Secp256k1/veriKey');

    // Remove 0x prefix if present and convert to bytes
    const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    const attributeValue = '0x' + cleanPublicKey;

    console.log('📝 Submitting transaction to blockchain...');
    console.log('   Attribute name:', attributeName);
    console.log('   Attribute value length:', attributeValue.length);

    const tx = await registry.setAttribute(
      address,
      attributeName,
      attributeValue,
      86400 * 365,
      {
        gasLimit: 200000
      }
    );

    console.log('⏳ Waiting for confirmation...');
    console.log('   TX Hash:', tx.hash);

    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);

    res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      message: 'DID registered on blockchain successfully'
    });

  } catch (err) {
    console.error('❌ Registration failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Check if DID is registered on blockchain
router.get('/check-registration/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    const registry = await blockchainService.getRegistry();
    const lastChanged = await registry.changed(address);

    if (lastChanged.gt(0)) {
      res.json({
        registered: true,
        blockNumber: lastChanged.toString(),
        address
      });
    } else {
      res.json({
        registered: false,
        address
      });
    }

  } catch (err) {
    console.error('Check registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Issue credential to holder (called after QR scan)
router.post('/issue-to-holder', async (req, res) => {
  try {
    const { holderDID, credentialData } = req.body;

    if (!holderDID || !credentialData) {
      return res.status(400).json({
        error: 'Missing required fields: holderDID, credentialData'
      });
    }

    console.log('📜 Issuing credential to holder');
    console.log('   Holder DID:', holderDID);
    console.log('   Credential Type:', credentialData.credentialType);

    // ✅ FIX: Validate holder DID is registered
    const holderAddress = extractAddressFromDID(holderDID);
    const holderRegistered = await isDIDRegistered(holderAddress);
    
    if (!holderRegistered) {
      return res.status(403).json({
        error: 'Holder DID is not registered on blockchain. Please register your DID first.',
        holderDID: holderDID,
        hint: 'Open your wallet and create your identity first'
      });
    }

    // Get backend signer (issuer)
    const ethersSigner = await blockchainService.getSigner();
    const issuerAddress = await ethersSigner.getAddress();
    const issuerDID = `did:ethr:VoltusWave:${issuerAddress.toLowerCase()}`;

    console.log('   Issuer DID:', issuerDID);

    // Create credential signed by backend (issuer)
    const privateKey = ethersSigner.privateKey.slice(2);
    const { ES256KSigner } = require('did-jwt');
    const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));

    const vcPayload = {
      sub: holderDID,
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        credentialSubject: credentialData
      }
    };

    const issuer = {
      did: issuerDID,
      signer: signer,
      alg: 'ES256K'
    };

    const { createVerifiableCredentialJwt } = require('did-jwt-vc');
    const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

    console.log('✅ Credential issued successfully');

    const credential = {
      id: Date.now().toString(),
      issuer: issuerDID,
      subject: holderDID,
      data: credentialData,
      jwt: jwt,
      issuedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      credential: credential,
      message: 'Credential issued successfully'
    });

  } catch (err) {
    console.error('❌ Failed to issue credential:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get issuer info
router.get('/issuer-info', async (req, res) => {
  try {
    const ethersSigner = await blockchainService.getSigner();
    const issuerAddress = await ethersSigner.getAddress();
    const issuerDID = `did:ethr:VoltusWave:${issuerAddress.toLowerCase()}`;

    res.json({
      did: issuerDID,
      address: issuerAddress,
      name: 'VoltusWave Credential Issuer',
      type: 'Trusted Authority'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 1: Store claim token
router.post('/store-claim-token', async (req, res) => {
  try {
    const { claimToken } = req.body;

    if (!claimToken || !claimToken.id) {
      return res.status(400).json({ error: 'Invalid claim token' });
    }

    // Store token with metadata
    claimTokens.set(claimToken.id, {
      ...claimToken,
      createdAt: Date.now(),
      used: false
    });

    console.log('✅ Claim token stored:', claimToken.id);
    console.log('   Expires at:', new Date(claimToken.expiresAt).toISOString());
    console.log('   Total active tokens:', claimTokens.size);

    res.json({
      success: true,
      tokenId: claimToken.id,
      expiresAt: claimToken.expiresAt
    });
  } catch (err) {
    console.error('❌ Failed to store claim token:', err);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 2: Claim credential (SECURE)
router.post('/claim-credential', async (req, res) => {
  try {
    const { claimToken, holderDID } = req.body;

    if (!claimToken || !holderDID) {
      return res.status(400).json({
        error: 'Missing required fields: claimToken, holderDID'
      });
    }

    console.log('📥 Claim request received');
    console.log('   Token ID:', claimToken.id);
    console.log('   Holder DID:', holderDID);

    // ✅ FIX: FIRST CHECK - Holder DID must be registered
    const holderAddress = extractAddressFromDID(holderDID);
    const holderRegistered = await isDIDRegistered(holderAddress);
    
    if (!holderRegistered) {
      return res.status(403).json({
        error: 'Your DID is not registered on blockchain. Please create your identity first.',
        holderDID: holderDID,
        hint: 'Go to Home screen and click "Create Your Identity"'
      });
    }

    // SECURITY: Verify claim token exists
    if (!claimTokens.has(claimToken.id)) {
      console.log('❌ Invalid or already used token');
      return res.status(400).json({
        error: 'Invalid or already used claim token'
      });
    }

    const storedToken = claimTokens.get(claimToken.id);

    // SECURITY: Check expiration
    if (Date.now() > storedToken.expiresAt) {
      claimTokens.delete(claimToken.id);
      console.log('❌ Claim token expired');
      return res.status(400).json({
        error: 'Claim token has expired. Please request a new one.'
      });
    }

    // SECURITY: Verify nonce (prevent tampering)
    if (storedToken.nonce !== claimToken.nonce) {
      console.log('❌ Token tampering detected');
      return res.status(400).json({
        error: 'Token validation failed'
      });
    }

    // SECURITY: Verify DID matches (if pre-registered)
    if (storedToken.requiredDID && storedToken.requiredDID !== holderDID) {
      console.log('❌ DID mismatch');
      console.log('   Expected:', storedToken.requiredDID);
      console.log('   Received:', holderDID);
      return res.status(403).json({
        error: 'This credential is intended for a different DID'
      });
    }

    // SECURITY: Delete token (single-use)
    claimTokens.delete(claimToken.id);
    console.log('✅ Token validated and consumed');

    // Issue credential
    console.log('📜 Issuing credential to verified holder');

    const ethersSigner = await blockchainService.getSigner();
    const issuerAddress = await ethersSigner.getAddress();
    const issuerDID = `did:ethr:VoltusWave:${issuerAddress.toLowerCase()}`;

    const privateKey = ethersSigner.privateKey.slice(2);
    const { ES256KSigner } = require('did-jwt');
    const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));

    const vcPayload = {
      sub: holderDID,
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        credentialSubject: claimToken.credentialData
      }
    };

    const issuer = {
      did: issuerDID,
      signer: signer,
      alg: 'ES256K'
    };

    const { createVerifiableCredentialJwt } = require('did-jwt-vc');
    const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

    console.log('✅ Credential issued successfully');

    const credential = {
      id: Date.now().toString(),
      issuer: issuerDID,
      subject: holderDID,
      data: claimToken.credentialData,
      jwt: jwt,
      issuedAt: new Date().toISOString(),
      claimedBy: holderDID,
      claimTokenId: claimToken.id
    };

    res.json({
      success: true,
      credential: credential,
      message: 'Credential issued successfully'
    });

  } catch (err) {
    console.error('❌ Failed to claim credential:', err);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 3: Check token status
router.get('/claim-status/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    if (claimTokens.has(tokenId)) {
      const token = claimTokens.get(tokenId);
      const isExpired = Date.now() > token.expiresAt;

      res.json({
        exists: true,
        expired: isExpired,
        expiresAt: token.expiresAt,
        used: token.used
      });
    } else {
      res.json({
        exists: false,
        message: 'Token not found or already used'
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 4: Revoke claim token
router.delete('/revoke-claim-token/:tokenId', async (req, res) => {
  try {
    const { tokenId} = req.params;

    if (claimTokens.has(tokenId)) {
      claimTokens.delete(tokenId);
      console.log('🗑️ Token revoked:', tokenId);
      res.json({ success: true, message: 'Token revoked' });
    } else {
      res.json({ success: false, message: 'Token not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;