const hre = require("hardhat");

async function main() {
  console.log("Deploying Marketplace contract using Viem...");

  // Viem deployment is a simple one-liner
  const marketplace = await hre.viem.deployContract("Marketplace");

  // Viem uses .address instead of .target
  console.log(`Marketplace deployed successfully to: ${marketplace.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});