// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is Ownable, ERC777 {

    constructor(uint256 initialSupply, address[] memory defaultOperators) ERC777(
        "Lucky Number Token",
            "LNT",
            defaultOperators
            //new address[](0)
    ) {
        _mint(msg.sender, initialSupply, "", "");
    }

    function mint(uint _amount) external onlyOwner {
        _mint(msg.sender, _amount, "", "");
    }
}
