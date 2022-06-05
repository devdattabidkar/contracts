async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const Heritage = await ethers.getContractFactory("Heritage");
  const HeritageContract = await Heritage.deploy();

  console.log("Heritage address:", HeritageContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
  });
