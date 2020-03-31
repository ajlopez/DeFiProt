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
    uint public baseBorrowRate;

    struct BorrowSnapshot {
        uint principal;
        uint interestIndex;
    }
        
    mapping (address => uint) lendings;
    mapping (address => BorrowSnapshot) borrows;
    
    uint constant FACTOR = 1e6;
    
    constructor(ERC20 _token, uint _baseBorrowRate) public {
        owner = msg.sender;
        token = _token;
        borrowIndex = FACTOR;
        baseBorrowRate = _baseBorrowRate;
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
    
    function getCash() public view returns (uint) {
        return token.balanceOf(address(this));
    }
    
    function utilizationRate(uint cash, uint borrowed, uint reserves) public pure returns (uint) {
        if (borrowed == 0)
            return 0;

        return borrowed * FACTOR / (cash + borrowed - reserves);
    }

    function getBorrowRate(uint cash, uint borrowed, uint reserves) public view returns (uint) {
        uint ur = utilizationRate(cash, borrowed, reserves);
        
        return ur / 1000 + baseBorrowRate;
    }

    function getSupplyRate(uint cash, uint borrowed, uint reserves) public view returns (uint) {
        uint borrowRate = getBorrowRate(cash, borrowed, reserves);
        
        return utilizationRate(cash, borrowed, reserves) * borrowRate / FACTOR;
    }

    function borrowRatePerBlock() public view returns (uint) {
        return getBorrowRate(getCash(), totalBorrows, 0);
    }
    
    function supplyRatePerBlock() public view returns (uint) {
        return getSupplyRate(getCash(), totalBorrows, 0);
    }

    function lendingsBy(address user) public view returns (uint) {
        return lendings[user];
    }
    
    function borrowsBy(address user) public view returns (uint) {
        return borrows[user].principal;
    }
    
    function updatedBorrowsBy(address user) public view returns (uint) {
        BorrowSnapshot storage snapshot = borrows[user];
        
        if (snapshot.principal == 0)
            return 0;
        
        uint newTotalBorrows;
        uint newBorrowIndex;
        
        (newTotalBorrows, newBorrowIndex) = calculateBorrowDataAtBlock(block.number);
        
        return snapshot.principal * newBorrowIndex / snapshot.interestIndex;
    }
    
    function setController(Controller _controller) public onlyOwner {
        controller = _controller;
    }
    
    function mint(uint amount) public {
        // TODO check msg.sender != this
        require(token.transferFrom(msg.sender, address(this), amount), "No enough tokens");
        accrueInterest();
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
        
        BorrowSnapshot storage borrowSnapshot = borrows[msg.sender];
        
        if (borrowSnapshot.principal > 0) {
            uint interest = borrowSnapshot.principal * borrowIndex / borrowSnapshot.interestIndex - borrowSnapshot.principal;
            
            borrowSnapshot.principal += interest;
            borrowSnapshot.interestIndex = borrowIndex;
        }
        
        require(controller.getAccountLiquidity(msg.sender) >= controller.prices(address(this)) * amount * 2, "Not enough account liquidity");
        
        require(token.transfer(msg.sender, amount), "No enough tokens to borrow");
        
        borrowSnapshot.principal += amount;
        borrowSnapshot.interestIndex = borrowIndex;
        
        totalBorrows += amount;
    }
    
    function accrueInterest() public {
        uint currentBlockNumber = block.number;
        
        (totalBorrows, borrowIndex) = calculateBorrowDataAtBlock(currentBlockNumber);
        accrualBlockNumber = currentBlockNumber;
    }
    
    function calculateBorrowDataAtBlock(uint newBlockNumber) internal view returns (uint newTotalBorrows, uint newBorrowIndex) {
        if (newBlockNumber <= accrualBlockNumber)
            return (totalBorrows, borrowIndex);
            
        if (totalBorrows == 0)
            return (totalBorrows, borrowIndex);
            
        uint blockDelta = newBlockNumber - accrualBlockNumber;
        
        uint simpleInterestFactor = blockDelta * borrowRatePerBlock();
        uint interestAccumulated = simpleInterestFactor * totalBorrows / FACTOR;
        
        newBorrowIndex = simpleInterestFactor * borrowIndex / FACTOR + borrowIndex;        
        newTotalBorrows = interestAccumulated + totalBorrows;
    }
    
    function getUpdatedTotalBorrows() public view returns (uint) {
        uint newTotalBorrows;
        uint newBorrowIndex;
        
        (newTotalBorrows, newBorrowIndex) = calculateBorrowDataAtBlock(block.number);
        
        return newTotalBorrows;
    }
    
    function payBorrow(uint amount) public {
        BorrowSnapshot storage snapshot = borrows[msg.sender];
        
        require(snapshot.principal > 0);
        
        accrueInterest();
        
        uint updatedPrincipal = updatedBorrowsBy(msg.sender);
        
        require(token.transferFrom(msg.sender, address(this), amount), "No enough tokens");

        uint additional;
        
        if (updatedPrincipal < amount) {
            additional = amount - updatedPrincipal;
            amount = updatedPrincipal;
        }
        
        snapshot.principal = updatedPrincipal - amount;
        snapshot.interestIndex = borrowIndex;
        
        totalBorrows -= amount;
        
        lendings[msg.sender] += additional;
        totalLendings += additional;
    }
}

