pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";
import "./Controller.sol";


contract Market is MarketInterface {
    address public owner;
    ERC20 public token;
    Controller public controller;
    mapping (address => uint) deposits;
    
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
    
    function depositsOf(address user) public view returns (uint) {
        return deposits[user];
    }
    
    function setController(Controller _controller) public onlyOwner {
        controller = _controller;
    }
    
    function mint(uint amount) public {
        // TODO check msg.sender != this
        require(token.transferFrom(msg.sender, address(this), amount), "No enough tokens");
        deposits[msg.sender] += amount;
    }
    
    function redeem(uint amount) public {
        require(deposits[msg.sender] >= amount);
        require(token.balanceOf(address(this)) >= amount);
        require(token.transfer(msg.sender, amount), "No enough tokens");
        deposits[msg.sender] -= amount;
    }
    
    function borrow(uint amount, address collateral) public {
        require(token.balanceOf(address(this)) >= amount);
        controller.lock(collateral, msg.sender, amount * 2);
        require(token.transfer(msg.sender, amount), "No enough tokens to borrow");
    }
    
    function transferToMarket(address user, address market, uint amount) public onlyController {
        require(deposits[user] >= amount);
        require(token.balanceOf(address(this)) >= amount);
        require(token.transfer(market, amount), "No enough tokens to transfer to market");
        deposits[user] -= amount;
    }
}

