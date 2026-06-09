import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DFM Marketplace - Disputes Tests", function () {
  
  async function deployDisputesFixture() {
    const [deployer, buyer, seller, hacker] = await ethers.getSigners();

    const Disputes = await ethers.getContractFactory("Disputes");
    const disputes = await Disputes.deploy(deployer.address);

    return { disputes, admin: deployer, buyer, seller, hacker };
  }

  // ==========================================
  // 🟢 3 POSITIVE TEST CASES (The Happy Path)
  // ==========================================
  describe("Positive Cases", function () {
    
    it("1. Should successfully open a new dispute", async function () {
      const { disputes, buyer, seller } = await loadFixture(deployDisputesFixture);
      
      const orderId = 1;
      const reason = "Seller delivered a broken website";

      // Cast to 'any' to bypass Ethers v6 BaseContract typing issue
      await expect(
        (disputes.connect(buyer) as any).openDispute(orderId, seller.address, reason)
      ).to.emit(disputes, "DisputeOpened")
       .withArgs(1, orderId, buyer.address, reason);

      const dispute = await disputes.getDispute(1);
      expect(dispute.initiator).to.equal(buyer.address);
      expect(dispute.respondent).to.equal(seller.address);
      expect(dispute.status).to.equal(0); // 0 = OPEN
      
      expect(await disputes.isOrderDisputed(orderId)).to.equal(true);
    });

    it("2. Should allow involved parties to submit evidence", async function () {
      const { disputes, buyer, seller } = await loadFixture(deployDisputesFixture);
      
      await (disputes.connect(buyer) as any).openDispute(1, seller.address, "Broken code");

      const evidenceHash = "QmTestEvidenceHash12345";

      await expect(
        (disputes.connect(seller) as any).submitEvidence(1, evidenceHash)
      ).to.emit(disputes, "EvidenceSubmitted")
       .withArgs(1, seller.address, evidenceHash);

      const dispute = await disputes.getDispute(1);
      expect(dispute.status).to.equal(1); // 1 = EVIDENCE_SUBMITTED

      const evidenceList = await disputes.getDisputeEvidence(1);
      expect(evidenceList.length).to.equal(1);
      expect(evidenceList[0].evidenceHash).to.equal(evidenceHash);
    });

    it("3. Should allow the Admin to resolve the dispute in favor of the buyer", async function () {
      const { disputes, admin, buyer, seller } = await loadFixture(deployDisputesFixture);
      
      await (disputes.connect(buyer) as any).openDispute(1, seller.address, "Never delivered");
      await (disputes.connect(seller) as any).submitEvidence(1, "QmFakeProof");

      await expect(
        (disputes.connect(admin) as any).resolveDispute(1, 0)
      ).to.emit(disputes, "DisputeResolved")
       .withArgs(1, 0);

      const dispute = await disputes.getDispute(1);
      expect(dispute.status).to.equal(2); // 2 = RESOLVED
      expect(dispute.resolution).to.equal(0); // 0 = REFUND_BUYER
    });
  });

  // ==========================================
  // 🔴 3 NEGATIVE TEST CASES (The Hacker Path)
  // ==========================================
  describe("Negative Cases", function () {

    it("1. Should REVERT if a non-admin tries to resolve a dispute", async function () {
      const { disputes, buyer, seller, hacker } = await loadFixture(deployDisputesFixture);
      
      await (disputes.connect(buyer) as any).openDispute(1, seller.address, "Fake work");

      await expect(
        (disputes.connect(hacker) as any).resolveDispute(1, 1) // 1 = PAY_SELLER
      ).to.be.revertedWith("Only admin can resolve disputes");
    });

    it("2. Should REVERT if a random user tries to submit evidence", async function () {
      const { disputes, buyer, seller, hacker } = await loadFixture(deployDisputesFixture);
      
      await (disputes.connect(buyer) as any).openDispute(1, seller.address, "No response");

      const fakeEvidence = "QmHackerEvidence";

      await expect(
        (disputes.connect(hacker) as any).submitEvidence(1, fakeEvidence)
      ).to.be.revertedWith("Only involved parties can submit evidence");
    });

    it("3. Should REVERT if someone tries to open a dispute for an order that is already disputed", async function () {
      const { disputes, buyer, seller } = await loadFixture(deployDisputesFixture);
      
      await (disputes.connect(buyer) as any).openDispute(1, seller.address, "Wrong item");

      await expect(
        (disputes.connect(seller) as any).openDispute(1, buyer.address, "Buyer is lying")
      ).to.be.revertedWith("Order already has a dispute");
    });

  });
});