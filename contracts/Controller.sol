pragma solidity >=0.5.0 <0.6.0;

import "./MarketInterface.sol";

contract Controller {
    mapping (address => bool) public markets;
    address public owner;
    
    constructor() public {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    function addMarket(address market) public onlyOwner {
        markets[market] = true;
    }
}

