// test/LiquidityPoolManager.js
// Load dependencies
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');
const Web3 = require('web3');

const OWNER_ADDRESS = ethers.utils.getAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
const TREASURY_VESTER = ethers.utils.getAddress("0xd187C6C8C6aeE0F021F92cB02887A21D529e26cb");

const balanceOf = Web3.utils.sha3('balanceOf(address)').slice(0,10);
const totalSupply = Web3.utils.sha3('totalSupply()').slice(0,10);
const token0 = Web3.utils.sha3('token0()').slice(0,10);
const token1 = Web3.utils.sha3('token1()').slice(0,10);
const claimMethod = Web3.utils.sha3('claim()').slice(0,10);
const getReserves = Web3.utils.sha3('getReserves()').slice(0,10);
const getPngLiquidity = Web3.utils.sha3('getPngLiquidity(address)').slice(0,10);

let web3 = new Web3('http://localhost:9560');

const oneToken = BigNumber.from("1000000000000000000");

const TOTAL_AMOUNT = ethers.BigNumber.from("512000000000000000000000000");
const STARTING_AMOUNT = BigNumber.from('175342465000000000000000');
const HALVING = 1460;
const INTERVAL = 86400;

// Start test block
describe('LiquidityPoolManager', function () {
    before(async function () {
        this.PNG = await ethers.getContractFactory("Png");
        this.LpManager = await ethers.getContractFactory("LiquidityPoolManagerV2");
        this.LpManager2 = await ethers.getContractFactory("LiquidityPoolManagerV2");

        this.MockPairAvax = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockPairPng = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockPairAvaxPng = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockWavax = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockTreasuryVester = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");

        [ , this.altAddr, this.addr3] = await ethers.getSigners();

        // ABIs for mocks
        this.WAVAX = await ethers.getContractFactory("WAVAX");
        this.wavax = await this.WAVAX.deploy();
        await this.wavax.deployed();

        this.AltCoin = await ethers.getContractFactory("WAVAX");
        this.altCoin = await this.AltCoin.deploy();
        await this.altCoin.deployed();

        this.altCoin2 = await this.AltCoin.deploy();
        await this.altCoin2.deployed();

        this.TreasuryVester = await ethers.getContractFactory("TreasuryVester");
    });

    beforeEach(async function () {
        this.mockPairAvax = await this.MockPairAvax.deploy();
        await this.mockPairAvax.deployed();

        this.mockPairAvax2 = await this.MockPairAvax.deploy();
        await this.mockPairAvax2.deployed();

        this.mockPairPng = await this.MockPairPng.deploy();
        await this.mockPairPng.deployed();

        this.mockPairAvaxPng = await this.MockPairAvaxPng.deploy();
        await this.mockPairAvaxPng.deployed();

        this.mockWavax = await this.MockWavax.deploy();
        await this.mockWavax.deployed();

        this.mockTreasuryVester = await this.MockTreasuryVester.deploy();
        await this.mockTreasuryVester.deployed();

        this.png = await this.PNG.deploy(OWNER_ADDRESS);
        await this.png.deployed();

        this.lpManager = await this.LpManager.deploy(this.mockWavax.address, this.png.address,
                                                     this.mockTreasuryVester.address);
        await this.lpManager.deployed();

        this.treasury = await this.TreasuryVester.deploy(this.png.address);
        await this.treasury.deployed();

        this.lpManagerTreasury = await this.LpManager2.deploy(this.mockWavax.address, this.png.address,
            this.treasury.address);
        await this.lpManagerTreasury.deployed()

        this.altContract = await this.lpManager.connect(this.altAddr);
        this.alt3Contract = await this.lpManager.connect(this.addr3);
    });

    // Test cases

    //////////////////////////////
    //       Constructor
    //////////////////////////////
    describe("Constructor", function () {
        it('Wavax default', async function () {
            expect((await this.lpManager.wavax())).to.equal(this.mockWavax.address);
        });
        it('PNG default', async function () {
            expect((await this.lpManager.png())).to.equal(this.png.address);
        });
        it('Treasury Vester default', async function () {
            expect((await this.lpManager.treasuryVester())).to.equal(this.mockTreasuryVester.address);
        });
    });

    //////////////////////////////
    //       isWhitelisted
    //////////////////////////////

    // covered by other tests

    //////////////////////////////
    //       isAvaxPair
    //////////////////////////////

    //covered by other tests

    //////////////////////////////
    //       isPngPair
    //////////////////////////////

    // covered by other tests

    //////////////////////////////
    //       setowner
    //////////////////////////////
    describe("setowner", function () {
        it('Transfer owner successfully', async function () {
            expect((await this.lpManager.owner())).to.not.equal(this.altAddr.address);
            await this.lpManager.transferOwnership(this.altAddr.address);
            expect((await this.lpManager.owner())).to.equal(this.altAddr.address);
        });

        it('Transfer owner unsuccessfully', async function () {
            await expect(this.altContract.transferOwnership(this.altAddr.address)).to.be.revertedWith(
                "Ownable: caller is not the owner");
        });

        it('Renounce owner successfully', async function () {
            expect((await this.lpManager.owner())).to.not.equal(ethers.constants.AddressZero);
            await this.lpManager.renounceOwnership();
            expect((await this.lpManager.owner())).to.equal(ethers.constants.AddressZero);
        });

        it('Renounce owner unsuccessfully', async function () {
            await expect(this.altContract.renounceOwnership()).to.be.revertedWith(
                "Ownable: caller is not the owner");
        });
    });

    //////////////////////////////
    //      setAvaxPngPair
    //////////////////////////////
    describe("setAvaxPngPair", function () {
        it('Set pool successfully', async function () {
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);
            expect(await this.lpManager.avaxPngPair()).to.equal(this.mockPairAvaxPng.address);
        });

        it('Set pool to zero address', async function () {
            // Set address normally
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);
            expect(await this.lpManager.avaxPngPair()).to.equal(this.mockPairAvaxPng.address);

            // Try setting to zero address
            await expect(this.lpManager.setAvaxPngPair(ethers.constants.AddressZero)).to.be.revertedWith(
                'LiquidityPoolManager::setAvaxPngPair: Pool cannot be the zero address');
        });

        it('Set pool unauthorized', async function () {
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
            await expect(this.altContract.setAvaxPngPair(this.mockPairAvaxPng.address)).to.be.revertedWith('Ownable: caller is not the owner');
        });
    });

    //////////////////////////////
    //    addWhitelistedPool
    //////////////////////////////
    describe("addWhitelistedPool", function () {
        it('Add AVAX pool, token0 == WAVAX', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
        });

        it('Increases numPools', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.numPools()).to.equal(1);
        });

        it('Add AVAX pool, token1 == WAVAX', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
        });

        it('Add PNG pool, token0 == PNG', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
        });

        it('Add PNG pool, token1 == PNG', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
        });

        it('Add pool unauthorized', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await expect(this.altContract.addWhitelistedPool(this.mockPairAvax.address, 1)).to.be.revertedWith(
                'Ownable: caller is not the owner');
        });

        it('Add pool no avax or png', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            // just use a random address for the second coin
            await this.mockPairPng.givenMethodReturnAddress(token1, OWNER_ADDRESS);
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);

            // Whitelist pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1)).to.be.revertedWith(
                "LiquidityPoolManager::addWhitelistedPool: No AVAX or PNG in the pair");

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
        });

        it('Pool already added', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;

            // Try adding again
            await expect(this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Pool already whitelisted');
        });

        it('Pool is zero address', async function () {
            // Try adding again
            await expect(this.lpManager.addWhitelistedPool(ethers.constants.AddressZero, 1)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Pool cannot be the zero address');
        });

        it('Corrupt Distribution', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();

            // Attempt to add a second pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Cannot add pool between calculating and distributing returns'
            );
        });

        it('Add pool, identical tokens', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);

            // Whitelist pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1)).to.be.revertedWith(
                "LiquidityPoolManager::addWhitelistedPool: Tokens cannot be identical"
            );
        });

        it('Set weight properly', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 5);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(5);
        });

        it('Set weight at 0', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 0)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Weight cannot be zero'
            );
        });

        it('AVAX-PNG Pool is a PNG Pool', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.png.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.true;
        });
    });

    //////////////////////////////
    //   removeWhitelistedPool
    //////////////////////////////
    describe("removeWhitelistedPool", function () {
        it('Remove AVAX pool', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvax.address);

            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
        });

        it('Decrement numPools', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            expect(await this.lpManager.numPools()).to.equal(1);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvax.address);

            // Check numPools decremented
            expect(await this.lpManager.numPools()).to.equal(0);
        });

        it('Remove PNG pool', async function () {
            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairPng.address);

            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
        });

        it('Pool not listed', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Remove pool
            await expect(this.lpManager.removeWhitelistedPool(this.mockPairAvax.address)).to.be.revertedWith(
                'LiquidityPoolManager::removeWhitelistedPool: Pool not whitelisted'
            );
        });

        it('Remove pool unauthorized', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;

            // Remove pool
            await expect(this.altContract.removeWhitelistedPool(this.mockPairAvax.address)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('Remove first Avax pool with multiple choices', async function () {
            // Setup mocks, all with be AVAX pairs, despite names
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.altCoin2.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvax.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove second Avax pool with multiple choices', async function () {
            // Setup mocks, all with be AVAX pairs, despite names
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.altCoin2.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairPng.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove third Avax pool with multiple choices', async function () {
            // Setup mocks, all with be AVAX pairs, despite names
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.altCoin2.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvaxPng.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isAvaxPair(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove first PNG pool with multiple choices', async function () {
            // Setup mocks, all with be AVAX pairs, despite names
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, OWNER_ADDRESS);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvax.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove second PNG pool with multiple choices', async function () {
            // Setup mocks, all with be AVAX pairs, despite names
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, OWNER_ADDRESS);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairPng.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove third PNG pool with multiple choices', async function () {
            // Setup mocks, all with be AVAX pairs, despite names
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, OWNER_ADDRESS);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvaxPng.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.isPngPair(this.mockPairAvax.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairPng.address)).to.be.true;
            expect(await this.lpManager.isPngPair(this.mockPairAvaxPng.address)).to.be.false;
            expect(await this.lpManager.avaxPngPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Corrupt Distribution', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);;

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();

            // Attempt to add a second pool
            await expect(this.lpManager.removeWhitelistedPool(this.mockPairAvax.address)).to.be.revertedWith(
                'LiquidityPoolManager::removeWhitelistedPool: Cannot remove pool between calculating and distributing returns'
            );
        });

        it('Weight set to zero', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 5);

            // Check pool added correctly
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(5);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvax.address);

            // Check pools are empty
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(0);
        });

        it('Remove AVAX/PNG Pool', async function () {
            // Setup mocks
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 5);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.true;

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvaxPng.address);

            // Check pool removed
            expect(await this.lpManager.isWhitelisted(this.mockPairAvaxPng.address)).to.be.false;
        });
    });

    //////////////////////////////
    //     changeWeight
    //////////////////////////////
    describe("changeWeight", function () {
        it('Change successfully', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(1);

            // Change weight
            await this.lpManager.changeWeight(this.mockPairAvax.address, 5);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(5);
        });

        it('Pair not whitelisted', async function () {
            // Change weight
            await expect(this.lpManager.changeWeight(this.mockPairAvax.address, 5)).to.be.revertedWith(
                'LiquidityPoolManager::changeWeight: Pair not whitelisted');
        });

        it('Set weight to zero', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(1);

            // Change weight
            await expect(this.lpManager.changeWeight(this.mockPairAvax.address, 0)).to.be.revertedWith(
                'LiquidityPoolManager::changeWeight: Remove pool instead');
        });

        it('Insufficient privilege', async function () {
            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairAvax.address)).to.equal(1);

            // Change weight
            await expect(this.altContract.changeWeight(this.mockPairAvax.address, 5)).to.be.revertedWith(
                'Ownable: caller is not the owner')
        });
    });

    //////////////////////////////
    //   activateFeeSplit
    //////////////////////////////
    describe("activateFeeSplit", function () {
        it('Activate successfully', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await this.lpManager.activateFeeSplit(30, 70);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.avaxSplit()).to.equal(30);
            expect(await this.lpManager.pngSplit()).to.equal(70);
        });

        it('Change after activating', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await this.lpManager.activateFeeSplit(30, 70);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.avaxSplit()).to.equal(30);
            expect(await this.lpManager.pngSplit()).to.equal(70);

            await this.lpManager.activateFeeSplit(66, 34);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.avaxSplit()).to.equal(66);
            expect(await this.lpManager.pngSplit()).to.equal(34);
        });

        it('Over 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(300, 70)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split doesn't add to 100"
            );
        });

        it('Under 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(30, 30)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split doesn't add to 100"
            );
        });

        it('Avax 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(100, 0)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split can't be 100/0"
            );
        });

        it('PNG 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(0, 100)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split can't be 100/0"
            );
        });

        it('Insufficient privilege', async function () {
            await expect(this.altContract.activateFeeSplit(50, 50)).to.be.revertedWith(
                'Ownable: caller is not the owner')
        });
    });

    //////////////////////////////
    //   deactivateFeeSplit
    //////////////////////////////
    describe("deactivateFeeSplit", function () {
        it('Deactivate successfully', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);

            await this.lpManager.activateFeeSplit(30, 70);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.avaxSplit()).to.equal(30);
            expect(await this.lpManager.pngSplit()).to.equal(70);

            await this.lpManager.deactivateFeeSplit();

            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.avaxSplit()).to.equal(0);
            expect(await this.lpManager.pngSplit()).to.equal(0);
        });

        it('Not activated', async function () {
            await expect(this.lpManager.deactivateFeeSplit()).to.be.revertedWith(
                'LiquidityPoolManager::deactivateFeeSplit: Fee split not activated')
        });

        it('Insufficient privilege', async function () {
            await expect(this.altContract.deactivateFeeSplit()).to.be.revertedWith(
                'Ownable: caller is not the owner')
        });
    });

    //////////////////////////////
    //     getAvaxLiquidity
    //////////////////////////////
    describe("getAvaxLiquidity", function () {
        it('Get pair liquidity, AVAX is token0', async function () {
            // avax is token 0
            const reserve0 = 1000;
            const reserve1 = 500;
            const timestamp = 1608676399;

            const expectedLiquidity = 2000;

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getAvaxLiquidity(this.mockPairAvax.address);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Get pair liquidity, AVAX is token1', async function () {
            // avax is token 1
            const reserve0 = 1000;
            const reserve1 = 500;
            const timestamp = 1608676399;

            const expectedLiquidity = 1000;

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getAvaxLiquidity(this.mockPairAvax.address);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('AVAX not in pair', async function () {
            const reserve0 = 1000;
            const reserve1 = 500;
            const timestamp = 1608676399;

            // Setup mocks
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            await expect(this.lpManager.getAvaxLiquidity(this.mockPairAvax.address)).to.be.revertedWith(
                "LiquidityPoolManager::getAvaxLiquidity: One of the tokens in the pair must be WAVAX");
        });
    });


    //////////////////////////////
    //     getPngLiquidity
    //////////////////////////////
    describe("getPngLiquidity", function () {
        it('Get pair liquidity, PNG is token0, AVAX is bigger', async function () {
            // PNG is token 0
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            //const conversionFactor = BigNumber.from('40').mul(oneToken);;
            const conversionFactor = BigNumber.from('25000000000000000');

            const expectedLiquidity = BigNumber.from('10').mul(oneToken);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Get pair liquidity, PNG is token1, AVAX is bigger', async function () {
            // PNG is token 1
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('25000000000000000');

            const expectedLiquidity = BigNumber.from('50').mul(oneToken);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Png not in pair', async function () {
            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const reserve1 = BigNumber.from('500').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('40').mul(oneToken);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            await expect(this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor)).to.be.revertedWith(
                "LiquidityPoolManager::getPngLiquidity: One of the tokens in the pair must be PNG");
        });

        it('Get pair liquidity, PNG is token0, AVAX is smaller', async function () {
            // PNG is token 0
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('40').mul(oneToken);

            const expectedLiquidity = BigNumber.from('16000').mul(oneToken);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Get pair liquidity, PNG is token1, AVAX is smaller', async function () {
            // PNG is token 1
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('40').mul(oneToken);

            const expectedLiquidity = BigNumber.from('80000').mul(oneToken);

            // Setup mocks
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, AVAX more valuable', async function () {
            // AVAX-PNG
            // AVAX 1
            // PNG 40

            // PNG-ALT
            // PNG 200
            // ALT 1000
            const avaxReserve = oneToken;
            const pngReserve1 = BigNumber.from('40').mul(oneToken);
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("10").mul(oneToken);

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [avaxReserve, pngReserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, PNG more valuable', async function () {
            // AVAX-PNG
            // AVAX 40
            // PNG 1

            // PNG-ALT
            // PNG 200
            // ALT 1000
            const avaxReserve = BigNumber.from('40').mul(oneToken);
            const pngReserve1 = oneToken;
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("16000").mul(oneToken);

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [avaxReserve, pngReserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, AVAX more valuable, token order swapped', async function () {
            // AVAX-PNG
            // AVAX 1
            // PNG 40

            // PNG-ALT
            // PNG 200
            // ALT 1000
            const avaxReserve = oneToken;
            const pngReserve1 = BigNumber.from('40').mul(oneToken);
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("10").mul(oneToken);

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [pngReserve1, avaxReserve, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, PNG more valuable, token order swapped', async function () {
            // AVAX-PNG
            // AVAX 40
            // PNG 1

            // PNG-ALT
            // PNG 200
            // ALT 1000
            const avaxReserve = BigNumber.from('40').mul(oneToken);
            const pngReserve1 = oneToken;
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("16000").mul(oneToken);

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [pngReserve1, avaxReserve, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end real numbers', async function () {
            // AVAX-PNG
            // AVAX 5.09533
            // PNG 490.73308

            // PNG-ALT
            // PNG 7866.999
            // ALT 455.999
            const avaxReserve = BigNumber.from('5095330000000000000');
            const pngReserve1 = BigNumber.from('490733080000000000000');
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('7866999000000000000000');
            const altReserve = BigNumber.from('455999000000000000000');

            //const expectedConversionFactor = BigNumber.from('96310362626169453205');
            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from("163367654019451867129");

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [avaxReserve, pngReserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end real numbers, reversed', async function () {
            // AVAX-PNG
            // AVAX 5.09533
            // PNG 490.73308

            // PNG-ALT
            // PNG 455.999
            // ALT 7866.999
            const avaxReserve = BigNumber.from('5095330000000000000');
            const pngReserve1 = BigNumber.from('490733080000000000000');
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('455999000000000000000');
            const altReserve = BigNumber.from('7866999000000000000000');

            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from("9469365238919698853");

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [avaxReserve, pngReserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end, equal ratio', async function () {
            // AVAX-PNG
            // AVAX 5.09533
            // PNG 490.73308

            // PNG-ALT
            // PNG 7866.999
            // ALT 455.999
            const avaxReserve = BigNumber.from('1').mul(oneToken);
            const pngReserve1 = BigNumber.from('1').mul(oneToken);
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from('400').mul(oneToken);

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [avaxReserve, pngReserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            //expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end, equal ratio inflated', async function () {
            // AVAX-PNG
            // AVAX 5.09533
            // PNG 490.73308

            // PNG-ALT
            // PNG 7866.999
            // ALT 455.999
            const avaxReserve = BigNumber.from('1000').mul(oneToken);
            const pngReserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const pngReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from('400').mul(oneToken);

            // Setup mocks for AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [avaxReserve, pngReserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for PNG-ALT pair
            await this.mockPairPng.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const pngReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, pngReserve2, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, pngReserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            //expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getPngLiquidity(this.mockPairPng.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });
    });

    //////////////////////////////
    //     getAvaxPngRatio
    //////////////////////////////
    describe("getAvaxPngRatio", function () {
        it('AVAX more valuable', async function () {
            // AVAX 200
            // PNG 1000
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("200000000000000000");

            // Setup mocks
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

        it('PNG more valuable', async function () {
            // AVAX 200
            // PNG 1000
            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const reserve1 = BigNumber.from('200').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("5").mul(oneToken);

            // Setup mocks
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

        it('AVAX more valuable, reverse token order', async function () {
            // AVAX 200
            // PNG 1000
            const reserve1 = BigNumber.from('200').mul(oneToken);
            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("200000000000000000");

            // Setup mocks
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            const conversionFactor = await this.lpManager.getAvaxPngRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

        it('PNG more valuable', async function () {
            // AVAX 200
            // PNG 1000
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("5").mul(oneToken);

            // Setup mocks
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.png.address);

            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturn);

            var conversionFactor = await this.lpManager.getAvaxPngRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

    });


    //////////////////////////////
    //    calculateReturns
    //          and
    //    distributeTokens
    //////////////////////////////
    describe("calculateReturns and distributeTokens", function () {
        it('Distribute all to one AVAX pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            // Get stake contract
            const stakeContract = await this.lpManager.stakes(this.mockPairAvax.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute without calculating', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute

            await expect(this.lpManager.distributeTokens()).to.be.revertedWith(
                'LiquidityPoolManager::distributeTokens: Previous returns not allocated. Call calculateReturns()'
            );
        });

        it('Distribute all to one PNG pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('200').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute all to AVAX-PNG pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('200').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract = await this.lpManager.stakes(this.mockPairAvaxPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute to one PNG and one AVAX pool equally', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute to one PNG and one AVAX pool 1/3 and 2/3', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveAvax0 = BigNumber.from('200').mul(oneToken);
            const reserveAvax1 = BigNumber.from('1000').mul(oneToken);

            const reservePng0 = BigNumber.from('400').mul(oneToken);
            const reservePng1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax0, reserveAvax1, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reservePng0, reservePng1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/3));
            expect(await this.png.balanceOf(stakeContract2)).to.equal(Math.floor(2*vestAmount/3));
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('Distribute to one PNG, one AVAX, and AVAX/PNG pool equally', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveAvax0 = BigNumber.from('1000').mul(oneToken);
            const reserveAvax1 = BigNumber.from('1000').mul(oneToken);

            const reservePng0 = BigNumber.from('1000').mul(oneToken);
            const reservePng1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax0, reserveAvax1, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reservePng0, reservePng1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairAvaxPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/3));
            expect(await this.png.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/3));
            expect(await this.png.balanceOf(stakeContract3)).to.equal(Math.floor(vestAmount/3));
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('No tokens to distribute', async function () {
            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);

            // distribute
            await expect(this.lpManager.calculateReturns()).to.be.revertedWith(
                "LiquidityPoolManager::calculateReturns: No PNG to allocate. Call vestAllocation()."
            );
        });

        it('AVAX-PNG not set', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await expect(this.lpManager.calculateReturns()).to.be.revertedWith(
                "LiquidityPoolManager::calculateReturns: Avax/PNG Pair not set");
        });

        it('Extra PNG Tokens', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Send extra PNG
            await this.png.transfer(this.lpManager.address, vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(2*vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract = await this.lpManager.stakes(this.mockPairAvax.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);
        });
    });

    //////////////////////////////
    //  Weighted Distribution
    //////////////////////////////
    describe("Distribution with weights", function () {
        it('Equal liquidity different weights', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 2);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/3));
            expect(await this.png.balanceOf(stakeContract2)).to.equal(Math.floor(2*vestAmount/3));
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('Different liquidity different weights', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveAvax0 = BigNumber.from('200').mul(oneToken);
            const reserveAvax1 = BigNumber.from('1000').mul(oneToken);

            const reservePng0 = BigNumber.from('400').mul(oneToken);
            const reservePng1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax0, reserveAvax1, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reservePng0, reservePng1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 2);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/2));
            expect(await this.png.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/2));
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Equal liquidity different weights, flipped', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const reserve1 = BigNumber.from('200').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 2);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(Math.floor(2*vestAmount/3));
            expect(await this.png.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/3));
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('Different liquidity different weights, flipped', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveAvax0 = BigNumber.from('400').mul(oneToken);
            const reserveAvax1 = BigNumber.from('1000').mul(oneToken);

            const reservePng0 = BigNumber.from('200').mul(oneToken);
            const reservePng1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax0, reserveAvax1, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reservePng0, reservePng1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 2);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/2));
            expect(await this.png.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/2));
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });
    });

    //////////////////////////////
    //  Split Distribution
    //////////////////////////////
    describe("Split Distribution", function () {
        it('Equal split, same liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 1000;

            const expectedAvaxReward = Math.floor(vestAmount/2);
            const expectedPngReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, different liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 300;
            const avaxPngReservePng = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedAvaxReward = Math.floor(vestAmount/2);
            const expectedPngReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, different liquidity, equal weights, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 300;

            // doesn't depend on liqudity, so should be same
            const expectedAvaxReward = Math.floor(vestAmount/2);
            const expectedPngReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, equal liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 75;
            const pngSplit = 25;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 1000;

            const expectedAvaxReward = Math.floor(3*vestAmount/4);
            const expectedPngReward = Math.floor(vestAmount/4);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, equal liquidity, equal weights, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 25;
            const pngSplit = 75;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 1000;

            const expectedAvaxReward = Math.floor(vestAmount/4);
            const expectedPngReward = Math.floor(3*vestAmount/4);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, Different liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 66;
            const pngSplit = 34;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 200;

            const expectedAvaxReward = 660;
            const expectedPngReward = 340;
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, Different liquidity, equal weights, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 34;
            const pngSplit = 66;
            const avaxWeight = 1
            const pngWeight = 1
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 200;

            const expectedAvaxReward = 340;
            const expectedPngReward = 660;
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, same liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 5
            const pngWeight = 7
            const avaxPngReserveAvax = 300;
            const avaxPngReservePng = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedAvaxReward = Math.floor(vestAmount/2);
            const expectedPngReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, different liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 6
            const pngWeight = 1
            const avaxPngReserveAvax = 300;
            const avaxPngReservePng = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedAvaxReward = Math.floor(vestAmount/2);
            const expectedPngReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, equal liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 75;
            const pngSplit = 25;
            const avaxWeight = 4
            const pngWeight = 3
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 1000;

            const expectedAvaxReward = Math.floor(3*vestAmount/4);
            const expectedPngReward = Math.floor(vestAmount/4);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, Different liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 66;
            const pngSplit = 34;
            const avaxWeight = 3
            const pngWeight = 4
            const avaxPngReserveAvax = 1000;
            const avaxPngReservePng = 200;

            const expectedAvaxReward = 660;
            const expectedPngReward = 340;
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Multiple pairs, equal split, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 30
            const avax2Weight = 10
            const avaxPngWeight = 10
            const pngWeight = 40

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPool2ReservePng = BigNumber.from('1000').mul(oneToken);
            const avaxPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPngReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPngReservePng = BigNumber.from('1000').mul(oneToken);

            const expectedAvaxReward = 375;
            const expectedAvax2Reward = 125;
            const expectedAvaxPngReward = 100;
            const expectedPngReward = 400;

            const leftover = 0;

            // Vest tokens
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax2.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            const reserveReturnAvax2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [avaxPool2ReserveAltcoin, avaxPool2ReservePng, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);
            await this.mockPairAvax2.givenMethodReturn(getReserves, reserveReturnAvax2);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, pngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, avaxPngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax2.address, avax2Weight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvaxPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvax2.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairAvaxPng.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairAvax2.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(stakeContract3)).to.equal(expectedAvaxPngReward);
            expect(await this.png.balanceOf(stakeContract4)).to.equal(expectedAvax2Reward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        })

        it('Multiple tokens, different split, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 25;
            const pngSplit = 75;
            const avaxWeight = 30
            const avaxPngWeight = 10
            const pngWeight = 40
            const avax2Weight = 10

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPool2ReservePng = BigNumber.from('1000').mul(oneToken);
            const avaxPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPngReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPngReservePng = BigNumber.from('1000').mul(oneToken);

            const expectedAvaxReward = 187;
            const expectedAvaxPngReward = 150;
            const expectedPngReward = 600;
            const expectedAvax2Reward = 62;
            const leftover = 1;

            // Vest tokens
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax2.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            const reserveReturnAvax2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [avaxPool2ReserveAltcoin, avaxPool2ReservePng, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);
            await this.mockPairAvax2.givenMethodReturn(getReserves, reserveReturnAvax2);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, pngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, avaxPngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax2.address, avax2Weight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvaxPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvax2.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairAvaxPng.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairAvax2.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(stakeContract3)).to.equal(expectedAvaxPngReward);
            expect(await this.png.balanceOf(stakeContract4)).to.equal(expectedAvax2Reward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Multiple tokens, different split, different weights, post remove', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 25;
            const pngSplit = 75;
            const avaxWeight = 30
            const avaxPngWeight = 10
            const pngWeight = 40
            const avax2Weight = 10

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPool2ReservePng = BigNumber.from('1000').mul(oneToken);
            const avaxPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPngReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPngReservePng = BigNumber.from('1000').mul(oneToken);

            const expectedAvaxReward = 250;
            const expectedAvaxPngReward = 150;
            const expectedPngReward = 600;
            const expectedAvax2Reward = 0;
            const leftover = 0;

            // Vest tokens
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax2.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            const reserveReturnAvax2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [avaxPool2ReserveAltcoin, avaxPool2ReservePng, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);
            await this.mockPairAvax2.givenMethodReturn(getReserves, reserveReturnAvax2);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, pngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, avaxPngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax2.address, avax2Weight);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvax2.address);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvaxPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvax2.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairAvaxPng.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairAvax2.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(stakeContract3)).to.equal(expectedAvaxPngReward);
            expect(await this.png.balanceOf(stakeContract4)).to.equal(expectedAvax2Reward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Multiple tokens, different split, different weights, post remove, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 25;
            const pngSplit = 75;
            const avaxWeight = 30
            const avaxPngWeight = 10
            const pngWeight = 40
            const avax2Weight = 10

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPool2ReservePng = BigNumber.from('1000').mul(oneToken);
            const avaxPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPngReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPngReservePng = BigNumber.from('1000').mul(oneToken);

            const expectedAvaxReward = 187;
            const expectedAvaxPngReward = 0;
            const expectedPngReward = 750;
            const expectedAvax2Reward = 62;
            const leftover = 1;

            // Vest tokens
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax2.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            const reserveReturnAvax2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [avaxPool2ReserveAltcoin, avaxPool2ReservePng, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);
            await this.mockPairAvax2.givenMethodReturn(getReserves, reserveReturnAvax2);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, pngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, avaxWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, avaxPngWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax2.address, avax2Weight);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvaxPng.address);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvaxPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvax2.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairAvaxPng.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairAvax2.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(stakeContract3)).to.equal(expectedAvaxPngReward);
            expect(await this.png.balanceOf(stakeContract4)).to.equal(expectedAvax2Reward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, change weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 50;
            const pngSplit = 50;
            const avaxWeight = 6
            const pngWeight = 1
            const avaxPngReserveAvax = 300;
            const avaxPngReservePng = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedAvaxReward = Math.floor(vestAmount/2);
            const expectedPngReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Change weights
            await this.lpManager.changeWeight(this.mockPairAvax.address, avaxWeight);
            await this.lpManager.changeWeight(this.mockPairPng.address, pngWeight);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Change weights, Multiple tokens, different split', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const avaxSplit = 25;
            const pngSplit = 75;
            const avaxWeight = 30
            const avaxPngWeight = 10
            const pngWeight = 40
            const avax2Weight = 10

            const avaxPoolReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const pngPoolReservePng = BigNumber.from('1000').mul(oneToken);
            const pngPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPool2ReservePng = BigNumber.from('1000').mul(oneToken);
            const avaxPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const avaxPngReserveAvax = BigNumber.from('1000').mul(oneToken);
            const avaxPngReservePng = BigNumber.from('1000').mul(oneToken);

            const expectedAvaxReward = 187;
            const expectedAvaxPngReward = 0;
            const expectedPngReward = 750;
            const expectedAvax2Reward = 62;
            const leftover = 1;

            // Vest tokens
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(avaxSplit, pngSplit);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax2.givenMethodReturnAddress(token1, this.mockWavax.address);
            await this.mockPairAvax2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnAvax = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPoolReserveAvax, avaxPoolReserveAltcoin, timestamp]);
            const reserveReturnPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [pngPoolReservePng, pngPoolReserveAltcoin, timestamp]);
            const reserveReturnAvax2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [avaxPool2ReserveAltcoin, avaxPool2ReservePng, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturnPng);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturnAvax);
            await this.mockPairAvax2.givenMethodReturn(getReserves, reserveReturnAvax2);

            // Initialize AVAX-PNG pair
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [avaxPngReserveAvax, avaxPngReservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvaxPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax2.address, 1);

            // Change weights
            await this.lpManager.changeWeight(this.mockPairPng.address, pngWeight);
            await this.lpManager.changeWeight(this.mockPairAvax.address, avaxWeight);
            await this.lpManager.changeWeight(this.mockPairAvaxPng.address, avaxPngWeight);
            await this.lpManager.changeWeight(this.mockPairAvax2.address, avax2Weight);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairAvaxPng.address);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvaxPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairAvax2.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairAvaxPng.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairAvax2.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(expectedAvaxReward);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(expectedPngReward);
            expect(await this.png.balanceOf(stakeContract3)).to.equal(expectedAvaxPngReward);
            expect(await this.png.balanceOf(stakeContract4)).to.equal(expectedAvax2Reward);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(leftover);
        });
    });

    //////////////////////////////
    //  singleTokenDistribution
    //////////////////////////////
    describe("singleTokenDistribution", function () {
        it('Distribute single pool AVAX pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            // Get stake contract
            const stakeContract = await this.lpManager.stakes(this.mockPairAvax.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);

            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);
            await this.lpManager.distributeTokens();
            expect(await this.lpManager.unallocatedPng()).to.equal(0);
        });

        it('Distribute single pool PNG pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('200').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            const stakeContract = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);

            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);
            await this.lpManager.distributeTokens();
            expect(await this.lpManager.unallocatedPng()).to.equal(0);
        });

        it('Distribute all single pools', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(1);

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(0);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount/2);

            await this.lpManager.distributeTokensSinglePool(0);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);

            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);
            await this.lpManager.distributeTokens();
            expect(await this.lpManager.unallocatedPng()).to.equal(0);
        });

        it('Distribute single then multiple', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairPng.givenMethodReturnAddress(token0, this.png.address);
            await this.mockPairPng.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairPng.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Initialize AVAX-PNG pair
            const reserveAvax = BigNumber.from('1000').mul(oneToken);
            const reservePng = BigNumber.from('1000').mul(oneToken);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token0, this.wavax.address);
            await this.mockPairAvaxPng.givenMethodReturnAddress(token1, this.png.address);

            const reserveReturnAvaxPng = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveAvax, reservePng, timestamp]);
            await this.mockPairAvaxPng.givenMethodReturn(getReserves, reserveReturnAvaxPng);
            await this.lpManager.setAvaxPngPair(this.mockPairAvaxPng.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairPng.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.mockPairPng.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            const stakeContract1 = await this.lpManager.stakes(this.mockPairAvax.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairPng.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount/2);

            await this.lpManager.distributeTokens();

            // Check balances
            expect(await this.png.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Index out of bounds', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // distribute
            await this.lpManager.calculateReturns();
            await expect(this.lpManager.distributeTokensSinglePool(1)).to.be.revertedWith('LiquidityPoolManager::distributeTokensSinglePool: Index out of bounds');
        });

        it('Distribution not calculated', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // distribute without calcualting
            await expect(this.lpManager.distributeTokensSinglePool(1)).to.be.revertedWith(
                'LiquidityPoolManager::distributeTokensSinglePool: Previous returns not allocated. Call calculateReturns()');
        });

        it('Call vest before distbuteTokens', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairAvax.address, 1);

            // Check balances
            expect(await this.png.balanceOf(this.mockPairAvax.address)).to.equal(0);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            // Get stake contract
            const stakeContract = await this.lpManager.stakes(this.mockPairAvax.address);

            // Check balances
            expect(await this.png.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.png.balanceOf(this.lpManager.address)).to.equal(0);

            // Don't call distributeTokens()
            await this.png.transfer(this.lpManager.address, vestAmount);
            await expect(this.lpManager.vestAllocation()).to.be.revertedWith('LiquidityPoolManager::vestAllocation: Old PNG is unallocated. Call distributeTokens().');
        });
    });

    //////////////////////////////
    //     vestAllocation
    //////////////////////////////
    describe("vestAllocation", function () {
        it('Successful vest with mock', async function () {
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedPng()).to.equal(0);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);
        });

        it('Unallocated tokens remain', async function () {
            const vestAmount = 1000;
            await this.png.transfer(this.lpManager.address, vestAmount);

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedPng()).to.equal(0);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(vestAmount);

            await this.png.transfer(this.lpManager.address, vestAmount);
            await expect(this.lpManager.vestAllocation()).to.be.revertedWith(
                "LiquidityPoolManager::vestAllocation: Old PNG is unallocated. Call distributeTokens().");
        });

        it('No tokens to claim with mock', async function () {
            const vestAmount = 0;

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            await expect(this.lpManager.vestAllocation()).to.be.revertedWith(
                "LiquidityPoolManager::vestAllocation: No PNG to claim. Try again tomorrow.");
        });

        it('PNG not transferred', async function () {
            const vestAmount = 1000;
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedPng()).to.equal(0);
            await expect(this.lpManager.vestAllocation()).to.be.revertedWith(
                "LiquidityPoolManager::vestAllocation: Insufficient PNG transferred");
        });

        it('Extra PNG Tokens', async function () {
            const vestAmount = 1000;
            const extraPng = 1000;
            const totalTransfer = vestAmount + extraPng;
            await this.png.transfer(this.lpManager.address, totalTransfer);

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedPng()).to.equal(0);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedPng()).to.equal(totalTransfer);
        });
    });

    //////////////////////////////
    //          quote
    //////////////////////////////

    // method borrowed directly from PangolinLibrary (formerly UniswapLibrary)

    //////////////////////////////
    //       End-to-End
    //////////////////////////////
    describe("End-to-End", function () {
        it('Successful vest', async function () {
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.lpManagerTreasury.address);

            // Start Vesting
            await this.treasury.startVesting();

            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(0);
            expect(await this.png.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(STARTING_AMOUNT);
        });

        it('Multiple Successful vests', async function () {
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.lpManagerTreasury.address);

            // Start Vesting
            await this.treasury.startVesting();

            // Add a whitelisted token
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManagerTreasury.addWhitelistedPool(this.mockPairAvax.address, 1);

            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(0);
            expect(await this.png.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(STARTING_AMOUNT);

            await this.lpManagerTreasury.calculateReturns();
            await this.lpManagerTreasury.distributeTokens();

            await ethers.provider.send("evm_increaseTime", [INTERVAL]);

            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(0);
            expect(await this.png.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(STARTING_AMOUNT);
        });

        it('Too early vest', async function () {
            await this.png.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.png.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.lpManagerTreasury.address);

            // Start Vesting
            await this.treasury.startVesting();

            // Add a whitelisted token
            await this.mockPairAvax.givenMethodReturnAddress(token0, this.mockWavax.address);
            await this.mockPairAvax.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairAvax.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManagerTreasury.addWhitelistedPool(this.mockPairAvax.address, 1);

            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(0);
            expect(await this.png.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedPng()).to.equal(STARTING_AMOUNT);

            await this.lpManagerTreasury.calculateReturns();
            await this.lpManagerTreasury.distributeTokens();

            await ethers.provider.send("evm_increaseTime", [INTERVAL - 3]);

            await expect(this.lpManagerTreasury.vestAllocation()).to.be.revertedWith('TreasuryVester::claim: not time yet');
        });
    });



});