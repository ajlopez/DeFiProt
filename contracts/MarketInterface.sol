pragma solidity >=0.5.0 <0.6.0;

interface MarketInterface {
    function lock(address user, uint amount) external;
}