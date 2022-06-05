require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-solhint');
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();
require('hardhat-docgen');
require('solidity-coverage');

const AVALANCHE_PRIVATE_KEY = process.env.AVALANCHE_PRIVATE_KEY;
const AVALANCHE_SCAN_API_KEY = process.env.AVALANCHE_SCAN_API_KEY;

module.exports = {
  solidity: '0.8.11',
  networks: {
    avalancheFuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43113,
      accounts: [AVALANCHE_PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      avalanche: AVALANCHE_SCAN_API_KEY,
      avalancheFujiTestnet: AVALANCHE_SCAN_API_KEY
    }
  }
};
