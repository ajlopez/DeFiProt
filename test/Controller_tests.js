
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./test/Controller.sol');

const expectThrow = require('./utils').expectThrow;

contract('Controller', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    
    beforeEach(async function() {
        this.token = await Token.new(1000000, "Token", 0, "TOK");
        this.market = await Market.new(this.token.address);
        this.controller = await Controller.new();
    });
    
    it('no market', async function () {
        const result = await this.controller.markets(this.market.address);
        
        assert.ok(!result);
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
});

