
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./Controller.sol');

const expectThrow = require('./utils').expectThrow;

contract('Market', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    
    beforeEach(async function() {
        this.token = await Token.new(1000000, "Token", 0, "TOK");
        this.market = await Market.new(this.token.address);
        this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
        this.market2 = await Market.new(this.token2.address);
        this.controller = await Controller.new();
    });
    
    it('initial deposits are zero', async function () {
        const deposits = await this.market.depositsOf(alice);
        
        assert.equal(deposits, 0);
        
        const marketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(marketBalance, 0);
    });
    
    it('mint amount', async function () {
        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        
        const aliceDeposits = await this.market.depositsOf(alice);
        const bobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(aliceDeposits, 1000);
        assert.equal(bobDeposits, 0);
        
        const marketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(marketBalance, 1000);
    });
    
    it('cannot mint amount without enough tokens', async function () {
        await this.token.approve(this.market.address, 500, { from: alice });
        expectThrow(this.market.mint(1000, { from: alice }));
        
        const aliceDeposits = await this.market.depositsOf(alice);
        const bobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(aliceDeposits, 0);
        assert.equal(bobDeposits, 0);
        
        const marketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(marketBalance, 0);
    });
    
    it('redeem amount', async function () {
        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        
        const tokenAliceBalance = await this.token.balanceOf(alice);
        const aliceDeposits = await this.market.depositsOf(alice);
        const bobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(tokenAliceBalance, 1000000 - 1000);
        assert.equal(aliceDeposits, 1000);
        assert.equal(bobDeposits, 0);
        
        const marketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(marketBalance, 1000);
        
        await this.market.redeem(500, { from: alice });
                
        const newTokenAliceBalance = await this.token.balanceOf(alice);
        const newAliceDeposits = await this.market.depositsOf(alice);
        const newBobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(newTokenAliceBalance, 1000000 - 500);
        assert.equal(newAliceDeposits, 500);
        assert.equal(newBobDeposits, 0);
        
        const newMarketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(newMarketBalance, 500);
    });
    
    it('cannot redeem amount without enough deposits', async function () {
        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        await this.token.transfer(bob, 1000);

        const tokenAliceBalance = await this.token.balanceOf(alice);
        assert.equal(tokenAliceBalance, 1000000 - 2000);

        const tokenBobBalance = await this.token.balanceOf(bob);
        assert.equal(tokenBobBalance, 1000);
        
        await this.token.approve(this.market.address, 1000, { from: bob });
        await this.market.mint(1000, { from: bob });
        
        const aliceDeposits = await this.market.depositsOf(alice);
        const bobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(aliceDeposits, 1000);
        assert.equal(bobDeposits, 1000);
        
        const marketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(marketBalance, 2000);
        
        expectThrow(this.market.redeem(1500, { from: alice }));
                
        const newTokenAliceBalance = await this.token.balanceOf(alice);
        const newAliceDeposits = await this.market.depositsOf(alice);
        const newBobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(newTokenAliceBalance, 1000000 - 2000);
        assert.equal(newAliceDeposits, 1000);
        assert.equal(newBobDeposits, 1000);
        
        const newMarketBalance = await this.token.balanceOf(this.market.address);
        
        assert.equal(newMarketBalance, 2000);
    });
    
    it('no controller', async function () {
        const controller = await this.market.controller();
        
        assert.equal(controller, 0);
    });
    
    it('set controller', async function () {
        await this.market.setController(this.controller.address);
        
        const controller = await this.market.controller();
        
        assert.equal(controller, this.controller.address);
    });
    
    it('only owner can set controller', async function () {
        expectThrow(this.market.setController(this.controller, { from: bob }));
        
        const controller = await this.market.controller();
        
        assert.equal(controller, 0);
    });
    
    it('borrow from market using other market as collateral', async function () {
        await this.market.setController(this.controller.address);
        await this.market2.setController(this.controller.address);
        await this.controller.addMarket(this.market.address);
        await this.controller.addMarket(this.market2.address);

        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        await this.token2.approve(this.market2.address, 4000, { from: bob });
        await this.market2.mint(4000, { from: bob });

        await this.market.borrow(500, this.market2.address, { from: bob });
        
        const aliceDeposits = await this.market.depositsOf(alice);
        const bobDeposits = await this.market.depositsOf(bob);
        
        assert.equal(aliceDeposits, 1000);
        assert.equal(bobDeposits, 0);
        
        const aliceDeposits2 = await this.market2.depositsOf(alice);
        const bobDeposits2 = await this.market2.depositsOf(bob);
        
        assert.equal(aliceDeposits2, 0);
        assert.equal(bobDeposits2, 4000 - 500 * 2);
        
        const newBobTokenBalance = await this.token.balanceOf(bob);
        
        assert.equal(newBobTokenBalance, 500);
    });
});

