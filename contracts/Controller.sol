pragma solidity >=0.5.0 <0.6.0;

import "./MarketInterface.sol";

contract Controller {
    address public owner;
    
    mapping (address => bool) public markets;
    mapping (address => uint) public prices;
    address[] public marketList;
    
    uint public collateralFactor;
    
    uint constant MANTISSA = 1e6;
    
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
    
    function setCollateralFactor(uint factor) public onlyOwner {
        collateralFactor = factor;
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
            liquidity -= market.borrowsBy(account) * collateralFactor / MANTISSA * price;
        }
        
        return liquidity;
    }
}

