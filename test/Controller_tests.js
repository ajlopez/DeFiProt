
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./test/Controller.sol');

const expectThrow = require('./utils').expectThrow;

contract('Controller', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];

    describe('one token and one market', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address);
            this.controller = await Controller.new();
        });
        
        it('no market', async function () {
            const result = await this.controller.markets(this.market.address);
            
            assert.ok(!result);
        });
        
        it('no price', async function () {
            const result = await this.controller.prices(this.token.address);
            
            assert.equal(result, 0);
        });
        
        it('add market', async function () {
            await this.controller.addMarket(this.market.address);
            
            const result = await this.controller.markets(this.market.address);
            
            assert.ok(result);
        });
        
        it('only owner could add market', async function () {
            expectThrow(this.controller.addMarket(this.market.address, { from: bob }));
            
            const result = await this.controller.markets(this.market.address);
            
            assert.ok(!result);
        });
        
        it('set asset price', async function () {
            await this.controller.addMarket(this.market.address);
            await this.controller.setPrice(this.market.address, 100);
            
            const result = await this.controller.prices(this.market.address);
            
            assert.equal(result, 100);
        });
        
        it('only owner can set asset price', async function () {
            await this.controller.addMarket(this.market.address);
            expectThrow(this.controller.setPrice(this.market.address, 100, { from: bob }));
            
            const result = await this.controller.prices(this.market.address);
            
            assert.equal(result, 0);
        });
        
        it('only a market can have asset price', async function () {
            expectThrow(this.controller.setPrice(this.token.address, 100));
            
            const result = await this.controller.prices(this.token.address);
            
            assert.equal(result, 0);
        });
    });
});

