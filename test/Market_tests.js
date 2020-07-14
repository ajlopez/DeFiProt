
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./Controller.sol');

const expectThrow = require('./utils').expectThrow;

contract('Market', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    const charlie = accounts[2];

    const MANTISSA = 1000000;
    const FACTOR = 1000000000000000000;
    const BLOCKS_PER_YEAR = 1000000;
    const ANNUAL_RATE = "1000000000000000000000"; // FACTOR / 1000 * BLOCKS_PER_YEAR
    const UTILIZATION_RATE_FRACTION = "1000000000000000000000"; // FACTOR / 1000 * BLOCKS_PER_YEAR

    describe('validate proper token erc20 contract passed as parameter', function() {
        it('should avoid creating a market upon non erc20 smart contract passed', async function() {
            const controller = await Controller.new();
            expectThrow(Market.new(controller.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION));
        });
    });

    describe('initial state', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);

            this.controller = await Controller.new();
            await this.controller.setCollateralFactor(1 * MANTISSA);
            await this.controller.setLiquidationFactor(MANTISSA / 2);

            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
        });

        it('initial supply are zero', async function () {
            const supply = await this.market.supplyOf(alice);

            assert.equal(supply, 0);

            const marketBalance = await this.token.balanceOf(this.market.address);

            assert.equal(marketBalance, 0);

            const totalSupply = await this.market.totalSupply();

            assert.equal(totalSupply, 0);
        });

        it('market factor', async function () {
            const factor = await this.market.FACTOR();

            assert.equal(factor, 1e18);
        });

        it('initial cash', async function () {
            const cash = await this.market.getCash();

            assert.equal(cash, 0);
        });

        it('initial supply index', async function () {
            const supplyIndex = await this.market.supplyIndex();

            assert.equal(supplyIndex, FACTOR);
        });

        it('initial borrow index', async function () {
            const borrowIndex = await this.market.borrowIndex();

            assert.equal(borrowIndex, FACTOR);
        });

        it('base borrow rate', async function () {
            const borrowRate = await this.market.baseBorrowRate();

            assert.equal(borrowRate, FACTOR / 1000);
        });

        it('initial borrow rate per block', async function () {
            const borrowRate = await this.market.borrowRatePerBlock();

            assert.equal(borrowRate, FACTOR / 1000);
        });

        it('initial supply rate per block', async function () {
            const supplyRate = await this.market.supplyRatePerBlock();

            assert.equal(supplyRate, 0);
        });

        it('initial accrual block number', async function () {
            const accrualBlockNumber = await this.market.accrualBlockNumber();

            assert.ok(accrualBlockNumber > 0);
        });

        it('initial borrows are zero', async function () {
            const borrows = await this.market.borrowBy(alice);

            assert.equal(borrows, 0);

            const updatedBorrows = await this.market.updatedBorrowBy(alice);

            assert.equal(updatedBorrows, 0);
        });

        it('utilization rate', async function () {
            assert.equal(await this.market.utilizationRate(0, 0, 0), 0);
            assert.equal(await this.market.utilizationRate(1000, 1000, 0), FACTOR / 2);
            assert.equal(await this.market.utilizationRate(2000, 1000, 1000), FACTOR / 2);
        }),

        it('get borrow rate', async function () {
            assert.equal(await this.market.getBorrowRate(0, 0, 0), FACTOR / 1000);
            assert.equal((await this.market.getBorrowRate(1000, 1000, 0)).toNumber(), FACTOR / 2 / 1000 + FACTOR / 1000);
            assert.equal(await this.market.getBorrowRate(2000, 1000, 1000), FACTOR / 2 / 1000 + FACTOR / 1000);
        }),

        it('get supply rate', async function () {
            assert.equal(await this.market.getSupplyRate(0, 0, 0), 0);
            assert.equal(await this.market.getSupplyRate(1000, 1000, 0), 1 / 2 * (FACTOR / 2 / 1000 + FACTOR / 1000));
            assert.equal(await this.market.getSupplyRate(2000, 1000, 1000), 1 / 2 * (FACTOR / 2 / 1000 + FACTOR / 1000));
        }),

        it('supply token amount', async function () {
            await this.token.approve(this.market.address, 1000, { from: alice });
            const supplyResult = await this.market.supply(1000, { from: alice });

            assert.ok(supplyResult);
            assert.ok(supplyResult.logs);            assert.equal(supplyResult.logs.length, 1);
            assert.equal(supplyResult.logs[0].event, 'Supply');
            assert.equal(supplyResult.logs[0].address, this.market.address);
            assert.equal(supplyResult.logs[0].args.user, alice);
            assert.equal(supplyResult.logs[0].args.amount, 1000);

            const aliceMarketSupply = await this.market.supplyOf(alice);
            const bobMarketSupply = await this.market.supplyOf(bob);

            assert.equal(aliceMarketSupply, 1000);
            assert.equal(bobMarketSupply, 0);

            const marketBalance = await this.token.balanceOf(this.market.address);

            assert.equal(marketBalance, 1000);

            const totalSupply = await this.market.totalSupply();

            assert.equal(totalSupply, 1000);

            const cash = await this.market.getCash();

            assert.equal(cash, 1000);

            const borrowRate = await this.market.borrowRatePerBlock();

            assert.equal(borrowRate, FACTOR / 1000);
        });

        it('cannot supply token amount without enough tokens', async function () {
            await this.token.approve(this.market.address, 500, { from: alice });
            expectThrow(this.market.supply(1000, { from: alice }));

            const aliceMarketSupply = await this.market.supplyOf(alice);
            const bobMarketSupply = await this.market.supplyOf(bob);

            assert.equal(aliceMarketSupply, 0);
            assert.equal(bobMarketSupply, 0);

            const marketBalance = await this.token.balanceOf(this.market.address);

            assert.equal(marketBalance, 0);

            const totalSupply = await this.market.totalSupply();

            assert.equal(totalSupply, 0);

            const cash = await this.market.getCash();

            assert.equal(cash, 0);
        });

        it('redeem token amount', async function () {
            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);

            await this.token.approve(this.market.address, 1000, { from: alice });
            await this.market.supply(1000, { from: alice });

            const tokenAliceBalance = await this.token.balanceOf(alice);
            const aliceMarketSupply = await this.market.supplyOf(alice);
            const bobMarketSupply = await this.market.supplyOf(bob);

            assert.equal(tokenAliceBalance, 1000000 - 1000);
            assert.equal(aliceMarketSupply, 1000);
            assert.equal(bobMarketSupply, 0);

            const marketBalance = await this.token.balanceOf(this.market.address);

            assert.equal(marketBalance, 1000);

            const redeemResult = await this.market.redeem(500, { from: alice });

            assert.ok(redeemResult);
            assert.ok(redeemResult.logs);
            assert.equal(redeemResult.logs.length, 1);
            assert.equal(redeemResult.logs[0].event, 'Redeem');
            assert.equal(redeemResult.logs[0].address, this.market.address);
            assert.equal(redeemResult.logs[0].args.user, alice);
            assert.equal(redeemResult.logs[0].args.amount, 500);

            const newTokenAliceBalance = (await this.token.balanceOf(alice)).toNumber();
            const newAliceMarketSupply = (await this.market.supplyOf(alice)).toNumber();
            const newBobMarketSupply = (await this.market.supplyOf(bob)).toNumber();

            assert.equal(newTokenAliceBalance, 1000000 - 500);
            assert.equal(newAliceMarketSupply, 500);
            assert.equal(newBobMarketSupply, 0);

            const newMarketBalance = await this.token.balanceOf(this.market.address);

            assert.equal(newMarketBalance, 500);

            const newTotalSupply = await this.market.totalSupply();

            assert.equal(newTotalSupply, 500);

            const cash = await this.market.getCash();

            assert.equal(cash, 500);
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
    });

    describe('two markets with supply', function () {
        let creationBlock;
        let creationBlock2;

        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.controller = await Controller.new();

            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);
            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
            await this.controller.setCollateralFactor(1 * MANTISSA);
            await this.controller.setLiquidationFactor(MANTISSA / 2);

            await this.token.approve(this.market.address, 2000, { from: alice });
            await this.market.supply(2000, { from: alice });
            await this.token2.approve(this.market2.address, 4000, { from: bob });
            await this.market2.supply(4000, { from: bob });

            creationBlock = (await this.market.accrualBlockNumber()).toNumber();
            creationBlock2 = (await this.market2.accrualBlockNumber()).toNumber();
        });

        it('cannot redeem token amount without enough liquidity', async function () {
            await this.market2.borrow(1, { from: alice });

            const aliceSupply = await this.market.supplyOf(alice);

            assert.equal(aliceSupply, 2000);

            await this.controller.setPrice(this.market.address, 0);

            expectThrow(this.market.redeem(1500, { from: alice }));

            const newTokenAliceBalance = await this.token.balanceOf(alice);
            const newAliceMarketSupply = await this.market.supplyOf(alice);

            assert.equal(newTokenAliceBalance, 1000000 - 2000);
            assert.equal(newAliceMarketSupply, 2000);
        });


        it('borrow from market using other market as collateral', async function () {
            const borrowResult = await this.market.borrow(1000, { from: bob });
            
            assert.ok(borrowResult);
            assert.ok(borrowResult.logs);
            assert.ok(borrowResult.logs.length);
            assert.equal(borrowResult.logs[0].event, 'Borrow');
            assert.equal(borrowResult.logs[0].address, this.market.address);
            assert.equal(borrowResult.logs[0].args.user, bob);
            assert.equal(borrowResult.logs[0].args.amount, 1000);
            
            const totalBorrows = await this.market.totalBorrows();

            assert.equal(totalBorrows, 1000);

            const borrowed = await this.market.borrowBy(bob);

            assert.equal(borrowed, 1000);

            const cash = await this.market.getCash();

            assert.equal(cash, 1000);

            const updatedBorrowed = await this.market.updatedBorrowBy(bob);

            assert.ok(updatedBorrowed.toNumber() >= 1000);

            const aliceMarketSupply = await this.market.supplyOf(alice);
            const bobMarketSupply = await this.market.supplyOf(bob);

            assert.equal(aliceMarketSupply, 2000);
            assert.equal(bobMarketSupply, 0);

            const aliceMarketSupply2 = await this.market2.supplyOf(alice);
            const bobMarketSupply2 = await this.market2.supplyOf(bob);

            assert.equal(aliceMarketSupply2, 0);
            assert.equal(bobMarketSupply2, 4000);

            const newBobTokenBalance = await this.token.balanceOf(bob);

            assert.equal(newBobTokenBalance, 1000);

            const newTotalSupply = await this.market.totalSupply();

            assert.equal(newTotalSupply, 2000);

            const bobLiquidity = await this.controller.getAccountLiquidity(bob);

            assert.equal(bobLiquidity, 4000 * 2 - 1000 * 2);

            const borrowRate = (await this.market.borrowRatePerBlock()).toNumber();

            assert.equal(borrowRate, Math.floor(FACTOR * 1000 / (1000 + 1000) / 1000) + FACTOR / 1000);
            
            const result = await this.controller.getAccountValues(bob);

            assert.equal(result.supplyValue, 8000);
            assert.equal(result.borrowValue, 1000);
            
            const healthFactor = (await this.controller.getAccountHealth(bob)).toNumber();

            assert.ok(healthFactor > MANTISSA);
        });

        it('accrue interest', async function () {
            await this.market.borrow(1000, { from: bob });

            const borrowIndex = parseInt((await this.market.borrowIndex()).toString());
            const borrowRate = (await this.market.borrowRatePerBlock()).toNumber();
            const totalBorrows = (await this.market.totalBorrows()).toNumber();

            const supplyIndex = parseInt((await this.market.supplyIndex()).toString());
            const supplyRate = (await this.market.supplyRatePerBlock()).toNumber();
            const totalSupply = (await this.market.totalSupply()).toNumber();

            assert.equal(totalBorrows, 1000);
            assert.equal(totalSupply, 2000);

            const borrowed = await this.market.borrowBy(bob);

            assert.equal(borrowed, 1000);

            const accrualBlockNumber = (await this.market.accrualBlockNumber()).toNumber();

            console.log('creation block', creationBlock);
            console.log('accrual block after borrow', accrualBlockNumber);

            assert.ok(creationBlock < accrualBlockNumber);

            await this.market.accrueInterest();

            const newAccrualBlockNumber = (await this.market.accrualBlockNumber()).toNumber();
            console.log('accrual block after accrue interest', newAccrualBlockNumber);

            assert.ok(accrualBlockNumber < newAccrualBlockNumber);

            const newTotalBorrows = (await this.market.totalBorrows()).toNumber();
            const updatedTotalBorrows = (await this.market.getUpdatedTotalBorrows()).toNumber();
            const updatedBobBorrows = (await this.market.updatedBorrowBy(bob)).toNumber();

            const newTotalSupply = (await this.market.totalSupply()).toNumber();
            const updatedTotalSupply = (await this.market.getUpdatedTotalSupply()).toNumber();
            const updatedAliceSupply = (await this.market.updatedSupplyOf(alice)).toNumber();

            assert.ok(newTotalBorrows > totalBorrows);
            assert.ok(updatedTotalBorrows > totalBorrows);
            assert.ok(updatedBobBorrows > totalBorrows);

            assert.ok(newTotalSupply > totalSupply);
            assert.ok(updatedTotalSupply > totalSupply);
            assert.ok(updatedAliceSupply > totalSupply);

            const newBorrowIndex = parseInt((await this.market.borrowIndex()).toString());
            const newSupplyIndex = parseInt((await this.market.supplyIndex()).toString());

            console.log('borrow index', borrowIndex);
            console.log('borrow index after accrue interest', newBorrowIndex);
            console.log('total borrows', totalBorrows);
            console.log('total borrows after accrue interest', newTotalBorrows);

            console.log('supply index', supplyIndex);
            console.log('supply index after accrue interest', newSupplyIndex);

            console.log('updated bob borrows', updatedBobBorrows);
            console.log('updated alice supply', updatedAliceSupply);

            assert.ok(newBorrowIndex > borrowIndex);
            assert.ok(newSupplyIndex > supplyIndex);

            const blockDelta = newAccrualBlockNumber - accrualBlockNumber;
            const simpleInterestFactor = borrowRate * blockDelta;
            const interestAccumulated = Math.floor(simpleInterestFactor * totalBorrows / FACTOR);

            assert.equal(newTotalBorrows, Math.floor(totalBorrows + interestAccumulated));
            assert.equal(newBorrowIndex, Math.floor(simpleInterestFactor * borrowIndex / FACTOR) + borrowIndex);
        });

        it('borrow twice', async function () {
            await this.market.borrow(1000, { from: bob });
            await this.market.borrow(1000, { from: bob });

            const totalBorrows = (await this.market.totalBorrows()).toNumber();
            const borrowed = (await this.market.borrowBy(bob)).toNumber();

            assert.ok(totalBorrows > 2000);
            assert.equal(totalBorrows, borrowed);
        });
    });

    describe('pay borrow', function () {
        let creationBlock;
        let creationBlock2;

        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.controller = await Controller.new();

            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);
            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
            await this.controller.setCollateralFactor(1 * MANTISSA);
            await this.controller.setLiquidationFactor(MANTISSA / 2);

            await this.token.approve(this.market.address, 2000, { from: alice });
            await this.market.supply(2000, { from: alice });
            await this.token2.approve(this.market2.address, 4000, { from: bob });
            await this.market2.supply(4000, { from: bob });

            creationBlock = (await this.market.accrualBlockNumber()).toNumber();
            creationBlock2 = (await this.market2.accrualBlockNumber()).toNumber();

            await this.market.borrow(1000, { from: bob });
        });

        it('cannot pay no borrow', async function () {
            expectThrow(this.market.payBorrow(1000, { from: alice }));

            const totalBorrows = await this.market.totalBorrows();

            assert.equal(totalBorrows, 1000);
        });

        it('pay borrow', async function () {
            await this.token.approve(this.market.address, 1000, { from: bob });
            const payBorrowResult = await this.market.payBorrow(1000, { from: bob });

            assert.ok(payBorrowResult);
            assert.ok(payBorrowResult.logs);
            assert.ok(payBorrowResult.logs.length);
            assert.equal(payBorrowResult.logs[0].event, 'PayBorrow');
            assert.equal(payBorrowResult.logs[0].address, this.market.address);
            assert.equal(payBorrowResult.logs[0].args.user, bob);
            assert.equal(payBorrowResult.logs[0].args.amount, 1000);

            const totalBorrows = (await this.market.totalBorrows()).toNumber();
            const borrowsByBob = (await this.market.borrowBy(bob)).toNumber();

            console.log('total borrows', totalBorrows);
            console.log('borrows by bob', borrowsByBob);

            assert.ok(totalBorrows > 0);
            assert.ok(borrowsByBob > 0);
            assert.ok(totalBorrows < 1000);
            assert.ok(borrowsByBob < 1000);
            assert.equal(totalBorrows, borrowsByBob);

            const cash = await this.market.getCash();

            assert.equal(cash, 2000);
        });

        it('pay too much', async function () {
            await this.token.allocateTo(bob, 10000);
            await this.token.approve(this.market.address, 2000, { from: bob });
            const payBorrowResult = await this.market.payBorrow(2000, { from: bob });

            assert.ok(payBorrowResult);
            assert.ok(payBorrowResult.logs);
            assert.ok(payBorrowResult.logs.length);
            assert.equal(payBorrowResult.logs[0].event, 'PayBorrow');
            assert.equal(payBorrowResult.logs[0].address, this.market.address);
            assert.equal(payBorrowResult.logs[0].args.user, bob);
            assert.equal(payBorrowResult.logs[0].args.amount.toNumber(), 1004);
            assert.equal(payBorrowResult.logs[1].event, 'Supply');
            assert.equal(payBorrowResult.logs[1].address, this.market.address);
            assert.equal(payBorrowResult.logs[1].args.user, bob);
            assert.equal(payBorrowResult.logs[1].args.amount.toNumber(), 996);

            const totalBorrows = (await this.market.totalBorrows()).toNumber();
            const lendingsByBob = (await this.market.supplyOf(bob)).toNumber();
            const borrowsByBob = (await this.market.borrowBy(bob)).toNumber();

            console.log('total borrows', totalBorrows);
            console.log('bob supply', lendingsByBob);

            assert.equal(totalBorrows, 0);
            assert.equal(borrowsByBob, 0);
            assert.ok(lendingsByBob > 900);
            assert.ok(lendingsByBob < 1000);

            const cash = await this.market.getCash();

            assert.equal(cash, 3000);

            const totalSupply = await this.market.totalSupply();

            assert.equal(totalSupply, 3000);
        });
    });
    
    describe('liquidate borrow', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, ANNUAL_RATE, BLOCKS_PER_YEAR, UTILIZATION_RATE_FRACTION);
            this.controller = await Controller.new();

            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);
            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
            await this.controller.setCollateralFactor(1 * MANTISSA);
            await this.controller.setLiquidationFactor(MANTISSA / 2);

            await this.token.approve(this.market.address, 2000, { from: alice });
            await this.market.supply(2000, { from: alice });
            await this.token2.approve(this.market2.address, 1500, { from: bob });
            await this.market2.supply(1500, { from: bob });

            await this.market.borrow(1000, { from: bob });
        });
        
        it('transfer to', async function () {
            await this.market2.setController(charlie);
            await this.market2.transferTo(bob, charlie, 1000, { from: charlie });
            
            const cash = await this.market2.getCash();
            const bobSupply = await this.market2.updatedSupplyOf(bob);
            const charlieBalance = await this.token2.balanceOf(charlie);
            
            assert.ok(bobSupply.toNumber() >= 500 && bobSupply.toNumber() <= 550);
            assert.equal(charlieBalance, 1000);
            assert.equal(cash, 500);
        });
        
        it('only controller can transfer to', async function () {
            expectThrow(this.market2.transferTo(bob, charlie, 3000, { from: charlie }));
        });
        
        it('cannot liquidate using amount 0', async function () {
            expectThrow(this.market.liquidateBorrow(bob, 0, this.market2.address, { from: alice }));
        });
        
        it('cannot liquidate when borrower is sender', async function () {
            expectThrow(this.market.liquidateBorrow(bob, 1, this.market2.address, { from: bob }));
        });
        
        it('cannot liquidate more than borrower debt', async function () {
            await this.token.approve(this.market.address, 2000, { from: alice });
            expectThrow(this.market.liquidateBorrow(bob, 2000, this.market2.address, { from: alice }));
        });
        
        it('liquidator supplies market tokens and gets collateral tokens', async function () {
            const initialCash = (await this.market.getCash()).toNumber();
            const initialCash2 = (await this.market2.getCash()).toNumber();
            const initialAliceBalance = (await this.token.balanceOf(alice)).toNumber();
            const initialAliceBalance2 = (await this.token2.balanceOf(alice)).toNumber();
            
            await this.controller.setPrice(this.market2.address, 1);
            
            const healthIndex = await this.controller.getAccountHealth(bob);
            
            assert.ok(healthIndex.toNumber() <= MANTISSA);

            const initialTotalBorrows = (await this.market.totalBorrows()).toNumber();
            const initialBorrowsByBob = (await this.market.borrowBy(bob)).toNumber();
            
            await this.token.approve(this.market.address, 1000, { from: alice });
            const liquidateResult = await this.market.liquidateBorrow(bob, 1000, this.market2.address, { from: alice });
            
            assert.ok(liquidateResult.logs);            assert.equal(liquidateResult.logs.length, 1);
            assert.equal(liquidateResult.logs[0].event, 'LiquidateBorrow');
            assert.equal(liquidateResult.logs[0].args.borrower, bob);
            assert.equal(liquidateResult.logs[0].args.amount, 1000);
            assert.equal(liquidateResult.logs[0].args.liquidator, alice);
            assert.equal(liquidateResult.logs[0].args.collateralMarket, this.market2.address);

            const totalBorrows = (await this.market.totalBorrows()).toNumber();
            const borrowsByBob = (await this.market.borrowBy(bob)).toNumber();
            
            const finalCash = (await this.market.getCash()).toNumber();
            const finalCash2 = (await this.market2.getCash()).toNumber();
            const finalAliceBalance = (await this.token.balanceOf(alice)).toNumber();
            const finalAliceBalance2 = (await this.token2.balanceOf(alice)).toNumber();

            assert.equal(liquidateResult.logs[0].args.collateralAmount, finalAliceBalance2 - initialAliceBalance2);
            
            console.log('Initial cash 2', initialCash2);
            console.log('Final cash 2', finalCash2);
            console.log('Initial Alice balance 2', initialAliceBalance2);
            console.log('Final Alice balance 2', finalAliceBalance2);
            console.log('Initial total borrows', initialTotalBorrows);
            console.log('Final total borrows', totalBorrows);            
            console.log('Initial Bob borrows', initialBorrowsByBob);
            console.log('Final Bob borrows', borrowsByBob);
                        
            assert.equal(finalCash, initialCash + 1000);
            assert.equal(finalAliceBalance, initialAliceBalance - 1000);            
            
            assert.ok(finalCash2 > initialCash2 - 1500);
            assert.ok(finalCash2 < initialCash2 - 1450);
            assert.equal(initialAliceBalance2, 0);
            assert.ok(finalAliceBalance2 > 1450);
            assert.ok(finalAliceBalance2 < 1500);
            
            assert.equal(finalAliceBalance2 - initialAliceBalance2, initialCash2 - finalCash2);
            
            assert.ok(borrowsByBob < initialBorrowsByBob);
            assert.ok(totalBorrows < initialTotalBorrows);
        });
        
        it('cannot liquidate with health index greater than 1', async function () {
            const healthIndex = await this.controller.getAccountHealth(bob);
            
            assert.ok(healthIndex.toNumber() > MANTISSA);
            
            await this.token.approve(this.market.address, 1000, { from: alice });
            expectThrow(this.market.liquidateBorrow(bob, 1000, this.market2.address, { from: alice }));
        });
    });
});

