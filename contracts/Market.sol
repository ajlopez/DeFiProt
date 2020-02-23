pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";
import "./Controller.sol";


contract Market is MarketInterface {
    address public owner;
    ERC20 public token;
    Controller public controller;
    uint public totalSupply;
    mapping (address => uint) balances;
    
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
        require(token.transfer(msg.sender, amount), "No enough tokens");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
    }
    
    function borrow(uint amount, address collateral) public {
        controller.lock(collateral, msg.sender, amount * 2);
        // TODO review source of value
        balances[msg.sender] += amount;
        totalSupply += amount;
    }
    
    function lock(address user, uint amount) public onlyController {
        balances[user] -= amount;
        balances[address(this)] += amount;
    }
}

