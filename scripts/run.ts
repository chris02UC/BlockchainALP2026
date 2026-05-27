import hre from "hardhat";

async function main() {
  // 1. Fetch default clients (accounts) from Hardhat
  const publicClient = await hre.viem.getPublicClient();
  const [deployer, buyer, seller] = await hre.viem.getWalletClients();

  console.log("Deploying Ratings contract...");

  // 2. Deploy the contract
  // Hardhat Viem automatically looks for Ratings.sol in the contracts folder
  const ratings = await hre.viem.deployContract("Ratings");
  console.log(`✅ Ratings contract deployed to: ${ratings.address}\n`);

  // 3. Set up dummy data for the review
  // In Viem, Solidity's uint256 requires JavaScript BigInts (adding 'n' to the end of the number)
  const orderId = 101n; 
  const ratingValue = 5n; 
  const comment = "Excellent transaction, fast delivery!";

  console.log(`Buyer (${buyer.account.address}) is submitting a review for Seller (${seller.account.address})...`);

  // 4. Interact with the contract (Write Data)
  // We specify the 'buyer' as the account sending the transaction
  const submitTx = await ratings.write.submitReview(
    [orderId, seller.account.address, ratingValue, comment],
    { account: buyer.account }
  );

  // Wait for the transaction to be mined into a block
  await publicClient.waitForTransactionReceipt({ hash: submitTx });
  console.log("✅ Review submitted successfully!\n");

  // 5. Read from the contract (Read Data)
  console.log("Fetching Seller's rating data...");
  
  const reviewCount = await ratings.read.getReviewCount([seller.account.address]);
  console.log(`📊 Seller has ${reviewCount} review(s).`);

  const sellerRating = await ratings.read.getSellerRating([seller.account.address]);
  console.log(`⭐ Average Seller rating: ${sellerRating} / 5`);
  
  // Optionally: Fetch the specific review details
  const reviewDetails = await ratings.read.getReview([1n]); // 1n because it's the first review (reviewIdCounter starts at 1)
  console.log(`\nReview Details from Blockchain:`);
  console.log(`- Comment: "${reviewDetails.comment}"`);
  console.log(`- Rating: ${reviewDetails.rating}`);
}

main()
  .then(() => process.exit(0)) // Forces a clean exit upon success
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });