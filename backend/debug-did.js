// ============================================
// DEBUG SCRIPT - See exactly what's happening
// ============================================

// Create: backend/debug-did.js

const { ethers } = require('ethers');
const { Resolver } = require('did-resolver');
const { getResolver } = require('ethr-did-resolver');
require('dotenv').config();

const config = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  registryAddress: process.env.REGISTRY_ADDRESS,
  networkName: 'VoltusWave',
  chainId: 1337
};

async function debugDID() {
  console.log('\n=== DID Resolution Debug ===\n');
  
  const testDID = 'did:ethr:VoltusWave:0xc51dc99dfe6075fcee8b1c83f7d9d16f7ceb1426';
  const testAddress = '0xc51dc99dfe6075fcee8b1c83f7d9d16f7ceb1426';
  
  console.log('Testing DID:', testDID);
  console.log('Address:', testAddress);
  console.log('Registry:', config.registryAddress);
  console.log('RPC:', config.rpcUrl);
  console.log('\n');
  
  // ===== 1. Check blockchain data =====
  console.log('1️⃣ Checking blockchain data...\n');
  
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  
  const registryABI = [
    "function changed(address identity) view returns (uint)",
    "event DIDAttributeChanged(address indexed identity, bytes32 name, bytes value, uint validTo, uint previousChange)"
  ];
  
  const registry = new ethers.Contract(
    config.registryAddress,
    registryABI,
    provider
  );
  
  // Check if anything is on-chain
  const changed = await registry.changed(testAddress);
  console.log('Changed block:', changed.toString());
  
  if (changed.gt(0)) {
    console.log('✅ DID has on-chain data');
    
    // Get all attribute events
    const filter = registry.filters.DIDAttributeChanged(testAddress);
    const events = await registry.queryFilter(filter);
    
    console.log('\nEvents found:', events.length);
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`\nEvent ${i + 1}:`);
      console.log('  Name (bytes32):', event.args.name);
      console.log('  Name (string):', ethers.utils.parseBytes32String(event.args.name));
      console.log('  Value (hex):', event.args.value);
      console.log('  Value length:', event.args.value.length);
      console.log('  Valid until:', new Date(event.args.validTo.toNumber() * 1000).toISOString());
      console.log('  Block:', event.blockNumber);
    }
  } else {
    console.log('ℹ️ No on-chain data (will use implicit DID)');
  }
  
  // ===== 2. Test DID resolution =====
  console.log('\n\n2️⃣ Testing DID resolution...\n');
  
  const ethrDidResolver = getResolver({
    networks: [{
      name: config.networkName,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      registry: config.registryAddress
    }]
  });
  
  const resolver = new Resolver(ethrDidResolver);
  
  try {
    const result = await resolver.resolve(testDID);
    
    console.log('✅ DID resolved successfully\n');
    console.log('DID Document:');
    console.log(JSON.stringify(result.didDocument, null, 2));
    
    console.log('\n\nVerification Methods:');
    if (result.didDocument.verificationMethod) {
      result.didDocument.verificationMethod.forEach((vm, i) => {
        console.log(`\n${i + 1}. ${vm.id}`);
        console.log('   Type:', vm.type);
        console.log('   Controller:', vm.controller);
        if (vm.publicKeyHex) {
          console.log('   Public Key (hex):', vm.publicKeyHex);
          console.log('   Public Key length:', vm.publicKeyHex.length);
        }
        if (vm.blockchainAccountId) {
          console.log('   Blockchain Account:', vm.blockchainAccountId);
        }
      });
    }
    
    console.log('\n\nAuthentication methods:', result.didDocument.authentication);
    console.log('Assertion methods:', result.didDocument.assertionMethod);
    
  } catch (error) {
    console.error('❌ Resolution failed:', error.message);
    console.error(error);
  }
  
  // ===== 3. Test JWT creation and verification =====
  console.log('\n\n3️⃣ Testing JWT signature format...\n');
  
  // Simulate what the mobile app does
  const testPrivateKey = '0x' + '1'.repeat(64); // Dummy key for testing
  const testWallet = new ethers.Wallet(testPrivateKey);
  
  console.log('Test wallet address:', testWallet.address);
  console.log('Test public key:', testWallet.publicKey);
  console.log('Public key length:', testWallet.publicKey.length);
  
  // Check if public key format matches
  const storedPublicKey = '0x04ad10543320f10438cb6a4b7a92f7c2290efb725d90b62b7a0407267dabd85175d2224e8af4afaa373f8ed48b7c0829e362b9fe9a4ead701000d072c3fc0d7e65';
  console.log('\nStored public key:', storedPublicKey);
  console.log('Stored key length:', storedPublicKey.length);
  
  // Expected format for did-jwt
  console.log('\nExpected format: 0x04 + 64 bytes = 132 chars (uncompressed)');
  console.log('Or: 0x02/0x03 + 32 bytes = 68 chars (compressed)');
  
  // ===== 4. Show the problem =====
  console.log('\n\n4️⃣ Analysis:\n');
  
  if (changed.gt(0)) {
    console.log('The resolver IS finding on-chain data,');
    console.log('but the public key format doesn\'t match what did-jwt expects.');
    console.log('\nThe issue is likely:');
    console.log('1. Public key stored as hex string (0x04...)');
    console.log('2. But did-jwt expects it in publicKeyHex or publicKeyBase58');
    console.log('3. The attribute name might also be wrong');
    console.log('\nCorrect attribute name should be:');
    console.log('  did/pub/Secp256k1/veriKey (capital S in Secp256k1)');
    console.log('  did/pub/Secp256k1/sigAuth');
    console.log('  or just use implicit resolution (no attribute needed)');
  }
}

// Run the debug
debugDID().then(() => {
  console.log('\n=== Debug Complete ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Debug failed:', err);
  process.exit(1);
});

// ============================================
// RUN THIS SCRIPT
// ============================================

/*
1. Save as: backend/debug-did.js

2. Run:
   cd backend
   node debug-did.js

3. This will show you EXACTLY what's on-chain and what the resolver sees

4. Based on the output, we can fix the issue
*/