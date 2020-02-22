pragma solidity >=0.5.0 <0.6.0;

contract Market {
    uint public totalSupply;
    mapping (address => uint) balances;
    
    function balanceOf(address user) public view returns (uint) {
        return balances[user];
    }
    
    function mint(uint amount) public {
        balances[msg.sender] += amount;
        totalSupply += amount;
    }
}

