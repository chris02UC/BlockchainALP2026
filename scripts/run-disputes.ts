import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const disputes = await hre.viem.deployContract("Disputes");

  console.log("Disputes deployed to:", disputes.address);
  console.log("Deployer:", deployer.account.address);
  console.log("Block number:", await publicClient.getBlockNumber());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
