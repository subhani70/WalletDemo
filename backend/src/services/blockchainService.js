const { ethers } = require('ethers');
const config = require('../config/config');

class BlockchainService {
  constructor() {
    // For ethers v5, use providers.JsonRpcProvider
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    
    // EthrDIDRegistry ABI (minimal required functions)
    this.registryABI = [
      "event DIDOwnerChanged(address indexed identity, address owner, uint previousChange)",
      "event DIDAttributeChanged(address indexed identity, bytes32 name, bytes value, uint validTo, uint previousChange)",
      "function identityOwner(address identity) view returns (address)",
      "function changeOwner(address identity, address newOwner)",
      "function setAttribute(address identity, bytes32 name, bytes value, uint validity)",
      "function revokeAttribute(address identity, bytes32 name, bytes value)"
    ];
    
    this.registry = new ethers.Contract(
      config.registryAddress,
      this.registryABI,
      this.signer
    );
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
}

module.exports = new BlockchainService();