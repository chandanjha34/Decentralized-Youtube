const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessRegistry", function () {
  let accessRegistry;
  let owner;
  let facilitator;
  let creator;
  let consumer;

  beforeEach(async function () {
    [owner, facilitator, creator, consumer] = await ethers.getSigners();
    
    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    accessRegistry = await AccessRegistry.deploy(facilitator.address);
    await accessRegistry.waitForDeployment();
  });

  describe("Content Registration", function () {
    it("should register content and emit event", async function () {
      const metadataCID = "QmMetadata123";
      const contentCID = "QmContent456";
      const priceUSDC = ethers.parseUnits("1", 6); // 1 USDC

      const tx = await accessRegistry.connect(creator).registerContent(
        metadataCID,
        contentCID,
        priceUSDC
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "ContentRegistered"
      );
      
      expect(event).to.not.be.undefined;
      expect(event.args.creator).to.equal(creator.address);
      expect(event.args.metadataCID).to.equal(metadataCID);
      expect(event.args.priceUSDC).to.equal(priceUSDC);
    });

    it("should store content info correctly", async function () {
      const metadataCID = "QmMetadata123";
      const contentCID = "QmContent456";
      const priceUSDC = ethers.parseUnits("1", 6);

      const tx = await accessRegistry.connect(creator).registerContent(
        metadataCID,
        contentCID,
        priceUSDC
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "ContentRegistered"
      );
      const contentId = event.args.contentId;

      const content = await accessRegistry.getContent(contentId);
      
      expect(content.creator).to.equal(creator.address);
      expect(content.metadataCID).to.equal(metadataCID);
      expect(content.contentCID).to.equal(contentCID);
      expect(content.priceUSDC).to.equal(priceUSDC);
      expect(content.active).to.be.true;
    });

    it("should track creator contents", async function () {
      const tx = await accessRegistry.connect(creator).registerContent(
        "QmMeta1",
        "QmContent1",
        ethers.parseUnits("1", 6)
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "ContentRegistered"
      );
      const contentId = event.args.contentId;

      const creatorContents = await accessRegistry.getCreatorContents(creator.address);
      
      expect(creatorContents).to.include(contentId);
    });
  });

  describe("Price Updates", function () {
    let contentId;

    beforeEach(async function () {
      const tx = await accessRegistry.connect(creator).registerContent(
        "QmMeta",
        "QmContent",
        ethers.parseUnits("1", 6)
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "ContentRegistered"
      );
      contentId = event.args.contentId;
    });

    it("should allow creator to update price", async function () {
      const newPrice = ethers.parseUnits("2", 6);
      
      await accessRegistry.connect(creator).updatePrice(contentId, newPrice);
      
      const content = await accessRegistry.getContent(contentId);
      expect(content.priceUSDC).to.equal(newPrice);
    });

    it("should emit PriceUpdated event", async function () {
      const oldPrice = ethers.parseUnits("1", 6);
      const newPrice = ethers.parseUnits("2", 6);
      
      await expect(accessRegistry.connect(creator).updatePrice(contentId, newPrice))
        .to.emit(accessRegistry, "PriceUpdated")
        .withArgs(contentId, oldPrice, newPrice);
    });

    it("should reject price update from non-creator", async function () {
      const newPrice = ethers.parseUnits("2", 6);
      
      await expect(
        accessRegistry.connect(consumer).updatePrice(contentId, newPrice)
      ).to.be.revertedWith("Not creator");
    });
  });

  describe("Access Management", function () {
    let contentId;

    beforeEach(async function () {
      const tx = await accessRegistry.connect(creator).registerContent(
        "QmMeta",
        "QmContent",
        ethers.parseUnits("1", 6)
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment?.name === "ContentRegistered"
      );
      contentId = event.args.contentId;
    });

    it("should grant access from facilitator", async function () {
      const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment123"));
      const expiryTimestamp = 0; // Permanent access

      await accessRegistry.connect(facilitator).grantAccess(
        contentId,
        consumer.address,
        paymentTxHash,
        expiryTimestamp
      );

      const hasAccess = await accessRegistry.hasAccess(contentId, consumer.address);
      expect(hasAccess).to.be.true;
    });

    it("should grant access from owner", async function () {
      const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment123"));
      
      await accessRegistry.connect(owner).grantAccess(
        contentId,
        consumer.address,
        paymentTxHash,
        0
      );

      const hasAccess = await accessRegistry.hasAccess(contentId, consumer.address);
      expect(hasAccess).to.be.true;
    });

    it("should reject access grant from unauthorized address", async function () {
      const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment123"));
      
      await expect(
        accessRegistry.connect(creator).grantAccess(
          contentId,
          consumer.address,
          paymentTxHash,
          0
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("should return false for hasAccess when no access granted", async function () {
      const hasAccess = await accessRegistry.hasAccess(contentId, consumer.address);
      expect(hasAccess).to.be.false;
    });

    it("should return false for expired access", async function () {
      const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment123"));
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await accessRegistry.connect(facilitator).grantAccess(
        contentId,
        consumer.address,
        paymentTxHash,
        pastTimestamp
      );

      const hasAccess = await accessRegistry.hasAccess(contentId, consumer.address);
      expect(hasAccess).to.be.false;
    });

    it("should emit AccessGranted event", async function () {
      const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes("payment123"));
      const expiryTimestamp = 0;

      await expect(
        accessRegistry.connect(facilitator).grantAccess(
          contentId,
          consumer.address,
          paymentTxHash,
          expiryTimestamp
        )
      )
        .to.emit(accessRegistry, "AccessGranted")
        .withArgs(contentId, consumer.address, paymentTxHash, expiryTimestamp);
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to set facilitator", async function () {
      const newFacilitator = consumer.address;
      
      await accessRegistry.connect(owner).setFacilitator(newFacilitator);
      
      expect(await accessRegistry.facilitator()).to.equal(newFacilitator);
    });

    it("should reject setFacilitator from non-owner", async function () {
      await expect(
        accessRegistry.connect(creator).setFacilitator(consumer.address)
      ).to.be.reverted;
    });
  });
});
