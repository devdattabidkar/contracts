async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const Mock = await ethers.getContractFactory("MockERC20");
  const MockContract = await Mock.deploy();

  console.log("Mock address:", MockContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
  });
