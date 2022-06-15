const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE_AVAX = ethers.utils.parseEther("1");
const STATUS = {
  ACTIVE: 0,
  INACTIVE: 1,
  INHERITED: 2,
};

describe("Heritage", () => {
  let Heritage;
  let heritage;
  let Erc20;
  let mockToken;

  const increaseDays = async (days) => {
    await network.provider.send("evm_increaseTime", [days * 24 * 60 * 60]);
    await network.provider.send("evm_mine");
  };

  const approveAllowance = async ({
    allowance = ONE_AVAX,
    signer = testator,
  } = {}) => {
    await mockToken.connect(signer).approve(heritage.address, allowance);
  };

  before(async () => {
    [
      owner,
      testator,
      inheritor,
      accountWithoutAllowance,
      accountNotInheritor,
      testator1,
      testator2,
      testator3,
      inheritor1,
      inheritor2,
      inheritor3,
    ] = await ethers.getSigners();

    Erc20 = await ethers.getContractFactory("MockERC20");

    mockToken = await Erc20.deploy(
      "PEACE",
      "PAZ",
      ethers.utils.parseEther("1000000")
    );

    await mockToken.deployed();

    // Mint tokens to testator
    await mockToken.transfer(testator.address, ONE_AVAX);
  });

  beforeEach(async () => {
    Heritage = await ethers.getContractFactory("Heritage");

    heritage = await Heritage.deploy();

    await heritage.deployed();
  });

  describe("addTestament", () => {
    it("should add testator", async () => {
      await approveAllowance();

      const { timestamp } = await ethers.provider.getBlock();
      const maxDays = 10;

      await expect(
        heritage
          .connect(testator)
          .addTestament(inheritor.address, mockToken.address, maxDays)
      )
        .to.emit(heritage, "NewTestament")
        .withArgs(
          testator.address,
          inheritor.address,
          STATUS.ACTIVE,
          timestamp + 1,
          mockToken.address,
          maxDays
        );
    });

    it("should throw if testator already have an inheritor", async () => {
      await approveAllowance();
      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, 10);
      await expect(
        heritage
          .connect(testator)
          .addTestament(inheritor.address, mockToken.address, 10)
      ).to.be.revertedWith("Testator already have a testament.");
    });

    it("should throw error if maxDays is lte 0", async () => {
      await expect(
        heritage
          .connect(testator)
          .addTestament(inheritor.address, mockToken.address, 0)
      ).to.be.revertedWith("maxDays should be greater than 0.");
    });

    it("should throw error if maxDays is lte 0", async () => {
      await expect(
        heritage
          .connect(testator)
          .addTestament(accountWithoutAllowance.address, mockToken.address, 10)
      ).to.be.revertedWith("Token allowance should be greater than 0.");
    });

    it("should throw if inheritor already has a testament", async () => {
      await mockToken.transfer(testator2.address, ONE_AVAX);
      await approveAllowance();
      await approveAllowance({ signer: testator2 });

      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, 10);

      await expect(
        heritage
          .connect(testator2)
          .addTestament(inheritor.address, mockToken.address, 10)
      ).to.be.revertedWith("Inheritor already have a testament.");
    });
  });

  describe("getTestator", () => {
    it("should return testator", async () => {
      await approveAllowance();

      const maxDays = 10;

      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, maxDays);

      const { timestamp } = await ethers.provider.getBlock();
      const result = await heritage.getTestator(testator.address);

      expect(result[0]).to.equal(inheritor.address);
      expect(result[1]).to.equal(STATUS.ACTIVE);
      expect(result[2]).to.equal(timestamp);
      expect(result[3]).to.equal(mockToken.address);
      expect(result[4]).to.equal(maxDays);
    });

    it("should revert if the testator does not exist", async () => {
      await expect(heritage.getTestator(testator.address)).to.be.revertedWith(
        "The testator does not exist."
      );
    });
  });

  describe("getInheritor", () => {
    it("should return inheritor", async () => {
      await approveAllowance();

      const maxDays = 10;

      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, maxDays);

      const { timestamp } = await ethers.provider.getBlock();
      const result = await heritage.getInheritor(inheritor.address);

      expect(result[0]).to.equal(inheritor.address);
      expect(result[1]).to.equal(STATUS.ACTIVE);
      expect(result[2]).to.equal(timestamp);
      expect(result[3]).to.equal(mockToken.address);
      expect(result[4]).to.equal(maxDays);
    });

    it("should revert if the testator does not exist", async () => {
      await expect(heritage.getInheritor(testator.address)).to.be.revertedWith(
        "The inheritor does not exist."
      );
    });
  });

  describe("updateTestament", () => {
    beforeEach(async () => {
      await approveAllowance();

      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, 10);
    });

    it("should update testament", async () => {
      const { timestamp } = await ethers.provider.getBlock();
      const newInheritor = inheritor2.address;
      const newToken = inheritor3.address;
      const newMaxDays = 30;

      await expect(
        heritage
          .connect(testator)
          .updateTestament(newInheritor, newToken, newMaxDays)
      )
        .to.emit(heritage, "TestamentUpdated")
        .withArgs(
          testator.address,
          newInheritor,
          STATUS.ACTIVE,
          timestamp + 1,
          newToken,
          newMaxDays
        );
    });

    it("should revert if sender is not testator", async () => {
      const newInheritor = inheritor2.address;
      const newToken = inheritor3.address;
      const newMaxDays = 30;

      await expect(
        heritage
          .connect(inheritor)
          .updateTestament(newInheritor, newToken, newMaxDays)
      ).to.be.revertedWith("The address is not a valid testator.");
    });
  });

  describe("updateProof", () => {
    beforeEach(async () => {
      await approveAllowance();

      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, 10);
    });

    it("should update proof timestamp", async () => {
      const { timestamp } = await ethers.provider.getBlock();
      const testament = await heritage
        .connect(inheritor)
        .getInheritor(inheritor.address);

      await expect(heritage.connect(testator).updateProof())
        .to.emit(heritage, "TestamentUpdated")
        .withArgs(
          testator.address,
          inheritor.address,
          STATUS.ACTIVE,
          timestamp + 1,
          testament.token,
          testament.maxDays
        );
    });

    it("should revert if sender is not testator", async () => {
      await expect(
        heritage.connect(inheritor).updateProof()
      ).to.be.revertedWith("The address is not a valid testator.");
    });

    it("should update status time already passed", async () => {
      const testament = await heritage
        .connect(inheritor)
        .getInheritor(inheritor.address);

      await increaseDays(11);

      await expect(heritage.connect(testator).updateProof())
        .to.emit(heritage, "TestamentUpdated")
        .withArgs(
          testator.address,
          inheritor.address,
          STATUS.INACTIVE,
          testament.proofOfTimestamp,
          testament.token,
          testament.maxDays
        );
    });
  });

  describe("inherit", () => {
    beforeEach(async () => {
      await approveAllowance();

      await heritage
        .connect(testator)
        .addTestament(inheritor.address, mockToken.address, 10);
    });

    it("should transfer tokens", async () => {
      await increaseDays(11);

      const testament = await heritage
        .connect(inheritor)
        .getInheritor(inheritor.address);

      const oldTestatorBalance = await mockToken.balanceOf(testator.address);
      const oldInheritorBalance = await mockToken.balanceOf(inheritor.address);

      await expect(heritage.connect(inheritor).inherit())
        .to.emit(heritage, "Inherited")
        .withArgs(
          testator.address,
          inheritor.address,
          STATUS.INHERITED,
          testament.proofOfTimestamp,
          mockToken.address,
          testament.maxDays,
          ONE_AVAX
        );

      const newTestatorBalance = await mockToken.balanceOf(testator.address);
      const newInheritorBalance = await mockToken.balanceOf(inheritor.address);
      const result = await heritage.getTestator(testator.address);

      expect(result[1]).to.equal(STATUS.INHERITED);
      expect(newTestatorBalance).to.equal(0);
      expect(newInheritorBalance).to.equal(
        oldTestatorBalance.add(oldInheritorBalance)
      );
    });

    it("should revert if sender is not inheritor", async () => {
      await increaseDays(11);

      await expect(
        heritage.connect(accountNotInheritor).inherit()
      ).to.be.revertedWith("The address is not a valid inheritor.");
    });

    it("should revert if time did not pass", async () => {
      await increaseDays(5);

      await expect(heritage.connect(inheritor).inherit()).to.be.revertedWith(
        "The max days did not passed yet."
      );
    });
  });

  describe("revoke", () => {
    beforeEach(async () => {
      const promises = [
        [testator1, inheritor1],
        [testator2, inheritor2],
        [testator3, inheritor3],
      ].map(async ([testator, inheritor]) => {
        await mockToken.transfer(testator.address, ONE_AVAX);
        await approveAllowance({ signer: testator });
        await heritage
          .connect(testator)
          .addTestament(inheritor.address, mockToken.address, 10);
      });

      await Promise.all(promises);
    });

    it("should revoke testament", async () => {
      const _testator2 = await heritage.getTestator(testator2.address);

      await expect(heritage.connect(testator2).revoke())
        .to.emit(heritage, "Revoke")
        .withArgs(testator2.address, ..._testator2);

      await expect(heritage.getTestator(testator2.address)).to.be.revertedWith(
        "The testator does not exist."
      );

      await expect(
        heritage.getTestator(testator1.address)
      ).not.to.be.revertedWith("The testator does not exist.");

      await expect(
        heritage.getTestator(testator3.address)
      ).not.to.be.revertedWith("The testator does not exist.");
    });
  });
});
