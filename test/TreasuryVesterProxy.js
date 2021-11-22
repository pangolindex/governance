// test/TreasuryVester.js
// Load dependencies
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');

const TREASURY_VESTER_INITIAL_AMOUNT = BigNumber.from('512000000000000000000000000');
const PNG_TOTAL_SUPPLY = BigNumber.from('538000000000000000000000000');
const DESIRED_TOTAL_SUPPLY = BigNumber.from('230000000000000000000000000');
const TREASURY_INITIAL_AMOUNT = BigNumber.from('13973371000000000000000000');
const TREASURY_TARGET_BALANCE = BigNumber.from('30000000000000000000000000');
const STARTING_AMOUNT = BigNumber.from('175342465000000000000000');
const STARTING_DIVERSION = BigNumber.from('1000000000000000000000');
const HALVING = 1460;
const INTERVAL = 86400;

// Start test block
describe('TreasuryVesterProxy', function() {
    before(async function() {
        this.PNG = await ethers.getContractFactory('Png');
        this.TreasuryVester = await ethers.getContractFactory('TreasuryVester');
        this.CommunityTreasury = await ethers.getContractFactory('CommunityTreasury');
        this.TreasuryVesterProxy = await ethers.getContractFactory('TreasuryVesterProxy');
        this.MiniChef = await ethers.getContractFactory('contracts/MiniChefV2.sol:MiniChefV2');

        [this.owner, this.altAddr] = await ethers.getSigners();
    });

    beforeEach(async function() {
        this.png = await this.PNG.deploy(this.owner.address);
        await this.png.deployed();

        this.treasuryVester = await this.TreasuryVester.deploy(this.png.address);
        await this.treasuryVester.deployed();

        this.communityTreasury = await this.CommunityTreasury.deploy(this.png.address);
        await this.communityTreasury.deployed();

        this.miniChef = await this.MiniChef.deploy(this.png.address, this.owner.address);
        await this.miniChef.deployed();

        this.treasuryVesterProxy = await this.TreasuryVesterProxy.deploy(
            this.png.address,
            this.treasuryVester.address,
            this.communityTreasury.address,
            this.miniChef.address
        );
        await this.treasuryVesterProxy.deployed();

        await this.png.transfer(this.treasuryVester.address, TREASURY_VESTER_INITIAL_AMOUNT);
        await this.png.transfer(this.communityTreasury.address, TREASURY_INITIAL_AMOUNT);
        await this.miniChef.addFunder(this.treasuryVesterProxy.address);
    });


    describe('TreasuryVester Constructor', function() {
        it('png default', async function() {
            expect((await this.treasuryVester.png())).to.equal(this.png.address);
        });
        it('recipient default', async function() {
            expect((await this.treasuryVester.recipient())).to.equal(ethers.constants.AddressZero);
        });
        it('vesting amount default', async function() {
            expect((await this.treasuryVester.vestingAmount())).to.equal(STARTING_AMOUNT);
        });
        it('halving period default', async function() {
            expect((await this.treasuryVester.halvingPeriod())).to.equal(HALVING);
        });
        it('vestingCliff default', async function() {
            expect((await this.treasuryVester.vestingCliff())).to.equal(INTERVAL);
        });
        it('startingBalance default', async function() {
            expect((await this.treasuryVester.startingBalance())).to.equal(TREASURY_VESTER_INITIAL_AMOUNT);
        });
        it('vestingEnabled default', async function() {
            expect((await this.treasuryVester.vestingEnabled())).to.be.false;
        });
        it('lastUpdate default', async function() {
            expect((await this.treasuryVester.lastUpdate())).to.equal(0);
        });
    });

    describe('TreasuryVesterProxy Constructor', function() {
        it('png default', async function() {
            expect((await this.treasuryVesterProxy.png())).to.equal(this.png.address);
        });
        it('treasury vester default', async function() {
            expect((await this.treasuryVesterProxy.treasuryVester())).to.equal(this.treasuryVester.address);
        });
        it('treasury default', async function() {
            expect((await this.treasuryVesterProxy.treasury())).to.equal(this.communityTreasury.address);
        });
        it('chef default', async function() {
            expect((await this.treasuryVesterProxy.chef())).to.equal(this.miniChef.address);
        });
    });

    describe('init', function() {
        it('Requires TreasuryVesterProxy is the recipient', async function() {
            expect(await this.treasuryVester.recipient()).to.equal(ethers.constants.AddressZero);
            await expect(this.treasuryVesterProxy.init()).to.be.revertedWith(
                'TreasuryVesterProxy::Invalid treasury vester recipient'
            );
        });
        it('Initializes successfully', async function() {
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await expect(this.treasuryVesterProxy.init()).not.to.be.reverted;
        });
    });

    describe('claimAndDistribute', function() {
        it('Requires initialization', async function() {
            // Claim again
            await expect(this.treasuryVesterProxy.claimAndDistribute()).to.be.revertedWith(
                'TreasuryVesterProxy::Not initialized'
            );
        });

        it('Can be claimed from permissioned address', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Claim
            await expect(this.treasuryVesterProxy.claimAndDistribute()).not.to.be.reverted;
        });

        it('Can be claimed from non-permissioned address', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Claim
            await expect(this.treasuryVesterProxy.connect(this.altAddr).claimAndDistribute()).not.to.be.reverted;
        });

        it('Cannot claim twice within 24h', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Claim
            await this.treasuryVesterProxy.claimAndDistribute();

            await increaseBlocktime(INTERVAL - 2);

            // Claim
            await expect(this.treasuryVesterProxy.claimAndDistribute()).to.be.revertedWith(
                'TreasuryVester::claim: not time yet'
            );
        });

        it('1st claim diverts to treasury and chef', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Snapshot balances for treasury and chef
            const treasuryBalance = await this.png.balanceOf(this.communityTreasury.address);
            const chefBalance = await this.png.balanceOf(this.miniChef.address);

            // Claim
            await this.treasuryVesterProxy.claimAndDistribute();

            // Ensure diversion to treasury
            expect(await this.png.balanceOf(this.communityTreasury.address)).to.equal(treasuryBalance.add(STARTING_DIVERSION));
            // Ensure remainder to chef
            expect(await this.png.balanceOf(this.miniChef.address)).to.equal(chefBalance.add(STARTING_AMOUNT).sub(STARTING_DIVERSION));
        });

        it('31th claim increases diversion to treasury', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Claim 30 times
            for (let i = 1; i <= 30; i++) {
                await this.treasuryVesterProxy.claimAndDistribute();
                await increaseBlocktime(86400);
            }

            // Snapshot balances for treasury and chef
            const treasuryBalance = await this.png.balanceOf(this.communityTreasury.address);
            const chefBalance = await this.png.balanceOf(this.miniChef.address);
            const expectedDiversion = STARTING_DIVERSION.mul(2);

            // Claim 31st time
            await this.treasuryVesterProxy.claimAndDistribute();

            // Ensure diversion to treasury
            expect(await this.png.balanceOf(this.communityTreasury.address)).to.equal(treasuryBalance.add(expectedDiversion));
            // Ensure remainder to chef
            expect(await this.png.balanceOf(this.miniChef.address)).to.equal(chefBalance.add(STARTING_AMOUNT).sub(expectedDiversion));
        });

        it('61th claim increases diversion to treasury', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Claim 60 times
            for (let i = 1; i <= 60; i++) {
                await this.treasuryVesterProxy.claimAndDistribute();
                await increaseBlocktime(86400);
            }

            // Snapshot balances for treasury and chef
            const treasuryBalance = await this.png.balanceOf(this.communityTreasury.address);
            const chefBalance = await this.png.balanceOf(this.miniChef.address);
            const expectedDiversion = STARTING_DIVERSION.mul(3);

            // Claim 61st time
            await this.treasuryVesterProxy.claimAndDistribute();

            // Ensure diversion to treasury
            expect(await this.png.balanceOf(this.communityTreasury.address)).to.equal(treasuryBalance.add(expectedDiversion));
            // Ensure remainder to chef
            expect(await this.png.balanceOf(this.miniChef.address)).to.equal(chefBalance.add(STARTING_AMOUNT).sub(expectedDiversion));
        });

        it('301st claim increases diversion rate to treasury', async function() {
            // Start Vesting
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVester.startVesting();
            await this.treasuryVesterProxy.init();

            // Claim 300 times
            for (let i = 1; i <= 300; i++) {
                await this.treasuryVesterProxy.claimAndDistribute();
                await increaseBlocktime(86400);
            }

            // Snapshot balances for treasury and chef
            const treasuryBalance = await this.png.balanceOf(this.communityTreasury.address);
            const chefBalance = await this.png.balanceOf(this.miniChef.address);
            const expectedDiversion = STARTING_DIVERSION.mul(10)
                .add(STARTING_DIVERSION.mul(2));

            // Claim 301st time
            await this.treasuryVesterProxy.claimAndDistribute();

            // Ensure diversion to treasury
            expect(await this.png.balanceOf(this.communityTreasury.address)).to.equal(treasuryBalance.add(expectedDiversion));
            // Ensure remainder to chef
            expect(await this.png.balanceOf(this.miniChef.address)).to.equal(chefBalance.add(STARTING_AMOUNT).sub(expectedDiversion));
        });
    });

    describe('Integration test', function() {
        // Skipped by default
        // Run with (--timeout XXX) flag to complete
        xit('Works as expected', async function() {
            const PREVIOUS_DAYS_VESTED = 254;
            const DAYS_TO_PROJECT = 365 * 4;

            // Start Vesting
            await this.treasuryVester.setRecipient(this.owner.address);
            await this.treasuryVester.startVesting();

            // OG Vester Period
            for (let i = 1; i <= PREVIOUS_DAYS_VESTED; i++) {
                await this.treasuryVester.claim();
                await increaseBlocktime(86400);
            }

            // Proxy Vester Period
            await this.treasuryVester.setRecipient(this.treasuryVesterProxy.address);
            await this.treasuryVesterProxy.init();

            const initialCirculatingSupply = PNG_TOTAL_SUPPLY
                .sub(await this.png.balanceOf(this.treasuryVester.address))
                .sub(await this.png.balanceOf(this.communityTreasury.address)); // Avoid double counting

            // Claim loops
            for (let i = 1; i <= DAYS_TO_PROJECT; i++) {
                await this.treasuryVesterProxy.claimAndDistribute();
                await increaseBlocktime(86400);
                const [pngTreasury, pngChef] = await Promise.all([
                    this.png.balanceOf(this.communityTreasury.address),
                    this.png.balanceOf(this.miniChef.address)
                ]);
                const circulatingSupply = initialCirculatingSupply.add(pngTreasury).add(pngChef);
                console.log(`Day ${i} :: ${pngTreasury / 10 ** 18} / ${pngChef / 10 ** 18} / ${circulatingSupply / 10 ** 18}`);
                expect(pngTreasury.lte(TREASURY_TARGET_BALANCE)).to.be.true;
                expect(circulatingSupply.lte(DESIRED_TOTAL_SUPPLY)).to.be.true;
                if (i === DAYS_TO_PROJECT) {
                    expect(pngTreasury.eq(TREASURY_TARGET_BALANCE)).to.be.true;
                    expect(circulatingSupply.eq(DESIRED_TOTAL_SUPPLY)).to.be.true;
                }
            }
        });
    });
});

async function increaseBlocktime(seconds) {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine');
}
