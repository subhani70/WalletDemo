const express = require('express');
const router = express.Router();
const didService = require('../services/didService');
const vcService = require('../services/vcService');
const blockchainService = require('../services/blockchainService');
const { ethers } = require('ethers');

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
router.post('/create-vp', async (req, res) => {
  try {
    const { holderDID, credentials, challenge } = req.body;
    
    if (!holderDID || !credentials || !Array.isArray(credentials)) {
      return res.status(400).json({ 
        error: 'Missing required fields: holderDID, credentials (array of credential objects)' 
      });
    }

    // Get the ethers signer
    const ethersSigner = await blockchainService.getSigner();
    const privateKey = ethersSigner.privateKey.slice(2);
    const signer = require('did-jwt').ES256KSigner(Buffer.from(privateKey, 'hex'));

    // Build VP payload with the provided credentials
    const vpPayload = {
      vp: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: credentials.map(c => c.jwt) // Use JWT from each credential
      }
    };

    // Add challenge/nonce if provided
    if (challenge) {
      vpPayload.nonce = challenge;
    }

    // Create holder object
    const holder = {
      did: holderDID,
      signer: signer,
      alg: 'ES256K'
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
router.post('/register', async (req, res) => {
  try {
    const { did, publicKey, address } = req.body;

    if (!did || !publicKey || !address) {
      return res.status(400).json({ 
        error: 'Missing required fields: did, publicKey, address' 
      });
    }

    // Register on blockchain
    const registry = await blockchainService.getRegistry();
    
    // For ethers v5
    const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
    const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(publicKey));
    
    const tx = await registry.setAttribute(
      address, // Use the address directly, not the full DID
      attributeName,
      attributeValue,
      86400 * 365 // 1 year validity
    );
    
    await tx.wait();

    res.json({
      success: true,
      did,
      address,
      txHash: tx.hash,
      message: 'DID registered on blockchain'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;