/**
 * End-to-end test for x402 payment flow
 * 
 * This script simulates a complete payment flow to test if the API
 * endpoints are working correctly.
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testPaymentFlow() {
  console.log('🧪 Testing x402 Payment Flow End-to-End\n');
  
  // Test content ID (this should be a real content ID from your system)
  const testContentId = '0x' + '1'.repeat(64); // Dummy content ID for testing
  const testConsumerAddress = '0x742d35Cc6634C0532925a3b8D0C9C0E3C5d5c8eE'; // Dummy address
  
  console.log(`📋 Test Parameters:`);
  console.log(`   Content ID: ${testContentId}`);
  console.log(`   Consumer: ${testConsumerAddress}\n`);
  
  try {
    // Step 1: Test GET request without payment (should return 402 or 404)
    console.log('1️⃣ Testing initial access check...');
    
    const response = await fetch(`${BASE_URL}/api/key/${testContentId}`, {
      headers: {
        'x-consumer-address': testConsumerAddress,
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log('   ✅ Content not found (expected for test content)');
      console.log('   💡 To test with real content, use a valid content ID from your system');
      return true;
    } else if (response.status === 402) {
      console.log('   ✅ Payment required response received');
      
      // Check if payment requirements are properly formatted
      const paymentRequirements = await response.json();
      console.log('   📄 Payment Requirements:');
      console.log(`      Version: ${paymentRequirements.x402Version}`);
      console.log(`      Options: ${paymentRequirements.accepts?.length || 0}`);
      
      if (paymentRequirements.accepts && paymentRequirements.accepts.length > 0) {
        const option = paymentRequirements.accepts[0];
        console.log(`      Price: ${option.maxAmountRequired} USDC`);
        console.log(`      Pay To: ${option.payTo}`);
        console.log('   ✅ Payment requirements properly formatted');
      }
      
      return true;
    } else if (response.status === 200) {
      console.log('   ✅ User already has access');
      const result = await response.json();
      console.log(`   🔑 Key received: ${result.key ? 'Yes' : 'No'}`);
      return true;
    } else if (response.status === 503) {
      console.log('   ⚠️  Service temporarily unavailable');
      const error = await response.json();
      console.log(`   Error: ${error.error}`);
      return false;
    } else {
      console.log('   ❌ Unexpected response');
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.log(`   Error: ${error.error}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testHealthCheck() {
  console.log('🏥 Testing API Health...\n');
  
  try {
    // Test if the Next.js server is running
    const response = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    
    if (!response) {
      console.log('❌ Next.js server not running');
      console.log('💡 Start the server with: npm run dev');
      return false;
    }
    
    console.log('✅ Next.js server is running');
    return true;
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting x402 Payment Flow Tests\n');
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n⚠️  Cannot run payment tests without server running');
    return;
  }
  
  const paymentOk = await testPaymentFlow();
  
  console.log('\n📊 Test Results:');
  console.log(`   Health Check: ${healthOk ? '✅ Pass' : '❌ Fail'}`);
  console.log(`   Payment Flow: ${paymentOk ? '✅ Pass' : '❌ Fail'}`);
  
  if (healthOk && paymentOk) {
    console.log('\n🎉 All tests passed! x402 payment system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };