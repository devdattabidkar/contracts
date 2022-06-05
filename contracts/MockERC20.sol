//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

uint256 constant TOTAL_SUPPLY = 1000000000000000000000000000;
string constant NAME = "MOCK_TOKEN";
string constant SYMBOL = "MCK";

contract MockERC20 is ERC20 {
    constructor() ERC20(NAME, SYMBOL) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
