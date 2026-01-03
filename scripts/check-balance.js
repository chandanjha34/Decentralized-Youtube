const hre = require("hardhat");

async function main() {
  const address = "0x65c3768E98eE211a7589fe94c753e11cB8895069";
  const balance = await hre.ethers.provider.getBalance(address);
  console.log(`Balance of ${address}: ${hre.ethers.formatEther(balance)} POL`);
}

main().catch(console.error);
