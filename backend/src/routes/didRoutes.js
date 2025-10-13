const express = require('express');
const router = express.Router();
const didService = require('../services/didService');
const vcService = require('../services/vcService');
const blockchainService = require('../services/blockchainService');
const { ethers } = require('ethers');
const { Buffer } = require('buffer');

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
// router.post('/create-vp', async (req, res) => {
//   try {
//     const { holderDID, credentialIds, challenge } = req.body;
    
//     if (!holderDID || !credentialIds || !Array.isArray(credentialIds)) {
//       return res.status(400).json({ 
//         error: 'Missing required fields: holderDID, credentialIds (array)' 
//       });
//     }
    
//     const vp = await vcService.createPresentation(holderDID, credentialIds, challenge);
//     res.json(vp);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
// Create VP - accepts full credentials instead of IDs
// router.post('/create-vp', async (req, res) => {
//   try {
//     const { holderDID, credentials, challenge } = req.body;
    
//     if (!holderDID || !credentials || !Array.isArray(credentials)) {
//       return res.status(400).json({ 
//         error: 'Missing required fields: holderDID, credentials (array of credential objects)' 
//       });
//     }

//     // Get the ethers signer
//     const ethersSigner = await blockchainService.getSigner();
//     const privateKey = ethersSigner.privateKey.slice(2);
//     const signer = require('did-jwt').ES256KSigner(Buffer.from(privateKey, 'hex'));

//     // Build VP payload with the provided credentials
//     const vpPayload = {
//       vp: {
//         "@context": ["https://www.w3.org/2018/credentials/v1"],
//         type: ["VerifiablePresentation"],
//         verifiableCredential: credentials.map(c => c.jwt) // Use JWT from each credential
//       }
//     };

//     // Add challenge/nonce if provided
//     if (challenge) {
//       vpPayload.nonce = challenge;
//     }

//     // Create holder object
//     const holder = {
//       did: holderDID,
//       signer: signer,
//       alg: 'ES256K'
//     };

//     const { createVerifiablePresentationJwt } = require('did-jwt-vc');
//     const vpJwt = await createVerifiablePresentationJwt(vpPayload, holder);

//     res.json({ vpJwt });
//   } catch (err) {
//     console.error('Error in createPresentation:', err);
//     res.status(500).json({ error: err.message });
//   }
// });
router.post('/create-vp', async (req, res) => {
  try {
    const { holderDID, credentials, challenge } = req.body;
    
    if (!holderDID || !credentials || !Array.isArray(credentials)) {
      return res.status(400).json({ 
        error: 'Missing required fields: holderDID, credentials (array of credential objects)' 
      });
    }

    const ethersSigner = await blockchainService.getSigner();
    const privateKey = ethersSigner.privateKey.slice(2);
    
    // ✅ Use ES256K-R for signature recovery
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
      alg: 'ES256K-R' // ← Change from ES256K to ES256K-R
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
// router.post('/verify-vp', async (req, res) => {
//   try {
//     const { vpJwt, challenge } = req.body;
    
//     if (!vpJwt) {
//       return res.status(400).json({ error: 'Missing required field: vpJwt' });
//     }
    
//     const result = await vcService.verifyPresentation(vpJwt, challenge);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Verify VP with comprehensive error handling
router.post('/verify-vp', async (req, res) => {
  console.log('=== /verify-vp endpoint called ===');
  
  try {
    const { vpJwt, challenge } = req.body;
    
    console.log('Request body:', { 
      vpJwt: vpJwt ? `${vpJwt.substring(0, 50)}...` : 'undefined',
      challenge: challenge 
    });
    
    // Validate input
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
      
      // Return error as JSON, not throw
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

// ------------
// Register DID from mobile wallet (client-side key generation)
// Register DID from mobile wallet (client-side key generation)
//7th oct
// router.post('/register', async (req, res) => {
//   try {
//     const { did, publicKey, address } = req.body;

//     if (!did || !publicKey || !address) {
//       return res.status(400).json({ 
//         error: 'Missing required fields: did, publicKey, address' 
//       });
//     }

//     // Register on blockchain
//     const registry = await blockchainService.getRegistry();
    
//     const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
//     const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(publicKey));
    
//     const tx = await registry.setAttribute(
//       address,
//       attributeName,
//       attributeValue,
//       86400 * 365 // 1 year validity
//     );
    
//     await tx.wait();

//     res.json({
//       success: true,
//       did,
//       address,
//       txHash: tx.hash,
//       message: 'DID registered on blockchain'
//     });
//   } catch (err) {
//     console.error('Register error:', err);
//     res.status(500).json({ error: err.message });
//   }
// });
//_____________

// router.post('/register', async (req, res) => {
//   try {
//     const { did, publicKey, address } = req.body;

//     if (!did || !publicKey || !address) {
//       return res.status(400).json({ 
//         error: 'Missing required fields: did, publicKey, address' 
//       });
//     }

//     // Extract address from DID if needed
//     const identityAddress = did.split(':').pop();

//     // Register on blockchain
//     const registry = await blockchainService.getRegistry();
    
//     const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
//     const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(publicKey));
    
//     const tx = await registry.setAttribute(
//       identityAddress, // Use extracted address
//       attributeName,
//       attributeValue,
//       86400 * 365 // 1 year validity
//     );
    
//     await tx.wait();

//     res.json({
//       success: true,
//       did,
//       address: identityAddress,
//       txHash: tx.hash,
//       message: 'DID registered on blockchain'
//     });
//   } catch (err) {
//     console.error('Register error:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// Register DID from mobile wallet (client-side key generation)
// router.post('/register', async (req, res) => {
//   try {
//     const { did, publicKey, address } = req.body;

//     if (!did || !publicKey || !address) {
//       return res.status(400).json({ 
//         error: 'Missing required fields: did, publicKey, address' 
//       });
//     }

//     // Register on blockchain
//     const registry = await blockchainService.getRegistry();
    
//     // For ethers v5
//     const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
//     const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(publicKey));
    
//     const tx = await registry.setAttribute(
//       address, // Use the address directly, not the full DID
//       attributeName,
//       attributeValue,
//       86400 * 365 // 1 year validity
//     );
    
//     await tx.wait();

//     res.json({
//       success: true,
//       did,
//       address,
//       txHash: tx.hash,
//       message: 'DID registered on blockchain'
//     });
//   } catch (err) {
//     console.error('Register error:', err);
//     res.status(500).json({ error: err.message });
//   }
// });



// Register DID on blockchain (backend pays gas, user proves ownership)
// router.post('/register-on-chain', async (req, res) => {
//   try {
//     const { did, publicKey, address, signature, message } = req.body;

//     if (!did || !publicKey || !address || !signature || !message) {
//       return res.status(400).json({ 
//         error: 'Missing required fields' 
//       });
//     }

//     console.log('📥 Registration request received');
//     console.log('   DID:', did);
//     console.log('   Address:', address);

//     // Verify signature to prove user owns the private key
//     const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
//     if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
//       console.log('❌ Signature verification failed');
//       console.log('   Expected:', address);
//       console.log('   Recovered:', recoveredAddress);
//       return res.status(401).json({ error: 'Invalid signature' });
//     }

//     console.log('✅ Signature verified');

//     // Get registry contract
//     const registry = await blockchainService.getRegistry();
    
//     // Prepare attribute data
//     const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
//     const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(publicKey));
    
//     console.log('📝 Submitting transaction to blockchain...');
    
//     // Backend submits transaction (backend pays gas)
//     const tx = await registry.setAttribute(
//       address,
//       attributeName,
//       attributeValue,
//       86400 * 365,
//       {
//         gasLimit: 200000
//       }
//     );
    
//     console.log('⏳ Waiting for confirmation...');
//     console.log('   TX Hash:', tx.hash);
    
//     // Wait for confirmation
//     const receipt = await tx.wait();
    
//     console.log('✅ Transaction confirmed!');
//     console.log('   Block:', receipt.blockNumber);

//     res.json({
//       success: true,
//       txHash: receipt.transactionHash,
//       blockNumber: receipt.blockNumber,
//       message: 'DID registered on blockchain'
//     });

//   } catch (err) {
//     console.error('❌ Registration failed:', err.message);
//     res.status(500).json({ error: err.message });
//   }
// });
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

    // Verify signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    const registry = await blockchainService.getRegistry();
    
    // ✅ FIX: Store the public key in the correct format
    const attributeName = ethers.utils.formatBytes32String('did/pub/Secp256k1/veriKey');
    
    // Remove 0x prefix if present and convert to bytes
    const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    
    // The public key should be stored as raw bytes, not as a UTF-8 string
    const attributeValue = '0x' + cleanPublicKey;
    
    console.log('📝 Submitting transaction to blockchain...');
    console.log('   Attribute name:', attributeName);
    console.log('   Attribute value length:', attributeValue.length);
    
    const tx = await registry.setAttribute(
      address,
      attributeName,
      attributeValue,  // Raw bytes, not UTF-8 encoded
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



module.exports = router;