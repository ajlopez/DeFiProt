
const Market = artifacts.require('./Market.sol');
const Token = artifacts.require('./test/FaucetToken.sol');
const Controller = artifacts.require('./Controller.sol');

const expectThrow = require('./utils').expectThrow;

contract('Market', function (accounts) {
    const alice = accounts[0];
    const bob = accounts[1];
    
    const FACTOR = 1000000;

    describe('initial state', function () {
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, 1000);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, 1000);
            this.controller = await Controller.new();
        });
        
        it('initial lendings are zero', async function () {
            const lendings = await this.market.lendingsBy(alice);
            
            assert.equal(lendings, 0);
            
            const marketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(marketBalance, 0);
            
            const totalLendings = await this.market.totalLendings();
            
            assert.equal(totalLendings, 0);
        });
        
        it('initial borrow index', async function () {
            const borrowIndex = await this.market.borrowIndex();
            
            assert.equal(borrowIndex, FACTOR);
        });
        
        it('initial borrow rate', async function () {
            const borrowRate = await this.market.borrowRate();
            
            assert.equal(borrowRate, 1000);
        });
        
        it('initial accrual block number', async function () {
            const accrualBlockNumber = await this.market.accrualBlockNumber();
            
            assert.ok(accrualBlockNumber > 0);
        });
        
        it('initial borrows are zero', async function () {
            const borrows = await this.market.borrowsBy(alice);
            
            assert.equal(borrows, 0);
        });
        
        it('mint amount', async function () {
            await this.token.approve(this.market.address, 1000, { from: alice });
            await this.market.mint(1000, { from: alice });
            
            const aliceMarketLendings = await this.market.lendingsBy(alice);
            const bobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(aliceMarketLendings, 1000);
            assert.equal(bobMarketLendings, 0);
            
            const marketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(marketBalance, 1000);
            
            const totalLendings = await this.market.totalLendings();
            
            assert.equal(totalLendings, 1000);
        });
        
        it('cannot mint amount without enough tokens', async function () {
            await this.token.approve(this.market.address, 500, { from: alice });
            expectThrow(this.market.mint(1000, { from: alice }));
            
            const aliceMarketLendings = await this.market.lendingsBy(alice);
            const bobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(aliceMarketLendings, 0);
            assert.equal(bobMarketLendings, 0);
            
            const marketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(marketBalance, 0);
            
            const totalLendings = await this.market.totalLendings();
            
            assert.equal(totalLendings, 0);
        });
        
        it('redeem amount', async function () {
            await this.token.approve(this.market.address, 1000, { from: alice });
            await this.market.mint(1000, { from: alice });
            
            const tokenAliceBalance = await this.token.balanceOf(alice);
            const aliceMarketLendings = await this.market.lendingsBy(alice);
            const bobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(tokenAliceBalance, 1000000 - 1000);
            assert.equal(aliceMarketLendings, 1000);
            assert.equal(bobMarketLendings, 0);
            
            const marketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(marketBalance, 1000);
            
            await this.market.redeem(500, { from: alice });
                    
            const newTokenAliceBalance = await this.token.balanceOf(alice);
            const newAliceMarketLendings = await this.market.lendingsBy(alice);
            const newBobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(newTokenAliceBalance, 1000000 - 500);
            assert.equal(newAliceMarketLendings, 500);
            assert.equal(newBobMarketLendings, 0);
            
            const newMarketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(newMarketBalance, 500);
            
            const newTotalLendings = await this.market.totalLendings();
            
            assert.equal(newTotalLendings, 500);
        });
        
        it('cannot redeem amount without enough lendings', async function () {
            await this.token.approve(this.market.address, 1000, { from: alice });
            await this.market.mint(1000, { from: alice });
            await this.token.transfer(bob, 1000);

            const tokenAliceBalance = await this.token.balanceOf(alice);
            assert.equal(tokenAliceBalance, 1000000 - 2000);

            const tokenBobBalance = await this.token.balanceOf(bob);
            assert.equal(tokenBobBalance, 1000);
            
            await this.token.approve(this.market.address, 1000, { from: bob });
            await this.market.mint(1000, { from: bob });
            
            const aliceMarketLendings = await this.market.lendingsBy(alice);
            const bobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(aliceMarketLendings, 1000);
            assert.equal(bobMarketLendings, 1000);
            
            const marketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(marketBalance, 2000);
                    
            const totalLendings = await this.market.totalLendings();
            
            assert.equal(totalLendings, 2000);
            
            expectThrow(this.market.redeem(1500, { from: alice }));
                    
            const newTokenAliceBalance = await this.token.balanceOf(alice);
            const newAliceMarketLendings = await this.market.lendingsBy(alice);
            const newBobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(newTokenAliceBalance, 1000000 - 2000);
            assert.equal(newAliceMarketLendings, 1000);
            assert.equal(newBobMarketLendings, 1000);
            
            const newMarketBalance = await this.token.balanceOf(this.market.address);
            
            assert.equal(newMarketBalance, 2000);
            
            const newTotalSupply = await this.market.totalLendings();
            
            assert.equal(newTotalSupply, 2000);
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
    
    describe('two markets with lendings', function () {
        let creationBlock;
        let creationBlock2;
        
        beforeEach(async function() {
            this.token = await Token.new(1000000, "Token", 0, "TOK");
            this.market = await Market.new(this.token.address, 1000);
            this.token2 = await Token.new(1000000, "Token 2", 0, "TK2", { from: bob });
            this.market2 = await Market.new(this.token2.address, 1000);
            this.controller = await Controller.new();

            await this.market.setController(this.controller.address);
            await this.market2.setController(this.controller.address);
            await this.controller.addMarket(this.market.address);
            await this.controller.addMarket(this.market2.address);
            await this.controller.setPrice(this.market.address, 1);
            await this.controller.setPrice(this.market2.address, 2);
            await this.controller.setCollateralFactor(2000000);

            await this.token.approve(this.market.address, 2000, { from: alice });
            await this.market.mint(2000, { from: alice });
            await this.token2.approve(this.market2.address, 4000, { from: bob });
            await this.market2.mint(4000, { from: bob });
            
            creationBlock = (await this.market.accrualBlockNumber()).toNumber();
            creationBlock2 = (await this.market2.accrualBlockNumber()).toNumber();
        });
        
        it('borrow from market using other market as collateral', async function () {
            await this.market.borrow(1000, { from: bob });
            
            const totalBorrows = await this.market.totalBorrows();
            
            assert.equal(totalBorrows, 1000);
            
            const borrowed = await this.market.borrowsBy(bob);
            
            assert.equal(borrowed, 1000);
            
            const aliceMarketLendings = await this.market.lendingsBy(alice);
            const bobMarketLendings = await this.market.lendingsBy(bob);
            
            assert.equal(aliceMarketLendings, 2000);
            assert.equal(bobMarketLendings, 0);
            
            const aliceMarketLendings2 = await this.market2.lendingsBy(alice);
            const bobMarketLendings2 = await this.market2.lendingsBy(bob);
            
            assert.equal(aliceMarketLendings2, 0);
            assert.equal(bobMarketLendings2, 4000);
            
            const newBobTokenBalance = await this.token.balanceOf(bob);
            
            assert.equal(newBobTokenBalance, 1000);
            
            const newTotalLendings = await this.market.totalLendings();
            
            assert.equal(newTotalLendings, 2000);
            
            const bobLiquidity = await this.controller.getAccountLiquidity(bob);
            
            assert.equal(bobLiquidity, 4000 * 2 - 1000 * 2);
        });
        
        it('accrue interest', async function () {
            await this.market.borrow(1000, { from: bob });

            const borrowIndex = (await this.market.borrowIndex()).toNumber();
            const borrowRate = (await this.market.borrowRate()).toNumber();
            const totalBorrows = (await this.market.totalBorrows()).toNumber();
            
            assert.equal(totalBorrows, 1000);
            
            const borrowed = await this.market.borrowsBy(bob);
            
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
            
            assert.ok(newTotalBorrows > totalBorrows);
            
            const newBorrowIndex = (await this.market.borrowIndex()).toNumber();

            console.log('borrow index', borrowIndex);
            console.log('borrow index after accrue interest', newBorrowIndex);
            console.log('total borrows', totalBorrows);
            console.log('total borrows after accrue interest', newTotalBorrows);
            
            assert.ok(newBorrowIndex > borrowIndex);
            
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
            const borrowed = (await this.market.borrowsBy(bob)).toNumber();
            
            assert.ok(totalBorrows > 2000);
            assert.equal(totalBorrows, borrowed);
        });
    });
});

