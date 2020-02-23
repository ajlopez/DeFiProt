pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";

contract Market {
    ERC20 public token;
    uint public totalSupply;
    mapping (address => uint) balances;
    
    constructor(ERC20 _token) public {
        token = _token;
    }
    
    function balanceOf(address user) public view returns (uint) {
        return balances[user];
    }
    
    function mint(uint amount) public {
        require(token.transferFrom(msg.sender, address(this), amount), "No enough tokens");
        balances[msg.sender] += amount;
        totalSupply += amount;
    }
}

