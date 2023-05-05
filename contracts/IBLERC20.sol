// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IBLERC20 is ERC20{

    address public immutable owner;

    constructor() ERC20("IBL Reward token", "IBL"){
        owner = msg.sender;
    }

    function mintReward(address account, uint256 amount) external {
        require(msg.sender == owner, "IBL: caller is not IBL contract.");
        _mint(account, amount);
    }
}
