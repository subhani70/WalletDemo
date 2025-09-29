require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID) || 1337,
  registryAddress: process.env.REGISTRY_ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
  networkName: 'development'
};