const hre = require("hardhat");

async function main() {
  const contractAddress = "0xA8621c45bfe3A4f163b17Ba509735118fbC7610e";
  
  const AccessRegistry = await hre.ethers.getContractAt("AccessRegistry", contractAddress);
  
  // Get all content IDs
  const allContentIds = await AccessRegistry.getAllContentIds();
  console.log("Total content count:", allContentIds.length);
  console.log("\nContent IDs:");
  
  for (const contentId of allContentIds) {
    const content = await AccessRegistry.getContent(contentId);
    console.log("\n---");
    console.log("Content ID:", contentId);
    console.log("Creator:", content.creator);
    console.log("Metadata CID:", content.metadataCID);
    console.log("Content CID:", content.contentCID);
    console.log("Price:", content.priceUSDC.toString(), "($" + (Number(content.priceUSDC) / 1e6).toFixed(2) + ")");
    console.log("Active:", content.active);
  }
}

main().catch(console.error);
