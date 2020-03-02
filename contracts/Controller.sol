pragma solidity >=0.5.0 <0.6.0;

import "./MarketInterface.sol";

contract Controller {
    mapping (address => bool) public markets;
    mapping (address => uint) public prices;
    
    address public owner;
    
    constructor() public {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyMarket() {
        require(markets[msg.sender]);
        _;
    }
    
    function setPrice(address market, uint price) public onlyOwner {
        require(markets[market]);
        
        prices[market] = price;
    }
    
    function addMarket(address market) public onlyOwner {
        markets[market] = true;
    }
    
    function lock(address market, address user, uint amount) external onlyMarket {
        require(markets[market]);
        
        MarketInterface(market).transferToMarket(user, market, amount);
    }
}

