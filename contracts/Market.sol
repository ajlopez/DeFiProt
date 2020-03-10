pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";
import "./Controller.sol";

contract Market is MarketInterface {
    address public owner;

    ERC20 public token;
    Controller public controller;
    
    uint public totalLendings;

    uint public accrualBlockNumber;
    uint public borrowIndex;
    uint public totalBorrows;
    uint public borrowRate;

    struct BorrowSnapshot {
        uint principal;
        uint interestIndex;
    }
        
    mapping (address => uint) lendings;
    mapping (address => BorrowSnapshot) borrows;
    
    uint constant FACTOR = 1e6;
    
    constructor(ERC20 _token, uint _borrowRate) public {
        owner = msg.sender;
        token = _token;
        borrowIndex = FACTOR;
        borrowRate = _borrowRate;
        accrualBlockNumber = block.number;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyController() {
        require(msg.sender == address(controller));
        _;
    }
    
    function lendingsBy(address user) public view returns (uint) {
        return lendings[user];
    }
    
    function borrowsBy(address user) public view returns (uint) {
        return borrows[user].principal;
    }
    
    function setController(Controller _controller) public onlyOwner {
        controller = _controller;
    }
    
    function mint(uint amount) public {
        // TODO check msg.sender != this
        require(token.transferFrom(msg.sender, address(this), amount), "No enough tokens");
        lendings[msg.sender] += amount;
        totalLendings += amount;
    }
    
    function redeem(uint amount) public {
        require(lendings[msg.sender] >= amount);
        require(token.balanceOf(address(this)) >= amount);
        require(token.transfer(msg.sender, amount), "No enough tokens");
        lendings[msg.sender] -= amount;
        totalLendings -= amount;
    }
    
    function borrow(uint amount) public {
        require(token.balanceOf(address(this)) >= amount);
        accrueInterest();
        require(controller.getAccountLiquidity(msg.sender) >= controller.prices(address(this)) * amount * 2, "Not enough account liquidity");
        
        require(token.transfer(msg.sender, amount), "No enough tokens to borrow");
        
        borrows[msg.sender].principal += amount;
        totalBorrows += amount;
    }
    
    function accrueInterest() public {
        uint currentBlockNumber = block.number;
        
        if (currentBlockNumber <= accrualBlockNumber)
            return;
            
        if (totalBorrows == 0) {
            accrualBlockNumber = currentBlockNumber;
            
            return;
        }
            
        uint blockDelta = currentBlockNumber - accrualBlockNumber;
        
        uint simpleInterestFactor = blockDelta * borrowRate;
        uint interestAccumulated = simpleInterestFactor * totalBorrows / FACTOR;
        
        borrowIndex = simpleInterestFactor * borrowIndex / FACTOR + borrowIndex;
        totalBorrows = interestAccumulated + totalBorrows;
        accrualBlockNumber = currentBlockNumber;
    }
}

