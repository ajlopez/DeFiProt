
const Market = artifacts.require('./Market.sol');

contract('Market', function (accounts) {
    const alice = accounts[0];
    
    describe('initial balance zero', async function () {
        const market = await Market.new();
        
        const balance = await market.balanceOf(alice);
        
        assert.equal(balance, 0);
    });
});

