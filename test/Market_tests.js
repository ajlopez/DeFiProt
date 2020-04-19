
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./Controller.sol');

const expectThrow = require('./utils').expectThrow;

contract('Market', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    
    const FACTOR = 1000000000000000000;

    describe('initial state', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, FACTOR / 1000);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, FACTOR / 1000);
            
            this.controller = await Controller.new();
            await this.controller.setCollateralFactor(2000000);
            await this.controller.setLiquidationFactor(1500000);

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
            assert.equal(await this.market.getBorrowRate(1000, 1000, 0), FACTOR / 2 / 1000 + FACTOR / 1000);
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
            assert.ok(supplyResult.logs);
            assert.equal(supplyResult.logs.length, 1);
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
            this.market = await Market.new(this.token.address, FACTOR / 1000);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, FACTOR / 1000);
            this.controller = await Controller.new();

            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);
            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
            await this.controller.setCollateralFactor(2000000);
            await this.controller.setLiquidationFactor(1500000);

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
            await this.market.borrow(1000, { from: bob });
            
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
            this.market = await Market.new(this.token.address, FACTOR / 1000);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, FACTOR / 1000);
            this.controller = await Controller.new();

            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);
            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
            await this.controller.setCollateralFactor(2000000);
            await this.controller.setLiquidationFactor(1500000);

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
            await this.market.payBorrow(1000, { from: bob });
            
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
            await this.market.payBorrow(2000, { from: bob });
            
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
});

