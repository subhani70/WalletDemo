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
      return res.status(400).json({
        error: 'Missing required fields: claimToken, holderDID'
      });
    }

    console.log('📥 Claim request received');
    console.log('   Token ID:', claimToken.id);
    console.log('   Holder DID:', holderDID);
    console.log('   Student ID:', claimToken.studentId);

    // ✅ CHECK 1: Has this student already claimed?
    if (issuedCredentials.has(claimToken.studentId)) {
      const issued = issuedCredentials.get(claimToken.studentId);
      console.log('❌ Student already has credential');
      return res.status(409).json({
        error: 'You have already claimed this credential.',
        claimedAt: issued.claimedAt,
        claimedBy: issued.claimedBy
      });
    }

    // CHECK 2: Holder DID registered?
    const holderAddress = extractAddressFromDID(holderDID);
    const holderRegistered = await isDIDRegistered(holderAddress);
    
    if (!holderRegistered) {
      return res.status(403).json({
        error: 'Your DID is not registered on blockchain. Please create your identity first.'
      });
    }

    // CHECK 3: Token exists?
    if (!claimTokens.has(claimToken.id)) {
      console.log('❌ Invalid or already used token');
      return res.status(400).json({
        error: 'Invalid or already used claim token'
      });
    }

    const storedToken = claimTokens.get(claimToken.id);

    // CHECK 4: Expired?
    if (Date.now() > storedToken.expiresAt) {
      claimTokens.delete(claimToken.id);
      console.log('❌ Claim token expired');
      return res.status(400).json({
        error: 'Claim token has expired. Please request a new one.'
      });
    }

    // CHECK 5: Nonce matches?
    if (storedToken.nonce !== claimToken.nonce) {
      console.log('❌ Token tampering detected');
      return res.status(400).json({
        error: 'Token validation failed'
      });
    }

    // CHECK 6: DID matches?
    if (storedToken.requiredDID && storedToken.requiredDID !== holderDID) {
      console.log('❌ DID mismatch');
      return res.status(403).json({
        error: 'This credential is intended for a different DID'
      });
    }

    // ✅ ALL CHECKS PASSED - Issue credential
    claimTokens.delete(claimToken.id);
    console.log('✅ Token validated and consumed');

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

    console.log('✅ Credential issued and marked as claimed');
    console.log(`   Student: ${claimToken.studentName} (${claimToken.studentId})`);
    console.log(`   Claimed by: ${holderDID}`);

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