const { ethers } = require("hardhat");

const ONE_MILLION_AVAX = ethers.utils.parseEther("1000000");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying contracts with the account: ${deployer.address}`);

  const Mock = await ethers.getContractFactory("MockERC20");

  const pUSDT = await Mock.deploy("Peace USDT", "pUSDT", ONE_MILLION_AVAX);
  console.log(`pUSDT contract address: ${pUSDT.address}`);

  const pUSDC = await Mock.deploy("Peace USDC", "pUSDC", ONE_MILLION_AVAX);
  console.log(`pUSDC contract address: ${pUSDC.address}`);

  const pwETH = await Mock.deploy("Peace wETH", "pwETH", ONE_MILLION_AVAX);
  console.log(`pwETH contract address: ${pwETH.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
