/**
 * Test script for x402 payment flow
 * 
 * This script tests the key components of the x402 payment system:
 * 1. Environment configuration
 * 2. Contract connectivity
 * 3. IPFS gateway accessibility
 * 4. x402 facilitator connectivity
 */

require('dotenv').config();
const { createPublicClient, http, parseAbi } = require('viem');
const { polygonAmoy } = require('viem/chains');

// Configuration
const ACCESS_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS;
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const X402_FACILITATOR_URL = 'https://x402.org/facilitator';

const accessRegistryAbi = parseAbi([
  'function getContent(bytes32 contentId) view returns ((address creator, string metadataCID, string contentCID, uint256 priceUSDC, uint256 createdAt, bool active))',
]);

async function testEnvironmentConfig() {
  console.log('🔧 Testing Environment Configuration...');
  
  const requiredVars = [
    'NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS',
    'DEPLOYER_PRIVATE_KEY',
    'POLYGON_AMOY_RPC_URL'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  console.log(`   - Contract Address: ${ACCESS_REGISTRY_ADDRESS}`);
  console.log(`   - RPC URL: ${POLYGON_AMOY_RPC_URL}`);
  return true;
}

async function testContractConnectivity() {
  console.log('\n🔗 Testing Contract Connectivity...');
  
  try {
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(POLYGON_AMOY_RPC_URL),
    });
    
    // Test basic connectivity
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Connected to Polygon Amoy - Block: ${blockNumber}`);
    
    // Test contract interaction (this will fail if no content exists, but that's ok)
    try {
      const testContentId = '0x' + '1'.repeat(64);
      await publicClient.readContract({
        address: ACCESS_REGISTRY_ADDRESS,
        abi: accessRegistryAbi,
        functionName: 'getContent',
        args: [testContentId],
      });
      console.log('✅ Contract is accessible');
    } catch (contractError) {
      if (contractError.message.includes('execution reverted')) {
        console.log('✅ Contract is accessible (test content not found - expected)');
      } else {
        console.error('❌ Contract error:', contractError.message);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Contract connectivity failed:', error.message);
    return false;
  }
}

async function testIPFSGateways() {
  console.log('\n📦 Testing IPFS Gateway Connectivity...');
  
  const gateways = [
    'https://dweb.link/ipfs',
    'https://gateway.pinata.cloud/ipfs',
    'https://ipfs.io/ipfs'
  ];
  
  // Test with a known IPFS hash (IPFS logo)
  const testCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  
  let workingGateways = 0;
  
  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${gateway}/${testCID}`, {
        signal: controller.signal,
        method: 'HEAD', // Just check if accessible
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ ${gateway} - Working`);
        workingGateways++;
      } else {
        console.log(`⚠️  ${gateway} - HTTP ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⚠️  ${gateway} - Timeout`);
      } else {
        console.log(`⚠️  ${gateway} - Error: ${error.message}`);
      }
    }
  }
  
  if (workingGateways > 0) {
    console.log(`✅ ${workingGateways}/${gateways.length} IPFS gateways working`);
    return true;
  } else {
    console.error('❌ No IPFS gateways accessible');
    return false;
  }
}

async function testX402Facilitator() {
  console.log('\n💳 Testing x402 Facilitator Connectivity...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Test basic connectivity (this will likely return an error, but we just want to check if it's reachable)
    const response = await fetch(`${X402_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Any response (even error) means the service is reachable
    console.log(`✅ x402 Facilitator reachable - HTTP ${response.status}`);
    return true;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ x402 Facilitator timeout');
    } else {
      console.error('❌ x402 Facilitator error:', error.message);
    }
    return false;
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting x402 Payment System Diagnostics\n');
  
  const tests = [
    testEnvironmentConfig,
    testContractConnectivity,
    testIPFSGateways,
    testX402Facilitator,
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) passed++;
  }
  
  console.log(`\n📊 Diagnostics Complete: ${passed}/${tests.length} tests passed`);
  
  if (passed === tests.length) {
    console.log('🎉 All systems operational! x402 payments should work.');
  } else {
    console.log('⚠️  Some issues detected. Check the failures above.');
  }
  
  return passed === tests.length;
}

// Run diagnostics if called directly
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics };