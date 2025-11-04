require('dotenv').config();

module.exports = {
  port: process.env.PORT,
  rpcUrl: process.env.RPC_URL,
  chainId: parseInt(process.env.CHAIN_ID),
  registryAddress: process.env.REGISTRY_ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
  networkName: 'VoltusWave'
};