pragma solidity >=0.5.0 <0.6.0;

import "./test/ERC20.sol";
import "./Controller.sol";

contract Market is MarketInterface {
    address public owner;

    ERC20 public token;
    Controller public controller;
    
    uint public totalSupply;
    
    uint public supplyIndex;

    uint public accrualBlockNumber;
    
    uint public borrowIndex;
    uint public totalBorrows;
    uint public baseBorrowRate;

    struct SupplySnapshot {
        uint supply;
        uint interestIndex;
    }
        
    struct BorrowSnapshot {
        uint principal;
        uint interestIndex;
    }
    
    mapping (address => SupplySnapshot) supplies;
    mapping (address => BorrowSnapshot) borrows;
    
    uint constant FACTOR = 1e6;
    
    constructor(ERC20 _token, uint _baseBorrowRate) public {
        owner = msg.sender;
        token = _token;
        borrowIndex = FACTOR;
        supplyIndex = FACTOR;
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

    function supplyOf(address user) public view returns (uint) {
        return supplies[user].supply;
    }
    
    function borrowBy(address user) public view returns (uint) {
        return borrows[user].principal;
    }
    
    function updatedBorrowBy(address user) public view returns (uint) {
        BorrowSnapshot storage snapshot = borrows[user];
        
        if (snapshot.principal == 0)
            return 0;
        
        uint newTotalBorrows;
        uint newBorrowIndex;
        
        (newTotalBorrows, newBorrowIndex) = calculateBorrowDataAtBlock(block.number);
        
        return snapshot.principal * newBorrowIndex / snapshot.interestIndex;
    }
    
    function updatedSupplyOf(address user) public view returns (uint) {
        SupplySnapshot storage snapshot = supplies[user];
        
        if (snapshot.supply == 0)
            return 0;
        
        uint newTotalSupply;
        uint newSupplyIndex;
        
        (newTotalSupply, newSupplyIndex) = calculateSupplyDataAtBlock(block.number);
        
        return snapshot.supply * newSupplyIndex / snapshot.interestIndex;
    }
    
    function setController(Controller _controller) public onlyOwner {
        controller = _controller;
    }
    
    function supply(uint amount) public {
        supplyInternal(msg.sender, amount);
    }
    
    function supplyInternal(address supplier, uint amount) internal {
        // TODO check msg.sender != this
        require(token.transferFrom(supplier, address(this), amount), "No enough tokens");

        accrueInterest();

        SupplySnapshot storage supplySnapshot = supplies[supplier];
        
        supplySnapshot.supply = updatedSupplyOf(supplier);
        supplies[supplier].supply += amount;
        supplies[supplier].interestIndex = supplyIndex;
        
        totalSupply += amount;
    }
    
    function redeem(uint amount) public {
        require(token.balanceOf(address(this)) >= amount);

        accrueInterest();

        SupplySnapshot storage supplySnapshot = supplies[msg.sender];
        
        if (supplySnapshot.supply > 0) {
            uint interest = supplySnapshot.supply * supplyIndex / supplySnapshot.interestIndex - supplySnapshot.supply;
            
            supplySnapshot.supply += interest;
            supplySnapshot.interestIndex = supplyIndex;
        }

        require(supplySnapshot.supply >= amount);
        
        require(token.transfer(msg.sender, amount), "No enough tokens");
        
        supplySnapshot.supply -= amount;
        supplySnapshot.interestIndex = supplyIndex;
        
        totalSupply -= amount;
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
        (totalSupply, supplyIndex) = calculateSupplyDataAtBlock(currentBlockNumber);
        
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
    
    function calculateSupplyDataAtBlock(uint newBlockNumber) internal view returns (uint newTotalSupply, uint newSupplyIndex) {
        if (newBlockNumber <= accrualBlockNumber)
            return (totalSupply, supplyIndex);
            
        if (totalSupply == 0)
            return (totalSupply, supplyIndex);
        
        uint blockDelta = newBlockNumber - accrualBlockNumber;
        
        uint simpleInterestFactor = blockDelta * supplyRatePerBlock();
        uint interestAccumulated = simpleInterestFactor * totalSupply / FACTOR;
        
        newSupplyIndex = simpleInterestFactor * supplyIndex / FACTOR + supplyIndex;        
        newTotalSupply = interestAccumulated + totalSupply;        
    }
    
    function getUpdatedTotalBorrows() public view returns (uint) {
        uint newTotalBorrows;
        uint newBorrowIndex;
        
        (newTotalBorrows, newBorrowIndex) = calculateBorrowDataAtBlock(block.number);
        
        return newTotalBorrows;
    }
    
    function getUpdatedTotalSupply() public view returns (uint) {
        uint newTotalSupply;
        uint newSupplyIndex;
        
        (newTotalSupply, newSupplyIndex) = calculateSupplyDataAtBlock(block.number);
        
        return newTotalSupply;
    }
    
    function payBorrow(uint amount) public {
        payBorrowInternal(msg.sender, msg.sender, amount);
    }
    
    function payBorrowInternal(address payer, address borrower, uint amount) internal {
        accrueInterest();

        BorrowSnapshot storage snapshot = borrows[borrower];
        
        require(snapshot.principal > 0);
        
        uint interest = snapshot.principal * borrowIndex / snapshot.interestIndex - snapshot.principal;
        
        snapshot.principal += interest;
        snapshot.interestIndex = borrowIndex;
        
        require(token.transferFrom(payer, address(this), amount), "No enough tokens");

        uint additional;
        
        if (snapshot.principal < amount) {
            additional = amount - snapshot.principal;
            amount = snapshot.principal;
        }
        
        snapshot.principal -= amount;        
        totalBorrows -= amount;
        
        if (additional > 0) {
            // TODO if payer != borrower update payer supply data
            supplies[payer].supply += additional;
            totalSupply += additional;
        }
    }
}

