pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";
import "./Controller.sol";


contract Market is MarketInterface {
    address public owner;
    ERC20 public token;
    Controller public controller;
    mapping (address => uint) balances;
    mapping (address => uint) borrowed;
    uint public totalSupply;
    
    constructor(ERC20 _token) public {
        owner = msg.sender;
        token = _token;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyController() {
        require(msg.sender == address(controller));
        _;
    }
    
    function balanceOf(address user) public view returns (uint) {
        return balances[user];
    }
    
    function borrowedBy(address user) public view returns (uint) {
        return borrowed[user];
    }
    
    function setController(Controller _controller) public onlyOwner {
        controller = _controller;
    }
    
    function mint(uint amount) public {
        // TODO check msg.sender != this
        require(token.transferFrom(msg.sender, address(this), amount), "No enough tokens");
        balances[msg.sender] += amount;
        totalSupply += amount;
    }
    
    function redeem(uint amount) public {
        require(balances[msg.sender] >= amount);
        require(token.balanceOf(address(this)) >= amount);
        require(token.transfer(msg.sender, amount), "No enough tokens");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
    }
    
    function borrow(uint amount) public {
        require(token.balanceOf(address(this)) >= amount);
        require(controller.getAccountLiquidity(msg.sender) >= controller.prices(address(this)) * amount * 2, "Not enough account liquidity");
        
        require(token.transfer(msg.sender, amount), "No enough tokens to borrow");
        
        borrowed[msg.sender] += amount;
    }
    
    function transferToMarket(address user, address market, uint amount) public onlyController {
        require(balances[user] >= amount);
        require(token.balanceOf(address(this)) >= amount);
        require(token.transfer(market, amount), "No enough tokens to transfer to market");
        balances[user] -= amount;
    }
}

