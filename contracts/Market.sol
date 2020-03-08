pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";
import "./Controller.sol";

contract Market is MarketInterface {
    address public owner;

    ERC20 public token;
    Controller public controller;

    uint public totalDeposits;
    uint public totalBorrows;

    struct BorrowSnapshot {
        uint principal;
        uint interestIndex;
    }
    
    uint public borrowIndex;
    
    mapping (address => uint) deposits;
    mapping (address => BorrowSnapshot) borrows;
    
    uint constant FACTOR = 1e6;
    
    constructor(ERC20 _token) public {
        owner = msg.sender;
        token = _token;
        borrowIndex = FACTOR;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyController() {
        require(msg.sender == address(controller));
        _;
    }
    
    function depositsBy(address user) public view returns (uint) {
        return deposits[user];
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
        deposits[msg.sender] += amount;
        totalDeposits += amount;
    }
    
    function redeem(uint amount) public {
        require(deposits[msg.sender] >= amount);
        require(token.balanceOf(address(this)) >= amount);
        require(token.transfer(msg.sender, amount), "No enough tokens");
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
    }
    
    function borrow(uint amount) public {
        require(token.balanceOf(address(this)) >= amount);
        require(controller.getAccountLiquidity(msg.sender) >= controller.prices(address(this)) * amount * 2, "Not enough account liquidity");
        
        require(token.transfer(msg.sender, amount), "No enough tokens to borrow");
        
        BorrowSnapshot storage borrowSnapshot = borrows[msg.sender];
        
        borrowSnapshot.principal = 
        
        borrows[msg.sender].principal += amount;
        totalBorrows += amount;
    }
}

