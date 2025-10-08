const { EthrDID } = require('ethr-did');
const { Resolver } = require('did-resolver');
const { getResolver } = require('ethr-did-resolver');
const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');
const config = require('../config/config');

class DIDService {
  constructor() {
    this.initializeResolver();
  }

  initializeResolver() {
    const ethrDidResolver = getResolver({
      networks: [{
        name: config.networkName,
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        registry: config.registryAddress
      }]
    });

    this.resolver = new Resolver(ethrDidResolver);
  }

  // async createEthrDidObject(identifier) {
  //   const signer = await blockchainService.getSigner();
  //   const address = identifier || await signer.getAddress();

  //   return new EthrDID({
  //     identifier: address,
  //     provider: signer.provider,
  //     signer: signer,
  //     chainNameOrId: config.chainId,
  //     registry: config.registryAddress
  //   });
  // }

  async createEthrDidObject(identifier) {
  const signer = await blockchainService.getSigner();
  const address = identifier || await signer.getAddress();

  return new EthrDID({
    identifier: address,
    provider: signer.provider,
    signer: signer,
    chainNameOrId: config.chainId,
    registry: config.registryAddress,
    alg: 'ES256K-R' // Add this line to fix the warning
  });
}

  // async createDID() {
  //   try {
  //     const signer = await blockchainService.getSigner();
  //     const address = await signer.getAddress();
      
  //     const ethrDid = new EthrDID({
  //       identifier: address,
  //       provider: signer.provider,
  //       signer: signer,
  //       chainNameOrId: config.chainId,
  //       registry: config.registryAddress
  //     });

  //     // Create DID document
  //     const did = `did:ethr:${config.networkName}:${address}`;
      
  //     // Set a public key attribute on-chain (optional but recommended)
  //     const registry = await blockchainService.getRegistry();
      
  //     // For ethers v5
  //     const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
  //     const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(address));
      
  //     const tx = await registry.setAttribute(
  //       address,
  //       attributeName,
  //       attributeValue,
  //       86400 * 365 // 1 year validity
  //     );
      
  //     await tx.wait();

  //     return {
  //       did,
  //       address,
  //       txHash: tx.hash,
  //       controller: address,
  //       publicKey: address
  //     };
  //   } catch (error) {
  //     throw new Error(`Failed to create DID: ${error.message}`);
  //   }
  // }

  async createDID() {
  try {
    const signer = await blockchainService.getSigner();
    const address = await signer.getAddress();

    const ethrDid = new EthrDID({
      identifier: address,
      provider: signer.provider,
      signer: signer,
      chainNameOrId: config.chainId,
      registry: config.registryAddress
    });

    // Create DID with network name
    const did = `did:ethr:${config.networkName}:${address}`; // ← Add network name
    
    const registry = await blockchainService.getRegistry();
    const attributeName = ethers.utils.formatBytes32String('did/pub/secp256k1/veriKey');
    const attributeValue = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(address));
    
    const tx = await registry.setAttribute(
      address,
      attributeName,
      attributeValue,
      86400 * 365
    );
    
    await tx.wait();

    return {
      did,
      address,
      txHash: tx.hash,
      controller: address,
      publicKey: address
    };
  } catch (error) {
    throw new Error(`Failed to create DID: ${error.message}`);
  }
}

  // async resolveDID(did) {
  //   try {
  //     const didDocument = await this.resolver.resolve(did);
  //     return didDocument;
  //   } catch (error) {
  //     throw new Error(`Failed to resolve DID: ${error.message}`);
  //   }
  // }

  // In backend didService.js
async resolveDID(did) {
  try {
    // Handle both formats
    if (!did.includes(config.networkName)) {
      // Convert did:ethr:0x... to did:ethr:VoltusWave:0x...
      const parts = did.split(':');
      if (parts.length === 3) {
        did = `${parts[0]}:${parts[1]}:${config.networkName}:${parts[2]}`;
      }
    }
    const didDocument = await this.resolver.resolve(did);
    return didDocument;
  } catch (error) {
    throw new Error(`Failed to resolve DID: ${error.message}`);
  }
}

  async updateDIDAttribute(did, attributeName, attributeValue, validity = 86400 * 365) {
    try {
      const address = did.split(':').pop();
      const registry = await blockchainService.getRegistry();
      
      const tx = await registry.setAttribute(
        address,
        ethers.utils.formatBytes32String(attributeName),
        ethers.utils.toUtf8Bytes(attributeValue),
        validity
      );
      
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      throw new Error(`Failed to update DID attribute: ${error.message}`);
    }
  }

  async getResolver() {
    return this.resolver;
  }
}

module.exports = new DIDService();