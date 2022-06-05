const { expect } = require('chai');
const { ethers, BigNumber } = require('hardhat');

const ONE_AVAX = ethers.utils.parseEther('1');
const STATUS = {
  ACTIVE: 0,
  INACTIVE: 1,
  INHERITED: 2
};

describe('Heritage', () => {
  let Heritage;
  let heritage;
  let Erc20;
  let mockToken;
  
  let inheritor;
  let owner;

  const increaseDays = async (days) => {
    await network.provider.send('evm_increaseTime', [days * 24 * 60 * 60]);
    await network.provider.send('evm_mine');
  };
  
  const approveAllowance = async (allowance = ONE_AVAX) => {
    await mockToken.connect(testator).approve(heritage.address, allowance);      
  }

  before(async () => {
    [owner, testator, inheritor, accountWithoutAllowance, accountNotInheritor] = await ethers.getSigners();

    Erc20 = await ethers.getContractFactory('MockERC20');

    mockToken = await Erc20.deploy();

    await mockToken.deployed();

    // Mint tokens to testator
    await mockToken.transfer(testator.address, ONE_AVAX);
  });

  beforeEach(async () =>{
    Heritage = await ethers.getContractFactory('Heritage');

    heritage = await Heritage.deploy();

    await heritage.deployed();
  });

  describe('addTestator', () => {
    it('should add testator', async () => {
      await approveAllowance();

      const { timestamp } = await ethers.provider.getBlock();
      const maxDays = 10;

      await expect(
          heritage.connect(testator).addTestator(
          inheritor.address,
          mockToken.address,
          maxDays
        ) 
      )
        .to.emit(heritage, 'NewTestator')
        .withArgs(
          inheritor.address,
          STATUS.ACTIVE,
          timestamp + 1,
          mockToken.address,
          maxDays
        );
    });

    it('should throw if testator already have an inheritor', async() => {
      await approveAllowance();
      await heritage.connect(testator).addTestator(
        inheritor.address,
        mockToken.address,
        10
      );
      await expect(
        heritage.connect(testator).addTestator(
          inheritor.address,
          mockToken.address,
          10
        )   
      )
      .to.be.revertedWith('Testator already have a testament.');
    });

    it('should throw error if maxDays is lte 0', async() => {
      await expect(
        heritage.connect(testator).addTestator(
          inheritor.address,
          mockToken.address,
          0
        )
      )
        .to.be.revertedWith('maxDays should be greater than 0.');
    });

    it('should throw error if maxDays is lte 0', async() => {
      await expect(
        heritage.connect(testator).addTestator(
          accountWithoutAllowance.address,
          mockToken.address,
          10
        )
      )
        .to.be.revertedWith('Token allowance should be greater than 0.');
    });
  });

  describe('getTestator', () => {
    it('should return testator', async () => {
      await approveAllowance();

      const maxDays = 10;

      await heritage.connect(testator).addTestator(
        inheritor.address,
        mockToken.address,
        maxDays
      );

      const { timestamp } = await ethers.provider.getBlock();
      const result = await heritage.getTestator(testator.address);

      expect(result[0]).to.equal(inheritor.address);
      expect(result[1]).to.equal(STATUS.ACTIVE);
      expect(result[2]).to.equal(timestamp);
      expect(result[3]).to.equal(mockToken.address);
      expect(result[4]).to.equal(maxDays);
    });

    it('should revert if the testator does not exist', async () => {
      await expect(
        heritage.getTestator(testator.address)
      )
        .to.be.revertedWith('The testator does not exist.');
    });
  });

  describe('updateProof', () => {
    beforeEach(async () => {
      await approveAllowance();
      
      await heritage.connect(testator).addTestator(
        inheritor.address,
        mockToken.address,
        10
      );
    });

    it('should update proof timestamp', async () => {
      const { timestamp } = await ethers.provider.getBlock();

      await expect(
        heritage.connect(testator).updateProof() 
      )
        .to.emit(heritage, 'ProofUpdated')
        .withArgs(
          testator.address,
          timestamp + 1
        );
    });

    it('should revert if sender is not testator', async () => {
      await expect(
        heritage.connect(inheritor).updateProof() 
      )
        .to.be.revertedWith('The address is not a valid testator.');
    });

    it('should revert if timestamp already pass', async () => {
      const oldTestator = await heritage.getTestator(testator.address);

      await increaseDays(11);
      await heritage.connect(testator).updateProof();

      const newTestator = await heritage.getTestator(testator.address);

      expect(newTestator[1]).to.equal(STATUS.INACTIVE);
      expect(newTestator[2]).to.equal(oldTestator[2]);
    });
  });

  describe('inherit', () => {
    beforeEach(async () => {
      await approveAllowance();
      
      await heritage.connect(testator).addTestator(
        inheritor.address,
        mockToken.address,
        10
      );
    });

    it('should transfer tokens', async () => {
      await increaseDays(11);

      const oldTestatorBalance = await mockToken.balanceOf(testator.address);
      const oldInheritorBalance = await mockToken.balanceOf(inheritor.address);

      await expect(
        heritage.connect(inheritor).inherit()
      )
        .to.emit(heritage, 'Inherited')
        .withArgs(
          testator.address,
          inheritor.address,
          ONE_AVAX
        );

      const newTestatorBalance = await mockToken.balanceOf(testator.address);
      const newInheritorBalance = await mockToken.balanceOf(inheritor.address);
      const result = await heritage.getTestator(testator.address);

      expect(result[1]).to.equal(STATUS.INHERITED);
      expect(newTestatorBalance).to.equal(0);
      expect(newInheritorBalance).to.equal(oldTestatorBalance.add(oldInheritorBalance));
    });

    it('should revert if sender is not inheritor', async () => {
      await increaseDays(11);

      await expect(
        heritage.connect(accountNotInheritor).inherit()
      )
        .to.be.revertedWith('The address is not a valid inheritor.');
    });

    it('should revert if time did not pass', async () => {
      await increaseDays(5);

      await expect(
        heritage.connect(inheritor).inherit()
      )
        .to.be.revertedWith('The max days did not passed yet.');
    })
  });
});
