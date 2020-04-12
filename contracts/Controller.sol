pragma solidity >=0.5.0 <0.6.0;

import "./MarketInterface.sol";

contract Controller {
    address public owner;
    
    mapping (address => bool) public markets;
    mapping (address => uint) public prices;
    address[] public marketList;
    
    uint public collateralFactor;
    uint public liquidationFactor;
    uint public constant MANTISSA = 1e6;
    
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
    
    function setLiquidationFactor(uint factor) public onlyOwner {
        liquidationFactor = factor;
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
        
        uint supplyValue;
        uint borrowValue;
        
        (supplyValue, borrowValue) = getAccountValues(account);
        
        borrowValue *= collateralFactor;
        borrowValue /= MANTISSA;
        
        if (borrowValue < supplyValue)
            liquidity = supplyValue - borrowValue;

        return liquidity;
    }
    
    function getAccountValues(address account) public view returns (uint supplyValue, uint borrowValue) {
        for (uint k = 0; k < marketList.length; k++) {
            MarketInterface market = MarketInterface(marketList[k]);
            uint price = prices[marketList[k]];
            supplyValue += market.updatedSupplyOf(account) * price;
            borrowValue += market.updatedBorrowBy(account) * price;
        }
    }
}

