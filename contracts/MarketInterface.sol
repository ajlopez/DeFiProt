pragma solidity >=0.5.0 <0.6.0;

interface MarketInterface {
    function transferToMarket(address user, address market, uint amount) external;
    function balanceOf(address account) external view returns (uint);
    function borrowedBy(address account) external view returns (uint);
}