pragma solidity >=0.5.0 <0.6.0;

interface MarketInterface {
    function depositsBy(address account) external view returns (uint);
    function borrowsBy(address account) external view returns (uint);
}

