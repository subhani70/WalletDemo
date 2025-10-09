const { v4: uuidv4 } = require('uuid');
const { createVerifiableCredentialJwt, createVerifiablePresentationJwt, verifyCredential, verifyPresentation } = require('did-jwt-vc');
const didService = require('./didService');
const blockchainService = require('./blockchainService');
const { ethers } = require('ethers');
const { ES256KSigner } = require('did-jwt');

class VCService {
  constructor() {
    this.credentials = []; // in-memory store
  }

  // async issueCredential(issuerDID, subjectDID, credentialData) {
  //   try {
  //     // Get the ethers signer
  //     const ethersSigner = await blockchainService.getSigner();
      
  //     // Get the private key from the signer
  //     const privateKey = ethersSigner.privateKey.slice(2); // Remove '0x' prefix
      
  //     // Create a proper signer for did-jwt
  //     const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));

  //     // Build credential object
  //     const vcPayload = {
  //       sub: subjectDID,
  //       nbf: Math.floor(Date.now() / 1000),
  //       vc: {
  //         "@context": ["https://www.w3.org/2018/credentials/v1"],
  //         type: ["VerifiableCredential"],
  //         credentialSubject: credentialData
  //       }
  //     };

  //     // Create issuer object
  //     const issuer = {
  //       did: issuerDID,
  //       signer: signer,
  //       alg: 'ES256K'
  //     };

  //     // Sign with issuer's DID
  //     const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

  //     const credential = {
  //       id: uuidv4(),
  //       issuer: issuerDID,
  //       subject: subjectDID,
  //       data: credentialData,
  //       jwt,
  //       createdAt: new Date().toISOString()
  //     };

  //     this.credentials.push(credential);
  //     return credential;
  //   } catch (error) {
  //     console.error('Error in issueCredential:', error);
  //     throw new Error(`Failed to issue credential: ${error.message}`);
  //   }
  // }
  async issueCredential(issuerDID, subjectDID, credentialData) {
  try {
    const ethersSigner = await blockchainService.getSigner();
    const privateKey = ethersSigner.privateKey.slice(2);
    
    // ✅ Use ES256K-R for signature recovery support
    const signer = ES256KSigner(Buffer.from(privateKey, 'hex'), true); // ← Add 'true' for recoverable

    const vcPayload = {
      sub: subjectDID,
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
      alg: 'ES256K-R' // ← Change from ES256K to ES256K-R
    };

    const jwt = await createVerifiableCredentialJwt(vcPayload, issuer);

    const credential = {
      id: uuidv4(),
      issuer: issuerDID,
      subject: subjectDID,
      data: credentialData,
      jwt,
      createdAt: new Date().toISOString()
    };

    this.credentials.push(credential);
    return credential;
  } catch (error) {
    console.error('Error in issueCredential:', error);
    throw new Error(`Failed to issue credential: ${error.message}`);
  }
}


  listCredentials() {
    return this.credentials;
  }

  async createPresentation(holderDID, credentialIds, challenge) {
    try {
      // Get the ethers signer
      const ethersSigner = await blockchainService.getSigner();
      
      // Get the private key from the signer
      const privateKey = ethersSigner.privateKey.slice(2); // Remove '0x' prefix
      
      // Create a proper signer for did-jwt
      const signer = ES256KSigner(Buffer.from(privateKey, 'hex'));
      
      const selectedCreds = this.credentials.filter(c => credentialIds.includes(c.id));
      
      if (selectedCreds.length === 0) {
        throw new Error('No credentials found with provided IDs');
      }

      const vpPayload = {
        vp: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: selectedCreds.map(c => c.jwt)
        }
      };

      // Add challenge/nonce proof
      if (challenge) {
        vpPayload.nonce = challenge;
      }

      // Create holder object
      const holder = {
        did: holderDID,
        signer: signer,
        alg: 'ES256K-R'
      };

      const vpJwt = await createVerifiablePresentationJwt(vpPayload, holder);

      return { vpJwt };
    } catch (error) {
      console.error('Error in createPresentation:', error);
      throw new Error(`Failed to create presentation: ${error.message}`);
    }
  }

  async verifyCredential(jwt) {
    try {
      const resolver = await didService.getResolver();
      return await verifyCredential(jwt, resolver);
    } catch (err) {
      throw new Error("Credential verification failed: " + err.message);
    }
  }

  // async verifyPresentation(vpJwt, challenge) {
  //   try {
  //     const resolver = await didService.getResolver();
  //     const options = challenge ? { challenge } : {};
  //     const result = await verifyPresentation(vpJwt, resolver, options);
  //     return result;
  //   } catch (err) {
  //     throw new Error("Presentation verification failed: " + err.message);
  //   }
  // }

//   async verifyPresentation(vpJwt, challenge) {
//   console.log('=== vcService.verifyPresentation called ===');
  
//   try {
//     if (!vpJwt) {
//       throw new Error('VP JWT is required');
//     }
    
//     console.log('Getting resolver...');
//     const resolver = await didService.getResolver();
    
//     console.log('Setting up options...');
//     const options = {};
//     if (challenge !== undefined && challenge !== null && challenge !== '') {
//       options.challenge = challenge;
//       console.log('Using challenge:', challenge);
//     } else {
//       console.log('No challenge provided');
//     }
    
//     console.log('Calling did-jwt-vc verifyPresentation...');
//     const result = await verifyPresentation(vpJwt, resolver, options);
    
//     console.log('Verification complete. Verified:', result.verified);
//     return result;
    
//   } catch (err) {
//     console.error('=== verifyPresentation error ===');
//     console.error('Error name:', err.name);
//     console.error('Error message:', err.message);
//     console.error('Error stack:', err.stack);
    
//     // Don't throw, return error result
//     return {
//       verified: false,
//       error: err.message
//     };
//   }
// }
// In vcService.verifyPresentation
async verifyPresentation(vpJwt, challenge) {
  console.log('=== Verifying Presentation ===');
  
  try {
    // Decode JWT to see the payload
    const decoded = require('did-jwt').decodeJWT(vpJwt);
    console.log('VP Issuer:', decoded.payload.iss);
    console.log('VP Subject:', decoded.payload.sub);
    
    const resolver = await didService.getResolver();
    
    // Try to resolve the issuer DID
    console.log('Resolving issuer DID...');
    const issuerDoc = await resolver.resolve(decoded.payload.iss);
    console.log('Issuer resolved:', issuerDoc.didDocument ? 'Yes' : 'No');
    
    const options = challenge ? { challenge } : {};
    const result = await verifyPresentation(vpJwt, resolver, options);
    
    console.log('Verification result:', result);
    return result;
    
  } catch (err) {
    console.error('Verification error:', err);
    return {
      verified: false,
      error: err.message
    };
  }
}
}


module.exports = new VCService();