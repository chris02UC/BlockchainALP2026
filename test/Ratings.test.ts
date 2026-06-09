import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DFM Marketplace - Ratings Tests", function () {
  async function deployRatingsFixture() {
    const [deployer, buyer1, buyer2, seller] = await ethers.getSigners();

    const Ratings = await ethers.getContractFactory("Ratings");
    const ratings = await Ratings.deploy();

    return { ratings, buyer1, buyer2, seller };
  }

  // ==========================================
  // 🟢 3 POSITIVE TEST CASES (The Happy Path)
  // ==========================================
  describe("Positive Cases", function () {
    
    it("1. Should successfully submit a review and emit an event", async function () {
      const { ratings, buyer1, seller } = await loadFixture(deployRatingsFixture);
      
      const orderId = 1;
      const ratingValue = 5;
      const comment = "Excellent work on the smart contracts!";

      // Cast to 'any' to bypass Ethers v6 BaseContract typing issue
      await expect(
        (ratings.connect(buyer1) as any).submitReview(orderId, seller.address, ratingValue, comment)
      ).to.emit(ratings, "ReviewSubmitted")
       .withArgs(1, orderId, buyer1.address, ratingValue); 

      const review = await ratings.getReview(1);
      expect(review.orderId).to.equal(orderId);
      expect(review.reviewer).to.equal(buyer1.address);
      expect(review.reviewee).to.equal(seller.address);
      expect(review.rating).to.equal(ratingValue);
      expect(review.comment).to.equal(comment);
    });

    it("2. Should correctly calculate the average seller rating across multiple reviews", async function () {
      const { ratings, buyer1, buyer2, seller } = await loadFixture(deployRatingsFixture);
      
      await (ratings.connect(buyer1) as any).submitReview(1, seller.address, 5, "Perfect!");
      await (ratings.connect(buyer2) as any).submitReview(2, seller.address, 3, "It was okay.");

      const averageRating = await ratings.getSellerRating(seller.address);
      expect(averageRating).to.equal(4);
    });

    it("3. Should correctly retrieve a seller's total review count and review IDs", async function () {
      const { ratings, buyer1, seller } = await loadFixture(deployRatingsFixture);
      
      await (ratings.connect(buyer1) as any).submitReview(1, seller.address, 4, "Good job");
      await (ratings.connect(buyer1) as any).submitReview(2, seller.address, 5, "Even better this time");

      const count = await ratings.getReviewCount(seller.address);
      expect(count).to.equal(2);

      const reviewIds = await ratings.getSellerReviews(seller.address);
      expect(reviewIds.length).to.equal(2);
      expect(reviewIds[0]).to.equal(1); 
      expect(reviewIds[1]).to.equal(2); 
    });
  });

  // ==========================================
  // 🔴 3 NEGATIVE TEST CASES (The Hacker Path)
  // ==========================================
  describe("Negative Cases", function () {

    it("1. Should REVERT if a user tries to submit an invalid rating number", async function () {
      const { ratings, buyer1, seller } = await loadFixture(deployRatingsFixture);
      
      await expect(
        (ratings.connect(buyer1) as any).submitReview(1, seller.address, 6, "Breaking the scale!")
      ).to.be.revertedWith("Rating must be between 1 and 5");

      await expect(
        (ratings.connect(buyer1) as any).submitReview(1, seller.address, 0, "Terrible!")
      ).to.be.revertedWith("Rating must be between 1 and 5");
    });

    it("2. Should REVERT if a user tries to submit a review with an empty comment", async function () {
      const { ratings, buyer1, seller } = await loadFixture(deployRatingsFixture);
      
      await expect(
        (ratings.connect(buyer1) as any).submitReview(1, seller.address, 4, "")
      ).to.be.revertedWith("Comment cannot be empty");
    });

    it("3. Should REVERT if a user tries to review the exact same order twice", async function () {
      const { ratings, buyer1, seller } = await loadFixture(deployRatingsFixture);
      
      await (ratings.connect(buyer1) as any).submitReview(1, seller.address, 5, "Great work!");

      await expect(
        (ratings.connect(buyer1) as any).submitReview(1, seller.address, 1, "Actually I changed my mind")
      ).to.be.revertedWith("Order already reviewed");
      
      const isReviewed = await ratings.isOrderReviewed(1);
      expect(isReviewed).to.equal(true);
    });

  });
});