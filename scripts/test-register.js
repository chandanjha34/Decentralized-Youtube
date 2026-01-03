const hre = require("hardhat");

async function main() {
  const contractAddress = "0xA8621c45bfe3A4f163b17Ba509735118fbC7610e";
  
  console.log("Testing registerContent on:", contractAddress);
  
  const AccessRegistry = await hre.ethers.getContractAt("AccessRegistry", contractAddress);
  
  // Test data
  const metadataCID = "QmTestMetadata" + Date.now();
  const contentCID = "QmTestContent" + Date.now();
  const priceUSDC = 100000n; // $0.10
  
  console.log("Calling registerContent...");
  console.log("  metadataCID:", metadataCID);
  console.log("  contentCID:", contentCID);
  console.log("  priceUSDC:", priceUSDC.toString());
  
  try {
    const tx = await AccessRegistry.registerContent(metadataCID, contentCID, priceUSDC);
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Get the content ID from the event
    const event = receipt.logs.find(log => {
      try {
        const parsed = AccessRegistry.interface.parseLog(log);
        return parsed?.name === 'ContentRegistered';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = AccessRegistry.interface.parseLog(event);
      console.log("Content registered with ID:", parsed.args.contentId);
    }
    
    // Verify by reading back
    const allContentIds = await AccessRegistry.getAllContentIds();
    console.log("Total content count:", allContentIds.length);
    
    console.log("\n✅ Contract is working correctly!");
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main().catch(console.error);
