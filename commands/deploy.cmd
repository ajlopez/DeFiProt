node deploy root controller Controller

node invoke root controller setCollateralFactor(uint256) 1000000 fast
node invoke root controller setLiquidationFactor(uint256) 500000 fast

node deploy root market1 Market token1;1000000000000000
node invoke root controller addMarket(address) market1 fast
node invoke root market1 setController(address) controller fast
node invoke root controller setPrice(address,uint256) market1;10 fast

node deploy root market2 Market token2;1000000000000000
node invoke root controller addMarket(address) market2 fast
node invoke root market2 setController(address) controller fast
node invoke root controller setPrice(address,uint256) market2;20 fast

node deploy root market3 Market token3;1000000000000000
node invoke root controller addMarket(address) market3 fast
node invoke root market3 setController(address) controller fast
node invoke root controller setPrice(address,uint256) market3;30 fast

