/**
 * Demo Setup Verification Script
 * 
 * Run with: npx hardhat run scripts/check-demo-setup.js --network polygonAmoy
 * 
 * This script checks:
 * 1. Contract deployment status
 * 2. Registered content count
 * 3. Recent content registrations
 */

const hre = require("hardhat");
const addresses = require("../src/lib/contracts/addresses.json");

async function main() {
  console.log("\n🔍 Demo Setup Verification\n");
  console.log("=".repeat(50));
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  console.log(`\n📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (Number(network.chainId) !== 80002) {
    console.log("⚠️  Warning: Not on Polygon Amoy (expected chain ID 80002)");
  }
  
  // Check contract
  console.log(`\n📜 AccessRegistry: ${addresses.AccessRegistry}`);
  
  const AccessRegistry = await hre.ethers.getContractAt(
    "AccessRegistry",
    addresses.AccessRegistry
  );
  
  // Check facilitator
  const facilitator = await AccessRegistry.facilitator();
  console.log(`🔑 Facilitator: ${facilitator}`);
  
  // Check owner
  const owner = await AccessRegistry.owner();
  console.log(`👤 Owner: ${owner}`);
  
  // Get content registration events
  console.log("\n📦 Checking registered content...\n");
  
  const filter = AccessRegistry.filters.ContentRegistered();
  const events = await AccessRegistry.queryFilter(filter);
  
  console.log(`Total content items registered: ${events.length}`);
  
  if (events.length > 0) {
    console.log("\n📋 Recent Content:\n");
    
    // Show last 5 content items
    const recentEvents = events.slice(-5);
    
    for (const event of recentEvents) {
      const contentId = event.args.contentId;
      const creator = event.args.creator;
      const metadataCID = event.args.metadataCID;
      const priceUSDC = event.args.priceUSDC;
      
      console.log(`  Content ID: ${contentId.slice(0, 18)}...`);
      console.log(`  Creator: ${creator}`);
      console.log(`  Metadata CID: ${metadataCID.slice(0, 20)}...`);
      console.log(`  Price: $${Number(priceUSDC) / 1e6} USDC`);
      console.log("");
    }
  } else {
    console.log("\n⚠️  No content registered yet. Upload some demo content!");
  }
  
  // Check access grants
  console.log("🎫 Checking access grants...\n");
  
  const accessFilter = AccessRegistry.filters.AccessGranted();
  const accessEvents = await AccessRegistry.queryFilter(accessFilter);
  
  console.log(`Total access grants: ${accessEvents.length}`);
  
  if (accessEvents.length > 0) {
    console.log("\n📋 Recent Access Grants:\n");
    
    const recentAccess = accessEvents.slice(-5);
    
    for (const event of recentAccess) {
      const contentId = event.args.contentId;
      const consumer = event.args.consumer;
      
      console.log(`  Content: ${contentId.slice(0, 18)}...`);
      console.log(`  Consumer: ${consumer}`);
      console.log("");
    }
  }
  
  // Summary
  console.log("=".repeat(50));
  console.log("\n✅ Demo Setup Summary:\n");
  console.log(`  • Contract deployed: ✓`);
  console.log(`  • Content items: ${events.length}`);
  console.log(`  • Access grants: ${accessEvents.length}`);
  
  if (events.length < 3) {
    console.log(`\n⚠️  Recommendation: Upload at least 3 content items for demo`);
  }
  
  console.log("\n🚀 Ready for demo!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
