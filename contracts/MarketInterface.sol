pragma solidity >=0.5.0 <0.6.0;

interface MarketInterface {
    function supplyOf(address account) external view returns (uint);
    function borrowBy(address account) external view returns (uint);
    function updatedSupplyOf(address account) external view returns (uint);
    function updatedBorrowBy(address account) external view returns (uint);
}

