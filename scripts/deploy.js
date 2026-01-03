const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("AccessRegistry Deployment");
  console.log("=".repeat(60));
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "POL");
  
  if (balance === 0n) {
    console.error("\n❌ Error: Deployer account has no funds!");
    console.error("Get testnet POL from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  // For MVP, use deployer as facilitator (can be updated later)
  let facilitatorAddress = process.env.FACILITATOR_ADDRESS;
  // If not set or invalid, use deployer address
  if (!facilitatorAddress || !facilitatorAddress.startsWith("0x") || facilitatorAddress.length !== 42) {
    facilitatorAddress = deployer.address;
  }
  console.log("Facilitator address:", facilitatorAddress);
  console.log("-".repeat(60));

  // Deploy AccessRegistry
  console.log("\n📦 Deploying AccessRegistry...");
  const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
  const accessRegistry = await AccessRegistry.deploy(facilitatorAddress);
  await accessRegistry.waitForDeployment();

  const contractAddress = await accessRegistry.getAddress();
  console.log("✅ AccessRegistry deployed to:", contractAddress);

  // Export ABI and address for frontend
  const contractsDir = path.join(__dirname, "..", "src", "lib", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Write contract address
  const addresses = {
    AccessRegistry: contractAddress,
    chainId: 80002,
    network: "polygonAmoy",
    deployedAt: new Date().toISOString(),
    facilitator: facilitatorAddress,
  };
  
  fs.writeFileSync(
    path.join(contractsDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  // Copy ABI from artifacts
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "AccessRegistry.sol", "AccessRegistry.json");
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(contractsDir, "AccessRegistryABI.json"),
      JSON.stringify(artifact.abi, null, 2)
    );
  }

  console.log("\n📁 Contract artifacts exported to src/lib/contracts/");
  console.log("-".repeat(60));
  console.log("\n🔧 Add this to your .env file:");
  console.log(`NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS=${contractAddress}`);
  console.log("-".repeat(60));

  // Verify on Polygonscan (if API key is set)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\n⏳ Waiting for block confirmations...");
    await accessRegistry.deploymentTransaction()?.wait(5);
    
    console.log("🔍 Verifying contract on Polygonscan...");
    try {
      const { run } = require("hardhat");
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [facilitatorAddress],
      });
      console.log("✅ Contract verified on Polygonscan!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Contract already verified!");
      } else {
        console.error("⚠️ Verification failed:", error.message);
        console.log("You can verify manually at: https://amoy.polygonscan.com/verifyContract");
      }
    }
  } else {
    console.log("\n⚠️ POLYGONSCAN_API_KEY not set - skipping verification");
    console.log("To verify later, run:");
    console.log(`npx hardhat verify --network polygonAmoy ${contractAddress} ${facilitatorAddress}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment complete!");
  console.log("View on Polygonscan: https://amoy.polygonscan.com/address/" + contractAddress);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
