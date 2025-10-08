// const { ethers } = require('ethers');
// const config = require('../config/config');

// class BlockchainService {
//   constructor() {
//     // For ethers v5, use providers.JsonRpcProvider
//     this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
//     this.signer = new ethers.Wallet(config.privateKey, this.provider);

//     // EthrDIDRegistry ABI (minimal required functions)
//     this.registryABI = [
//       "event DIDOwnerChanged(address indexed identity, address owner, uint previousChange)",
//       "event DIDAttributeChanged(address indexed identity, bytes32 name, bytes value, uint validTo, uint previousChange)",
//       "function identityOwner(address identity) view returns (address)",
//       "function changeOwner(address identity, address newOwner)",
//       "function setAttribute(address identity, bytes32 name, bytes value, uint validity)",
//       "function revokeAttribute(address identity, bytes32 name, bytes value)"
//     ];

//     this.registry = new ethers.Contract(
//       config.registryAddress,
//       this.registryABI,
//       this.signer
//     );
//   }

//   async getProvider() {
//     return this.provider;
//   }

//   async getSigner() {
//     return this.signer;
//   }

//   async getRegistry() {
//     return this.registry;
//   }

//   async getNetworkInfo() {
//     const network = await this.provider.getNetwork();
//     return {
//       chainId: Number(network.chainId),
//       name: config.networkName,
//       rpcUrl: config.rpcUrl,
//       registryAddress: config.registryAddress
//     };
//   }
// }

// module.exports = new BlockchainService();/

// backend/services/blockchainService.js
// REPLACE THE ENTIRE FILE WITH THIS:

const { ethers } = require('ethers');
const config = require('../config/config');

class BlockchainService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);

    // ✅ COMPLETE ABI - includes ALL functions the DID resolver needs
    this.registryABI = [
      // ===== VIEW FUNCTIONS (Read-only) =====
      // These are what the DID resolver calls during verification
      "function identityOwner(address identity) view returns (address)",
      "function changed(address identity) view returns (uint)",  // ← THIS WAS MISSING!
      "function nonce(address identity) view returns (uint)",
      "function delegates(address identity, bytes32 delegateType, address delegate) view returns (uint)",
      "function validDelegate(address identity, bytes32 delegateType, address delegate) view returns (bool)",

      // ===== WRITE FUNCTIONS =====
      // These modify the blockchain
      "function changeOwner(address identity, address newOwner)",
      "function setAttribute(address identity, bytes32 name, bytes value, uint validity)",
      "function revokeAttribute(address identity, bytes32 name, bytes value)",
      "function addDelegate(address identity, bytes32 delegateType, address delegate, uint validity)",
      "function revokeDelegate(address identity, bytes32 delegateType, address delegate)",

      // ===== EVENTS =====
      "event DIDOwnerChanged(address indexed identity, address owner, uint previousChange)",
      "event DIDAttributeChanged(address indexed identity, bytes32 name, bytes value, uint validTo, uint previousChange)",
      "event DIDDelegateChanged(address indexed identity, bytes32 delegateType, address delegate, uint validTo, uint previousChange)"
    ];

    
    this.registry = new ethers.Contract(
      config.registryAddress,
      this.registryABI,
      this.signer
    );

    console.log('✅ BlockchainService initialized');
    console.log('📡 Provider:', config.rpcUrl);
    console.log('📄 Registry:', config.registryAddress);
  }

  async getProvider() {
    return this.provider;
  }

  async getSigner() {
    return this.signer;
  }

  async getRegistry() {
    return this.registry;
  }

  async getNetworkInfo() {
    const network = await this.provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: config.networkName,
      rpcUrl: config.rpcUrl,
      registryAddress: config.registryAddress
    };
  }

  // ===== TEST FUNCTION =====
  // Call this to verify the contract is working
  async testRegistryConnection() {
    try {
      const testAddress = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";

      // Test changed() - this is what was failing before
      const changed = await this.registry.changed(testAddress);
      console.log('✅ changed() works:', changed.toString());

      // Test identityOwner()
      const owner = await this.registry.identityOwner(testAddress);
      console.log('✅ identityOwner() works:', owner);

      return { success: true, changed: changed.toString(), owner };
    } catch (error) {
      console.error('❌ Registry test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BlockchainService();