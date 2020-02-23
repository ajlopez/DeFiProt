
const Market = artifacts.require('./Market.sol');

contract('Market', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    
    beforeEach(async function() {
        this.market = await Market.new();
    });
    
    it('initial balance zero', async function () {
        const balance = await this.market.balanceOf(alice);
        
        assert.equal(balance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 0);
    });
    
    it('mint amount', async function () {
        await this.market.mint(1000, { from: alice });
        
        const aliceBalance = await this.market.balanceOf(alice);
        const bobBalance = await this.market.balanceOf(bob);
        
        assert.equal(aliceBalance, 1000);
        assert.equal(bobBalance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 1000);
    });
});

