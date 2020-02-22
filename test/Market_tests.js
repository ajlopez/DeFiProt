
const Market = artifacts.require('./Market.sol');

contract('Market', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    
    it('initial balance zero', async function () {
        const market = await Market.new();
        
        const balance = await market.balanceOf(alice);
        
        assert.equal(balance, 0);
    });
    
    it('mint amount', async function () {
        const market = await Market.new();
        
        await market.mint(1000, { from: alice });
        
        const aliceBalance = await market.balanceOf(alice);
        const bobBalance = await market.balanceOf(bob);
        
        assert.equal(aliceBalance, 1000);
        assert.equal(bobBalance, 0);
    });
});

