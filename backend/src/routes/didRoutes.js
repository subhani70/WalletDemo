const express = require('express');
const router = express.Router();
const didService = require('../services/didService');
const vcService = require('../services/vcService');

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
router.post('/create-vp', async (req, res) => {
  try {
    const { holderDID, credentialIds, challenge } = req.body;
    
    if (!holderDID || !credentialIds || !Array.isArray(credentialIds)) {
      return res.status(400).json({ 
        error: 'Missing required fields: holderDID, credentialIds (array)' 
      });
    }
    
    const vp = await vcService.createPresentation(holderDID, credentialIds, challenge);
    res.json(vp);
  } catch (err) {
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

module.exports = router;