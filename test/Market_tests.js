
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
        this.controller = await Controller.new();
    });
    
    it('initial balance zero', async function () {
        const balance = await this.market.balanceOf(alice);
        
        assert.equal(balance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 0);
    });
    
    it('mint amount', async function () {
        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        
        const aliceBalance = await this.market.balanceOf(alice);
        const bobBalance = await this.market.balanceOf(bob);
        
        assert.equal(aliceBalance, 1000);
        assert.equal(bobBalance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 1000);
    });
    
    it('cannot mint amount without enough tokens', async function () {
        await this.token.approve(this.market.address, 500, { from: alice });
        expectThrow(this.market.mint(1000, { from: alice }));
        
        const aliceBalance = await this.market.balanceOf(alice);
        const bobBalance = await this.market.balanceOf(bob);
        
        assert.equal(aliceBalance, 0);
        assert.equal(bobBalance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 0);
    });
    
    it('redeem amount', async function () {
        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        
        const tokenAliceBalance = await this.token.balanceOf(alice);
        const aliceBalance = await this.market.balanceOf(alice);
        const bobBalance = await this.market.balanceOf(bob);
        
        assert.equal(tokenAliceBalance, 1000000 - 1000);
        assert.equal(aliceBalance, 1000);
        assert.equal(bobBalance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 1000);
        
        await this.market.redeem(500, { from: alice });
                
        const newTokenAliceBalance = await this.token.balanceOf(alice);
        const newAliceBalance = await this.market.balanceOf(alice);
        const newBobBalance = await this.market.balanceOf(bob);
        
        assert.equal(newTokenAliceBalance, 1000000 - 500);
        assert.equal(newAliceBalance, 500);
        assert.equal(newBobBalance, 0);
        
        const newTotalSupply = await this.market.totalSupply();
        
        assert.equal(newTotalSupply, 500);
    });
    
    it('cannot redeem amount without enough balance', async function () {
        await this.token.approve(this.market.address, 1000, { from: alice });
        await this.market.mint(1000, { from: alice });
        
        const tokenAliceBalance = await this.token.balanceOf(alice);
        const aliceBalance = await this.market.balanceOf(alice);
        const bobBalance = await this.market.balanceOf(bob);
        
        assert.equal(tokenAliceBalance, 1000000 - 1000);
        assert.equal(aliceBalance, 1000);
        assert.equal(bobBalance, 0);
        
        const totalSupply = await this.market.totalSupply();
        
        assert.equal(totalSupply, 1000);
        
        expectThrow(this.market.redeem(5000, { from: alice }));
                
        const newTokenAliceBalance = await this.token.balanceOf(alice);
        const newAliceBalance = await this.market.balanceOf(alice);
        const newBobBalance = await this.market.balanceOf(bob);
        
        assert.equal(newTokenAliceBalance, 1000000 - 1000);
        assert.equal(newAliceBalance, 1000);
        assert.equal(newBobBalance, 0);
        
        const newTotalSupply = await this.market.totalSupply();
        
        assert.equal(newTotalSupply, 1000);
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
        expectThrow(this.market.setController(this.controller));
        
        const controller = await this.market.controller();
        
        assert.equal(controller, 0);
    });
});

