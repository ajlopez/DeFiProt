
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./Controller.sol');
const NonMarket = artifacts.require('./test/NonMarket.sol');

const expectThrow = require('./utils').expectThrow;

contract('Controller', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    const charlie = accounts[2];

    const MANTISSA = 1000000;
    const FACTOR = 1000000000000000000;
    const BLOCKS_PER_YEAR = 1000000;
    const ANNUAL_RATE = "1000000000000000000000"; // FACTOR / 1000 * BLOCKS_PER_YEAR
    const UTILIZATION_RATE_FRACTION = "1000000000000000000000"; // FACTOR / 1000 * BLOCKS_PER_YEAR

    describe('contract dependency validation', function() {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.controller = await Controller.new();
            this.nonMarket = await NonMarket.new();
        });

        it('should not allow adding a non market contract to the controller', async function() {
            expectThrow(this.controller.addMarket(this.nonMarket.address));
            const result = await this.controller.marketListSize();
            assert.equal(result, 0);
        });
    });

    describe('one token and one market', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.controller = await Controller.new();
        });

        it('mantissa', async function () {
            assert.equal(await this.controller.MANTISSA(), MANTISSA);
        });

        it('no market', async function () {
            const result = await this.controller.markets(this.market.address);

            assert.ok(!result);

            const marketByToken = await this.controller.marketsByToken(this.token.address);

            assert.equal(marketByToken, 0);
        });

        it('no price', async function () {
            const result = await this.controller.prices(this.token.address);

            assert.equal(result, 0);
        });

        it('add market', async function () {
            await this.controller.addMarket(this.market.address);

            const result = await this.controller.markets(this.market.address);

            assert.ok(result);

            const result2 = await this.controller.marketList(0);

            assert.equal(result2, this.market.address);

            const marketByToken = await this.controller.marketsByToken(this.token.address);

            assert.equal(marketByToken, this.market.address);
        });

        it('cannot add market with token in another market', async function () {
            await this.controller.addMarket(this.market.address);
            const newMarket = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);

            expectThrow(this.controller.addMarket(newMarket.address));

            const result = await this.controller.markets(this.market.address);

            assert.ok(result);

            const result2 = await this.controller.marketList(0);

            assert.equal(result2, this.market.address);
        });

        it('only owner could add market', async function () {
            expectThrow(this.controller.addMarket(this.market.address, { from: bob }));

            const result = await this.controller.markets(this.market.address);

            assert.ok(!result);
        });

        it('initial collateral factor', async function () {
            const factor = await this.controller.collateralFactor();

            assert.equal(factor, 0);
        });

        it('set collateral factor', async function () {
            await this.controller.setCollateralFactor(1 * MANTISSA);

            const factor = await this.controller.collateralFactor();

            assert.equal(factor, 1 * MANTISSA);
        });

        it('only owner can set collateral factor', async function () {
            expectThrow(this.controller.setCollateralFactor(1 * MANTISSA, { from: bob }));

            const factor = await this.controller.collateralFactor();

            assert.equal(factor, 0);
        });

        it('initial liquidation factor', async function () {
            const factor = await this.controller.liquidationFactor();

            assert.equal(factor, 0);
        });

        it('set liquidation factor', async function () {
            await this.controller.setLiquidationFactor(1 * MANTISSA);

            const factor = await this.controller.liquidationFactor();

            assert.equal(factor, 1 * MANTISSA);
        });

        it('only owner can set liquidation factor', async function () {
            expectThrow(this.controller.setLiquidationFactor(1 * MANTISSA, { from: bob }));

            const factor = await this.controller.liquidationFactor();

            assert.equal(factor, 0);
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

    describe('two tokens and two markets', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.token2 = await Token.new(1000000, "Token 2", 0, "TOK2");

            await this.token.allocateTo(bob, 1000000);
            await this.token2.allocateTo(bob, 1000000);

            await this.token.allocateTo(charlie, 1000000);
            await this.token2.allocateTo(charlie, 1000000);

            this.market = await Market.new(this.token.address, 1000 * BLOCKS_PER_YEAR, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.market2 = await Market.new(this.token2.address, 1000 * BLOCKS_PER_YEAR, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);

            this.controller = await Controller.new();
            await this.controller.addMarket(this.market.address);
            await this.market.setController(this.controller.address);
            await this.controller.addMarket(this.market2.address);
            await this.market2.setController(this.controller.address);

            await this.controller.setPrice(this.market.address, 10);
            await this.controller.setPrice(this.market2.address, 20);

            await this.controller.setCollateralFactor(1 * MANTISSA);
            await this.controller.setLiquidationFactor(MANTISSA / 2);
        });
        
        it('initial health factor', async function () {
            const factor = await this.controller.getAccountHealth(bob);
            
            assert.equal(factor, 0);
        });

        it('should have two markets registered', async function() {
            const result = await this.controller.marketListSize({ from: alice });
            assert.equal(result, 2);
        });

        it('account liquidity using supply', async function () {
            const result = await this.controller.getAccountLiquidity(alice);

            assert.equal(result, 0);

            await this.token.approve(this.market.address, 100, { from: alice });
            await this.market.supply(100, { from: alice });

            const result2 = await this.controller.getAccountLiquidity(alice);

            assert.equal(result2, 100 * 10);

            await this.token2.approve(this.market2.address, 100, { from: alice });
            await this.market2.supply(100, { from: alice });

            const result3 = await this.controller.getAccountLiquidity(alice);

            assert.equal(result3, 100 * 10 + 100 * 20);
        });

        it('account liquidity using supply and borrows', async function () {
            const result = await this.controller.getAccountLiquidity(alice);

            assert.equal(result, 0);

            await this.token.approve(this.market.address, 100, { from: alice });
            await this.market.supply(100, { from: alice });

            await this.token2.approve(this.market2.address, 1000, { from: bob });
            await this.market2.supply(1000, { from: bob });

            const result2 = await this.controller.getAccountLiquidity(alice);

            assert.equal(result2, 100 * 10);

            await this.market2.borrow(10, { from: alice });

            const result3 = await this.controller.getAccountLiquidity(alice);

            assert.equal(result3, 100 * 10 - 10 * 20 * 2);
        });

        it('account liquidity as zero when supply value is less than borrow value scaled by collateral factor', async function () {
            await this.token.approve(this.market.address, 100, { from: alice });
            await this.market.supply(100, { from: alice });

            await this.token2.approve(this.market2.address, 1000, { from: bob });
            await this.market2.supply(1000, { from: bob });

            await this.market2.borrow(10, { from: alice });

            await this.controller.setPrice(this.market.address, 0);

            const result = await this.controller.getAccountLiquidity(alice);

            assert.equal(result, 0);
        });

        it('initial account values', async function () {
            const result = await this.controller.getAccountValues(alice);

            assert.equal(result.supplyValue, 0);
            assert.equal(result.borrowValue, 0);
        });

        it('account values using supply and borrows', async function () {
            await this.token.approve(this.market.address, 100, { from: alice });
            await this.market.supply(100, { from: alice });

            await this.token2.approve(this.market2.address, 1000, { from: bob });
            await this.market2.supply(1000, { from: bob });

            await this.market2.borrow(10, { from: alice });

            const result = await this.controller.getAccountValues(alice);

            assert.equal(result.supplyValue, 100 * 10);
            assert.equal(result.borrowValue, 10 * 20);
        });
    });
});

