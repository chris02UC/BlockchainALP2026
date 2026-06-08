import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DFM Marketplace - TypeScript Tests", function () {
  
  // --- FIXTURE: Clean state before EVERY test ---
  async function deployMarketplaceFixture() {
    const [admin, seller, buyer, hacker] = await ethers.getSigners();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy();

    const gigPrice = ethers.parseEther("1.0"); // 1 ETH
    
    // Seller creates Gig ID 1 (Because your counter starts at 1)
    await marketplace.connect(seller).createGig("Web3 Dev", "Build dApps", "Tech", gigPrice);

    return { marketplace, admin, seller, buyer, hacker, gigPrice };
  }

  // ==========================================
  // 🟢 3 POSITIVE TEST CASES (The Happy Path)
  // ==========================================
  describe("Positive Cases", function () {
    
    it("1. Should successfully place an order and lock funds in escrow", async function () {
      const { marketplace, buyer, gigPrice } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(buyer).placeOrder(1, { value: gigPrice })
      ).to.not.be.reverted;

      const order = await marketplace.getOrder(1);
      expect(order.buyer).to.equal(buyer.address);
      expect(order.status).to.equal(0); // 0 = PENDING
      expect(order.escrowAmount).to.equal(gigPrice);
    });

    it("2. Should release escrow to seller's internal balance when delivery is confirmed", async function () {
      const { marketplace, seller, buyer, gigPrice } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(buyer).placeOrder(1, { value: gigPrice });
      await marketplace.connect(seller).completeOrder(1, "QmaHashHere"); // Delivery hash added

      // CHECK INTERNAL PROFILE BALANCE, NOT WALLET
      const initialProfile = await marketplace.getSellerProfile(seller.address);

      // Buyer approves work
      await marketplace.connect(buyer).confirmDelivery(1); // Status -> CONFIRMED (2)

      const finalProfile = await marketplace.getSellerProfile(seller.address);
      
      // Seller's platform balance should now be higher!
      expect(finalProfile.balance).to.be.greaterThan(initialProfile.balance);
      
      const order = await marketplace.getOrder(1);
      expect(order.status).to.equal(2); 
    });

    it("3. Should successfully cancel a pending order and refund the buyer", async function () {
      const { marketplace, buyer, gigPrice } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(buyer).placeOrder(1, { value: gigPrice });
      
      // Buyer changes their mind and cancels
      await expect(marketplace.connect(buyer).cancelOrder(1)).to.not.be.reverted;

      const order = await marketplace.getOrder(1);
      expect(order.status).to.equal(3); // 3 = CANCELED
    });
  });

  // ==========================================
  // 🔴 3 NEGATIVE TEST CASES (The Hacker Path)
  // ==========================================
  describe("Negative Cases", function () {

    it("1. Should REVERT if buyer sends the wrong ETH amount", async function () {
      const { marketplace, buyer } = await loadFixture(deployMarketplaceFixture);
      const wrongPrice = ethers.parseEther("0.5"); // Gig is 1 ETH!

      await expect(
        marketplace.connect(buyer).placeOrder(1, { value: wrongPrice })
      ).to.be.reverted; 
    });

    it("2. Should REVERT if Seller tries to confirm their OWN delivery to steal escrow", async function () {
      const { marketplace, seller, buyer, gigPrice } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(buyer).placeOrder(1, { value: gigPrice });
      await marketplace.connect(seller).completeOrder(1, "QmaHashHere");

      // Malicious Seller tries to call the Buyer's confirm function
      await expect(
        marketplace.connect(seller).confirmDelivery(1)
      ).to.be.reverted;
    });

    it("3. Should REVERT if a random hacker tries to cancel someone else's order", async function () {
      const { marketplace, buyer, hacker, gigPrice } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.connect(buyer).placeOrder(1, { value: gigPrice });

      // Hacker tries to cancel the buyer's order
      await expect(
        marketplace.connect(hacker).cancelOrder(1)
      ).to.be.reverted;
    });
  });
});