// backend/routes/didRoutes.js
// FIXED: Auto-mark as issued and prevent duplicate claims

const express = require('express');
const router = express.Router();
const didService = require('../services/didService');
const vcService = require('../services/vcService');
const blockchainService = require('../services/blockchainService');
const { ethers } = require('ethers');
const { Buffer } = require('buffer');

// In-memory storage for claim tokens
const claimTokens = new Map();

// ✅ NEW: Store issued credentials to track duplicates
const issuedCredentials = new Map(); // studentId -> { credential, claimedAt, claimedBy }

// Clean up expired tokens every minute
setInterval(() => {
  const now = Date.now();
  
  // Clean expired tokens
  for (const [tokenId, token] of claimTokens.entries()) {
    if (token.expiresAt < now) {
      claimTokens.delete(tokenId);
      console.log(`🗑️ Expired claim token: ${tokenId}`);
    }
  }
  
  // Clean old issued credentials (keep for 24 hours for audit)
  for (const [studentId, issued] of issuedCredentials.entries()) {
    if (now - issued.claimedAt > 86400000) { // 24 hours
      issuedCredentials.delete(studentId);
      console.log(`🗑️ Cleaned old issued record: ${studentId}`);
    }
  }
}, 60000);

// Helper function: Check if DID is registered
async function isDIDRegistered(address) {
  try {
    const registry = await blockchainService.getRegistry();
    const lastChanged = await registry.changed(address);
    return lastChanged.gt(0);
  } catch (error) {
    console.error('Error checking DID registration:', error);
    return false;
  }
}

// Helper function: Extract address from DID
function extractAddressFromDID(did) {
  const parts = did.split(':');
  if (parts.length >= 4) {
    return parts[3];
  }
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

    const issuerAddress = extractAddressFromDID(issuerDID);
    const issuerRegistered = await isDIDRegistered(issuerAddress);
    
    if (!issuerRegistered) {
      return res.status(403).json({
        error: 'Issuer DID is not registered on blockchain.'
      });
    }

    const subjectAddress = extractAddressFromDID(subjectDID);
    const subjectRegistered = await isDIDRegistered(subjectAddress);
    
    if (!subjectRegistered) {
      return res.status(403).json({
        error: 'Subject DID is not registered on blockchain.'
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
        error: 'Missing required fields'
      });
    }

    const holderAddress = extractAddressFromDID(holderDID);
    const holderRegistered = await isDIDRegistered(holderAddress);
    
    if (!holderRegistered) {
      return res.status(403).json({
        error: 'Holder DID is not registered on blockchain.'
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

    if (!vpJwt) {
      return res.status(400).json({ error: 'Missing required field: vpJwt' });
    }

    try {
      const result = await vcService.verifyPresentation(vpJwt, challenge);
      res.json(result);
    } catch (serviceError) {
      res.status(400).json({
        error: serviceError.message,
        verified: false
      });
    }

  } catch (err) {
    res.status(500).json({
      error: 'Internal server error: ' + err.message,
      verified: false
    });
  }
});

// Register DID on blockchain
router.post('/register-on-chain', async (req, res) => {
  try {
    const { did, publicKey, address, signature, message } = req.body;

    if (!did || !publicKey || !address || !signature || !message) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    console.log('📥 Registration request received');

    const alreadyRegistered = await isDIDRegistered(address);
    if (alreadyRegistered) {
      return res.status(409).json({
        error: 'DID is already registered on blockchain',
        address: address,
        did: did
      });
    }

    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    const registry = await blockchainService.getRegistry();
    const attributeName = ethers.utils.formatBytes32String('did/pub/Secp256k1/veriKey');
    const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    const attributeValue = '0x' + cleanPublicKey;

    const tx = await registry.setAttribute(
      address,
      attributeName,
      attributeValue,
      86400 * 365,
      {
        gasLimit: 200000
      }
    );

    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed!');

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

    // ✅ CHECK: Has this student already claimed a credential?
    const studentId = claimToken.studentId;
    if (issuedCredentials.has(studentId)) {
      const issued = issuedCredentials.get(studentId);
      return res.status(409).json({
        error: 'Credential already issued to this student',
        studentId: studentId,
        issuedAt: issued.claimedAt,
        claimedBy: issued.claimedBy
      });
    }

    // Store token with metadata
    claimTokens.set(claimToken.id, {
      ...claimToken,
      createdAt: Date.now(),
      used: false
    });

    console.log('✅ Claim token stored:', claimToken.id);
    console.log('   Student ID:', studentId);
    console.log('   Expires at:', new Date(claimToken.expiresAt).toISOString());

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

// ENDPOINT 2: Claim credential (SECURE + AUTO-MARK)
router.post('/claim-credential', async (req, res) => {
  try {
    const { claimToken, holderDID } = req.body;

    if (!claimToken || !holderDID) {
      console.error('[CLAIM-CREDENTIAL] Missing required fields', {
        hasClaimToken: !!claimToken,
        hasHolderDID: !!holderDID,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both claimToken and holderDID are required.',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    console.log('[CLAIM-CREDENTIAL] Claim request received', {
      tokenId: claimToken.id,
      holderDID: holderDID,
      studentId: claimToken.studentId,
      timestamp: new Date().toISOString()
    });

    // ✅ CHECK 1: Has this student already claimed?
    if (issuedCredentials.has(claimToken.studentId)) {
      const issued = issuedCredentials.get(claimToken.studentId);
      console.warn('[CLAIM-CREDENTIAL] Student already has credential', {
        studentId: claimToken.studentId,
        studentName: claimToken.studentName,
        previouslyClaimedAt: issued.claimedAt,
        previouslyClaimedBy: issued.claimedBy,
        timestamp: new Date().toISOString()
      });
      return res.status(409).json({
        success: false,
        error: 'Credential already claimed',
        message: 'You have already claimed this credential.',
        code: 'CREDENTIAL_ALREADY_CLAIMED',
        claimedAt: issued.claimedAt,
        claimedBy: issued.claimedBy
      });
    }

    // CHECK 2: Holder DID registered?
    let holderAddress;
    try {
      holderAddress = extractAddressFromDID(holderDID);
      console.log('[CLAIM-CREDENTIAL] Checking holder DID registration', {
        holderDID: holderDID,
        holderAddress: holderAddress,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[CLAIM-CREDENTIAL] Invalid holder DID format', {
        holderDID: holderDID,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid holder DID format',
        message: 'The holder DID has an invalid format.',
        code: 'INVALID_HOLDER_DID_FORMAT'
      });
    }

    const holderRegistered = await isDIDRegistered(holderAddress);
    
    if (!holderRegistered) {
      console.error('[CLAIM-CREDENTIAL] Holder DID not registered on blockchain', {
        holderDID: holderDID,
        holderAddress: holderAddress,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        success: false,
        error: 'Holder DID not registered',
        message: 'Your DID is not registered on blockchain. Please create your identity first.',
        code: 'HOLDER_DID_NOT_REGISTERED'
      });
    }

    console.log('[CLAIM-CREDENTIAL] Holder DID validated and registered', {
      holderDID: holderDID,
      holderAddress: holderAddress,
      timestamp: new Date().toISOString()
    });

    // CHECK 3: Token exists?
    if (!claimTokens.has(claimToken.id)) {
      console.error('[CLAIM-CREDENTIAL] Invalid or already used token', {
        tokenId: claimToken.id,
        studentId: claimToken.studentId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid or already used claim token',
        message: 'The claim token is invalid or has already been used.',
        code: 'INVALID_OR_USED_TOKEN'
      });
    }

    const storedToken = claimTokens.get(claimToken.id);

    // CHECK 4: Expired?
    if (Date.now() > storedToken.expiresAt) {
      claimTokens.delete(claimToken.id);
      console.error('[CLAIM-CREDENTIAL] Claim token expired', {
        tokenId: claimToken.id,
        expiresAt: storedToken.expiresAt,
        currentTime: Date.now(),
        studentId: claimToken.studentId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Claim token expired',
        message: 'The claim token has expired. Please request a new one.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // CHECK 5: Nonce matches?
    if (storedToken.nonce !== claimToken.nonce) {
      console.error('[CLAIM-CREDENTIAL] Token tampering detected', {
        tokenId: claimToken.id,
        expectedNonce: storedToken.nonce,
        receivedNonce: claimToken.nonce,
        studentId: claimToken.studentId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Token validation failed',
        message: 'Token validation failed. The token may have been tampered with.',
        code: 'TOKEN_VALIDATION_FAILED'
      });
    }

    // CHECK 6: DID matches?
    if (storedToken.requiredDID && storedToken.requiredDID !== holderDID) {
      console.error('[CLAIM-CREDENTIAL] DID mismatch', {
        tokenId: claimToken.id,
        requiredDID: storedToken.requiredDID,
        providedDID: holderDID,
        studentId: claimToken.studentId,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        success: false,
        error: 'DID mismatch',
        message: 'This credential is intended for a different DID.',
        code: 'DID_MISMATCH',
        requiredDID: storedToken.requiredDID
      });
    }

    // ✅ ALL CHECKS PASSED - Issue credential
    claimTokens.delete(claimToken.id);
    console.log('[CLAIM-CREDENTIAL] Token validated and consumed', {
      tokenId: claimToken.id,
      studentId: claimToken.studentId,
      timestamp: new Date().toISOString()
    });

    // ✅ REQUIRED: Issuer DID must be present in claimToken (from university frontend/QR token)
    const issuerDID = storedToken.issuerDID || claimToken.issuerDID;
    
    if (!issuerDID) {
      console.error('[CLAIM-CREDENTIAL] Missing issuer DID in claim token', {
        tokenId: claimToken.id,
        studentId: claimToken.studentId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Issuer DID is required in claim token',
        message: 'The claim token must include the issuer DID from the university. Please contact the credential issuer.',
        code: 'MISSING_ISSUER_DID',
        tokenId: claimToken.id
      });
    }

    console.log('[CLAIM-CREDENTIAL] Issuer DID extracted from claim token', {
      issuerDID: issuerDID,
      tokenId: claimToken.id,
      timestamp: new Date().toISOString()
    });
    
    // Validate that issuer DID is registered on blockchain
    let issuerAddress;
    try {
      issuerAddress = extractAddressFromDID(issuerDID);
      console.log('[CLAIM-CREDENTIAL] Extracted issuer address', {
        issuerDID: issuerDID,
        issuerAddress: issuerAddress,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[CLAIM-CREDENTIAL] Invalid issuer DID format', {
        issuerDID: issuerDID,
        error: error.message,
        tokenId: claimToken.id,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid issuer DID format',
        message: 'The issuer DID in the claim token has an invalid format.',
        code: 'INVALID_ISSUER_DID_FORMAT',
        issuerDID: issuerDID
      });
    }

    console.log('[CLAIM-CREDENTIAL] Checking issuer DID registration on blockchain', {
      issuerDID: issuerDID,
      issuerAddress: issuerAddress,
      timestamp: new Date().toISOString()
    });

    const issuerRegistered = await isDIDRegistered(issuerAddress);
    
    if (!issuerRegistered) {
      console.error('[CLAIM-CREDENTIAL] Issuer DID not registered on blockchain', {
        issuerDID: issuerDID,
        issuerAddress: issuerAddress,
        tokenId: claimToken.id,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Issuer DID not registered on blockchain',
        message: 'The issuer DID from the claim token is not registered on the blockchain. The credential cannot be issued.',
        code: 'ISSUER_DID_NOT_REGISTERED',
        issuerDID: issuerDID
      });
    }

    console.log('[CLAIM-CREDENTIAL] Issuer DID validated and registered', {
      issuerDID: issuerDID,
      issuerAddress: issuerAddress,
      timestamp: new Date().toISOString()
    });

    // Get signer - using backend signer
    // Note: If issuerDID is from university, you may need their private key or delegation
    const ethersSigner = await blockchainService.getSigner();
    const privateKey = ethersSigner.privateKey.slice(2);
    const { ES256KSigner } = require('did-jwt');
    const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));
    
    console.log('[CLAIM-CREDENTIAL] Preparing credential payload', {
      issuerDID: issuerDID,
      subjectDID: holderDID,
      timestamp: new Date().toISOString()
    });

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
    
    console.log('[CLAIM-CREDENTIAL] Creating verifiable credential JWT', {
      issuerDID: issuerDID,
      subjectDID: holderDID,
      timestamp: new Date().toISOString()
    });

    let jwt;
    try {
      jwt = await createVerifiableCredentialJwt(vcPayload, issuer);
      console.log('[CLAIM-CREDENTIAL] Verifiable credential JWT created successfully', {
        issuerDID: issuerDID,
        subjectDID: holderDID,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[CLAIM-CREDENTIAL] Failed to create verifiable credential JWT', {
        issuerDID: issuerDID,
        subjectDID: holderDID,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create verifiable credential',
        message: 'An error occurred while creating the credential. Please try again or contact support.',
        code: 'CREDENTIAL_CREATION_FAILED'
      });
    }

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

    // ✅ MARK AS ISSUED - Store in issued credentials map
    issuedCredentials.set(claimToken.studentId, {
      credential: credential,
      claimedAt: Date.now(),
      claimedBy: holderDID,
      studentId: claimToken.studentId,
      studentName: claimToken.studentName
    });

    console.log('[CLAIM-CREDENTIAL] Credential issued and marked as claimed', {
      credentialId: credential.id,
      issuerDID: issuerDID,
      subjectDID: holderDID,
      studentId: claimToken.studentId,
      studentName: claimToken.studentName,
      claimedBy: holderDID,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      credential: credential,
      message: 'Credential issued successfully'
    });

  } catch (err) {
    console.error('[CLAIM-CREDENTIAL] Unexpected error during credential claim', {
      error: err.message,
      stack: err.stack,
      tokenId: claimToken?.id,
      studentId: claimToken?.studentId,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your credential claim. Please try again or contact support.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// ✅ NEW ENDPOINT: Check if student already has credential
router.get('/check-issued/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    if (issuedCredentials.has(studentId)) {
      const issued = issuedCredentials.get(studentId);
      res.json({
        issued: true,
        claimedAt: issued.claimedAt,
        claimedBy: issued.claimedBy,
        studentName: issued.studentName
      });
    } else {
      res.json({
        issued: false
      });
    }
  } catch (err) {
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
        used: token.used,
        studentId: token.studentId
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
    const { tokenId } = req.params;

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