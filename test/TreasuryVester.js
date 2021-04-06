// test/TreasuryVester.js
// Load dependencies
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');

const OWNER_ADDRESS = ethers.utils.getAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

const UNPRIVILEGED_ADDRESS = ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");

const TOTAL_AMOUNT = ethers.BigNumber.from("512000000000000000000000000");
const STARTING_AMOUNT = BigNumber.from('175342465000000000000000');
const HALVING = 1460;
const INTERVAL = 86400;

// Start test block
describe('TreasuryVester', function () {
    before(async function () {
        this.TreasuryVester = await ethers.getContractFactory("TreasuryVester");
        this.PNG = await ethers.getContractFactory("Png");

        [ , this.altAddr] = await ethers.getSigners();
        this.LP_MANAGER = this.altAddr.address;

    });

    beforeEach(async function () {
        this.png = await this.PNG.deploy(OWNER_ADDRESS);
        await this.png.deployed();

        this.treasury = await this.TreasuryVester.deploy(this.png.address);
        await this.treasury.deployed();

        this.altContract = await this.treasury.connect(this.altAddr);
    });

    // Test cases

    //////////////////////////////
    //       Constructor
    //////////////////////////////
    describe("Constructor", function () {
        it('png default', async function () {
            expect((await this.treasury.png())).to.equal(this.png.address);
        });
        it('recipient default', async function () {
            expect((await this.treasury.recipient())).to.equal(ethers.constants.AddressZero);
        });
        it('vesting amount default', async function () {
            expect((await this.treasury.vestingAmount())).to.equal(STARTING_AMOUNT);
        });

        it('halving period default', async function () {
            expect((await this.treasury.halvingPeriod())).to.equal(HALVING);
        });

        it('vestingCliff default', async function () {
            expect((await this.treasury.vestingCliff())).to.equal(INTERVAL);
        });
        it('startingBalance default', async function () {
            expect((await this.treasury.startingBalance())).to.equal(TOTAL_AMOUNT);
        });
        it('vestingEnabled default', async function () {
            expect((await this.treasury.vestingEnabled())).to.be.false;
        });
        it('lastUpdate default', async function () {
            expect((await this.treasury.lastUpdate())).to.equal(0);
        });
    });

    //////////////////////////////
    //      startVesting
    //////////////////////////////
    describe("startVesting", function () {
        it('Start vesting successfully', async function () {
            expect((await this.treasury.vestingEnabled())).to.be.false;
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.LP_MANAGER);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.startVesting();
            expect((await this.treasury.vestingEnabled())).to.be.true;
        });

        it('VestingEnabled emitted', async function () {
            expect((await this.treasury.vestingEnabled())).to.be.false;
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.LP_MANAGER);

            await expect(this.treasury.startVesting()).to.emit(this.treasury, 'VestingEnabled')
        });

        it('set claiming insufficient PNG', async function () {
            await this.treasury.setRecipient(this.LP_MANAGER);
            expect((await this.treasury.vestingEnabled())).to.be.false;
            await expect(this.treasury.startVesting()).to.be.revertedWith(
                'TreasuryVester::startVesting: incorrect PNG supply');
        });

        it('set claiming unathorized', async function () {
            expect((await this.treasury.vestingEnabled())).to.be.false;
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.LP_MANAGER);

            await expect(this.altContract.startVesting()).to.be.revertedWith(
                'Ownable: caller is not the owner');
        });

        it('set claiming unathorized and insufficient PNG', async function () {
            await this.treasury.setRecipient(this.LP_MANAGER);
            expect((await this.treasury.vestingEnabled())).to.be.false;

            await expect(this.altContract.startVesting()).to.be.revertedWith(
                'Ownable: caller is not the owner');
        });

        it('Vesting already started', async function () {
            expect((await this.treasury.vestingEnabled())).to.be.false;
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.LP_MANAGER);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.startVesting();
            expect((await this.treasury.vestingEnabled())).to.be.true;

            await expect(this.treasury.startVesting()).to.be.revertedWith('TreasuryVester::startVesting: vesting already started');
        });
    });

    //////////////////////////////
    //       setowner
    //////////////////////////////
    describe("setowner", function () {
        it('Transfer owner successfully', async function () {
            expect((await this.treasury.owner())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.treasury.transferOwnership(UNPRIVILEGED_ADDRESS);
            expect((await this.treasury.owner())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('Transfer owner unsuccessfully', async function () {
            await expect(this.altContract.transferOwnership(UNPRIVILEGED_ADDRESS)).to.be.revertedWith(
                "Ownable: caller is not the owner");
        });

        it('Renounce owner successfully', async function () {
            expect((await this.treasury.owner())).to.not.equal(ethers.constants.AddressZero);
            await this.treasury.renounceOwnership();
            expect((await this.treasury.owner())).to.equal(ethers.constants.AddressZero);
        });

        it('Renounce owner unsuccessfully', async function () {
            await expect(this.altContract.renounceOwnership()).to.be.revertedWith(
                "Ownable: caller is not the owner");
        });
    });

    //////////////////////////////
    //     setRecipient
    //////////////////////////////
    describe("setRecipient", function () {
        it('Set recipient successfully', async function () {
            expect((await this.treasury.recipient())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.treasury.setRecipient(UNPRIVILEGED_ADDRESS);
            expect((await this.treasury.recipient())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('Set recipient unsuccessfully', async function () {
            await expect(this.altContract.setRecipient(UNPRIVILEGED_ADDRESS)).to.be.revertedWith(
                'Ownable: caller is not the owner');
        });
    });

    //////////////////////////////
    //        claim
    //////////////////////////////
    describe("claim", function () {
        it('Claim once successfully', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Start Vesting
            await this.treasury.setRecipient(this.LP_MANAGER);
            await this.treasury.startVesting();

            // Claim
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
            expect(await this.treasury.nextSlash()).to.equal(HALVING);
            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT);
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 1);
        });

        it('Claim only from recipient', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Start Vesting
            await this.treasury.setRecipient(this.LP_MANAGER);
            await this.treasury.startVesting();

            // Claim
            await expect(this.treasury.claim()).to.be.revertedWith(
                'TreasuryVester::claim: only recipient can claim'
            );
        });

        it('TokensVested emitted', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Start Vesting
            await this.treasury.setRecipient(this.LP_MANAGER);
            await this.treasury.startVesting();

            // Claim
            await expect(this.altContract.claim()).to.emit(this.treasury, 'TokensVested').withArgs(STARTING_AMOUNT, this.LP_MANAGER);
        });

        it('Claim twice successfully', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Start Vesting
            await this.treasury.setRecipient(this.LP_MANAGER);
            await this.treasury.startVesting();

            // Claim
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
            expect(await this.treasury.nextSlash()).to.equal(HALVING);

            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT);
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 1);

            await ethers.provider.send("evm_increaseTime", [INTERVAL]);

            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT.mul(2));
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 2);
        });

        it('Claim thrice successfully', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Start Vesting
            await this.treasury.setRecipient(this.LP_MANAGER);
            await this.treasury.startVesting();

            // Claim
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
            expect(await this.treasury.nextSlash()).to.equal(HALVING);

            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT);
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 1);

            await ethers.provider.send("evm_increaseTime", [INTERVAL]);

            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT.mul(2));
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 2);

            await ethers.provider.send("evm_increaseTime", [INTERVAL]);

            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT.mul(3));
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 3);
        });

        it('Vesting not enabled', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Claim
            await expect(this.altContract.claim()).to.be.revertedWith('TreasuryVester::claim: vesting not enabled');
        });

        it('Claiming before next cliff', async function () {
            // Transfer initial PNG
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);

            // Start Vesting
            await this.treasury.setRecipient(this.LP_MANAGER);
            await this.treasury.startVesting();

            // Claim once
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
            expect(await this.treasury.nextSlash()).to.equal(HALVING);
            await this.altContract.claim();
            expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(STARTING_AMOUNT);
            expect(await this.treasury.nextSlash()).to.equal(HALVING - 1);

            // Claim again too soon
            await expect(this.altContract.claim()).to.be.revertedWith('TreasuryVester::claim: not time yet');
        });

        // it('Halving sucessfully every time', async function () {
        //     const halving = 1;
        //     const interval = 1;
        //     const treasury = await this.TreasuryVester.deploy(this.png.address, STARTING_AMOUNT, halving, interval, TOTAL_AMOUNT);
        //     await treasury.deployed();
        //     altContract = await treasury.connect(this.altAddr);

        //     // Transfer initial PNG
        //     await this.png.transfer(treasury.address, TOTAL_AMOUNT);
        //     expect(await this.png.balanceOf(treasury.address)).to.equal(TOTAL_AMOUNT);

        //     // Start Vesting
        //     await treasury.setRecipient(this.LP_MANAGER);
        //     await treasury.startVesting();

        //     // Claim
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
        //     expect(await treasury.nextSlash()).to.equal(halving);

        //     var increment = STARTING_AMOUNT;
        //     var totalReceived = STARTING_AMOUNT;

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(0);

        //     increment = increment.div(2);
        //     totalReceived = totalReceived.add(increment);

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(0);

        //     increment = increment.div(2);
        //     totalReceived = totalReceived.add(increment);

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(0);
        // });

        // it('Halving sucessfully every other time', async function () {
        //     const halving = 2;
        //     const interval = 1;
        //     const treasury = await this.TreasuryVester.deploy(this.png.address, STARTING_AMOUNT, halving, interval, TOTAL_AMOUNT);
        //     await treasury.deployed();
        //     altContract = await treasury.connect(this.altAddr);

        //     // Transfer initial PNG
        //     await this.png.transfer(treasury.address, TOTAL_AMOUNT);
        //     expect(await this.png.balanceOf(treasury.address)).to.equal(TOTAL_AMOUNT);

        //     // Start Vesting
        //     await treasury.setRecipient(this.LP_MANAGER);
        //     await treasury.startVesting();

        //     // Claim
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
        //     expect(await treasury.nextSlash()).to.equal(halving);

        //     var increment = STARTING_AMOUNT;
        //     var totalReceived = STARTING_AMOUNT;

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(1);

        //     totalReceived = STARTING_AMOUNT.add(increment);

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(0);

        //     increment = increment.div(2);
        //     totalReceived = totalReceived.add(increment);

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(1);

        //     totalReceived = totalReceived.add(increment);

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(0);

        //     increment = increment.div(2);
        //     totalReceived = totalReceived.add(increment);

        //     await expect(altContract.claim()).to.emit(treasury, 'TokensVested').withArgs(increment, this.LP_MANAGER);
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(totalReceived);
        //     expect(await treasury.nextSlash()).to.equal(1);
        // });

        // it('Insufficient Balance', async function () {
        //     const startAmount = 60000;
        //     const totalAmount = 100000;
        //     // const treasury = await this.TreasuryVester.deploy(this.png.address);
        //     // await treasury.deployed();
        //     // altContract = await treasury.connect(this.altAddr);

        //     // Transfer initial PNG
        //     await this.png.transfer(treasury.address, totalAmount);
        //     expect(await this.png.balanceOf(treasury.address)).to.equal(totalAmount);

        //     // Start Vesting
        //     await treasury.setRecipient(this.LP_MANAGER);
        //     await treasury.startVesting();

        //     // Claim
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(ethers.constants.AddressZero);
        //     expect(await treasury.nextSlash()).to.equal(HALVING);

        //     await altContract.claim();
        //     expect(await this.png.balanceOf(this.LP_MANAGER)).to.equal(startAmount);
        //     expect(await treasury.nextSlash()).to.equal(HALVING - 1);

        //     await ethers.provider.send("evm_increaseTime", [INTERVAL]);

        //     await expect(altContract.claim()).to.be.revertedWith("Png::_transferTokens: transfer amount exceeds balance");
        // });
    });


});