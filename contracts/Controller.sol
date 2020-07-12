pragma solidity >=0.5.0 <0.6.0;

import "./MarketInterface.sol";
import "./test/SafeMath.sol";

contract Controller {
    using SafeMath for uint256;

    address public owner;

    mapping (address => bool) public markets;
    mapping (address => address) public marketsByToken;
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

    function marketListSize() public view returns (uint) {
      return marketList.length;
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
        address marketToken = MarketInterface(market).token();
        require(marketsByToken[marketToken] == address(0));
        markets[market] = true;
        marketsByToken[marketToken] = market;
        marketList.push(market);
    }

    function getAccountLiquidity(address account) public view returns (uint) {
        uint liquidity = 0;

        uint supplyValue;
        uint borrowValue;

        (supplyValue, borrowValue) = getAccountValues(account);

        borrowValue = borrowValue.mul(collateralFactor.add(MANTISSA));
        borrowValue = borrowValue.div(MANTISSA);

        if (borrowValue < supplyValue)
            liquidity = supplyValue.sub(borrowValue);

        return liquidity;
    }

    function getAccountHealth(address account) public view returns (uint) {
        uint supplyValue;
        uint borrowValue;

        (supplyValue, borrowValue) = getAccountValues(account);

        return calculateHealthIndex(supplyValue, borrowValue);
    }
    
    function calculateHealthIndex(uint supplyValue, uint borrowValue) internal view returns (uint) {
        if (supplyValue == 0 || borrowValue == 0)
            return 0;

        borrowValue = borrowValue.mul(liquidationFactor.add(MANTISSA));
        borrowValue = borrowValue.div(MANTISSA);
        
        return supplyValue.mul(MANTISSA).div(borrowValue);
    }

    function getAccountValues(address account) public view returns (uint supplyValue, uint borrowValue) {
        for (uint k = 0; k < marketList.length; k++) {
            MarketInterface market = MarketInterface(marketList[k]);
            uint price = prices[marketList[k]];
            
            supplyValue = supplyValue.add(market.updatedSupplyOf(account).mul(price));
            borrowValue = borrowValue.add(market.updatedBorrowBy(account).mul(price));
        }
    }
    
    function liquidateCollateral(address borrower, address liquidator, uint amount, MarketInterface collateralMarket) public onlyMarket returns (uint collateralAmount)  {
        uint price = prices[msg.sender];        
        require(price > 0);

        uint collateralPrice = prices[address(collateralMarket)];        
        require(collateralPrice > 0);
        
        uint supplyValue;
        uint borrowValue;

        (supplyValue, borrowValue) = getAccountValues(borrower);
        require(borrowValue > 0);
        
        uint healthIndex = calculateHealthIndex(supplyValue, borrowValue);
        
        require(healthIndex <= MANTISSA);
        
        uint liquidationValue = amount.mul(price);
        uint liquidationPercentage = liquidationValue.mul(MANTISSA).div(borrowValue);
        uint collateralValue = supplyValue.mul(liquidationPercentage).div(MANTISSA);
        
        collateralAmount = collateralValue.div(collateralPrice);
        
        collateralMarket.transferTo(borrower, liquidator, collateralAmount);
    }
}

