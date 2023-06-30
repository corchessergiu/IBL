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



//["s",1000000000000000000,1000000000000000000,["0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"],[1000000000000000000]]
//["s2",1000000000000000000,1000000000000000000,["0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"],[600000000000000000,200000000000000000,200000000000000000]]