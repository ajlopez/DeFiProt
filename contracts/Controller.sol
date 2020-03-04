pragma solidity >=0.5.0 <0.6.0;

import "./MarketInterface.sol";

contract Controller {
    mapping (address => bool) public markets;
    mapping (address => uint) public prices;
    address[] public marketList;
    
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
        marketList.push(market);
    }
    
    function getAccountLiquidity(address account) public view returns (uint) {
        uint liquidity = 0;
        
        for (uint k = 0; k < marketList.length; k++) {
            MarketInterface market = MarketInterface(marketList[k]);
            uint price = prices[marketList[k]];
            liquidity += market.depositsBy(account) * price;
            liquidity -= market.borrowsBy(account) * 2 * price;
        }
        
        return liquidity;
    }
}

