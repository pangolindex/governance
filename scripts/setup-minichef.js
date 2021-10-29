const { ethers, network } = require('hardhat');

const {
    PNG_ADDRESS,
    TREASURY_VESTER_ADDRESS,
    COMMUNITY_TREASURY_ADDRESS,
    TIMELOCK_ADDRESS,
    GOVERNOR_ADDRESS,
    PANGOLIN_MULTISIG,
} = require("./mainnet-constants");
const { BigNumber } = require('ethers');



const TWO_MILLION_PNG = BigNumber.from('2000000' + '0'.repeat(18));

const poolConfig = [
    [800, '0x7c05d54fc5CB6e4Ad87c6f5db3b807C94bB89c52'], // WAVAX-WETH.e
    [1100, '0xe28984e1EE8D431346D32BeC9Ec800Efb643eef4'], // WAVAX-USDT.e
    [600, '0x5764b8D8039C6E32f1e5d8DE8Da05DdF974EF5D3'], // WAVAX-WBTC.e
    [1200, '0xd7538cABBf8605BdE1f4901B47B8D42c61DE0367'], // WAVAX-PNG
    // [400, '0x5875c368Cddd5FB9Bf2f410666ca5aad236DAbD4'], // WAVAX-LINK.e
    // [1000, ''], // WAVAX-DAI.e
    // [100, ''], // WAVAX-UNI.e
    // [100, ''], // WAVAX-SUSHI.e
    // [200, ''], // WAVAX-AAVE.e
    // [100, ''], // WAVAX-YFI.e
    // [100, ''], // WAVAX-SNOB
    // [100, ''], // WAVAX-VSO
    // [200, ''], // WAVAX-SPORE
    // [200, ''], // WAVAX-BIFI
    // [200, ''], // WAVAX-BNB
    // [400, ''], // WAVAX-XAVA
    // [200, ''], // WAVAX-PEFI
    // [200, ''], // WAVAX-TRYB
    // [200, ''], // WAVAX-SHERPA
    // [400, ''], // WAVAX-YAK
    // [200, ''], // WAVAX-DYP
    // [100, ''], // WAVAX-QI
    // [200, ''], // WAVAX-WALBT
    // [200, ''], // WAVAX-HUSKY
    // [1100, ''], // WAVAX-USDC.e
    // [200, ''], // WAVAX-LYD
    // [200, ''], // WAVAX-TUSD
    // [200, ''], // WAVAX-GAJ
    // [200, ''], // WAVAX-GDL
    // [100, ''], // WAVAX-MFI
    // [200, ''], // WAVAX-SHIBX
    // [100, ''], // WAVAX-AVE
    // [200, ''], // WAVAX-ELE
    // [200, ''], // WAVAX-START
    // [200, ''], // WAVAX-SWAP.e
    // [200, ''], // WAVAX-YTS
    // [200, ''], // WAVAX-TUNDRA
    // [200, ''], // WAVAX-XUSD
];


async function main() {

    const [deployer, user1] = await ethers.getSigners();

    const PNG = await ethers.getContractFactory("Png");
    const png = await PNG.attach(PNG_ADDRESS);

    // Multisig with 1m PNG
    const acc = '0x6cdD4B54562019902C03e5BE4BB4C5800A379185';

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [acc]
    });

    const pngWhale = await ethers.provider.getSigner(acc);

    await user1.sendTransaction({
        to: pngWhale._address,
        value: ethers.utils.parseEther('1000.0')
    });

    console.log("Deploying contracts with the account:", deployer.address);

    const GovernorAlpha = await ethers.getContractFactory("GovernorAlpha");
    const governorAlpha = await GovernorAlpha.attach(GOVERNOR_ADDRESS);

    const CommunityTreasury = await ethers.getContractFactory("CommunityTreasury");
    const communityTreasury = await CommunityTreasury.attach(COMMUNITY_TREASURY_ADDRESS);

    const TreasuryVester = await ethers.getContractFactory("TreasuryVester");
    const treasuryVester = await TreasuryVester.attach(TREASURY_VESTER_ADDRESS);

    // Deploy MiniChefV2
    const MiniChef = await ethers.getContractFactory("MiniChefV2");
    const miniChef = await MiniChef.deploy(
        png.address,
        deployer.address,
    );
    await miniChef.deployed();
    console.log("Deployed MiniChefV2:", miniChef.address);

    // Deploy TreasuryVesterProxy
    const TreasuryVesterProxy = await ethers.getContractFactory(`TreasuryVesterProxy`);
    const treasuryVesterProxy = await TreasuryVesterProxy.deploy(
        png.address,
        treasuryVester.address,
        communityTreasury.address,
        miniChef.address
    );
    await treasuryVesterProxy.deployed();
    console.log(`Deployed TreasuryVesterProxy:`, treasuryVesterProxy.address);
    console.log();

    // Add funder
    console.log(`Adding funders`);
    await miniChef.addFunder(treasuryVesterProxy.address);
    await miniChef.addFunder(pngWhale._address); // for quick testing
    console.log(`Done`);

    // Set owners to timelock
    console.log(`Setting owners`);
    await miniChef.transferOwnership(TIMELOCK_ADDRESS);
    await treasuryVesterProxy.transferOwnership(TIMELOCK_ADDRESS);
    console.log(`Done`);

    // Governance proposal
    const targets = [
        communityTreasury.address, // transfer
        png.address, // approve
        treasuryVester.address, // setRecipient
        treasuryVesterProxy.address, // init
        miniChef.address, // create pools
        miniChef.address, // fundRewards
        miniChef.address, // transferOwnership
    ];
    const values = [0, 0, 0, 0, 0, 0, 0];
    const sigs = [
        'transfer(address,uint256)',
        'approve(address,uint256)',
        'setRecipient(address)',
        'init()',
        'addPools(uint256[],address[],address[])',
        'fundRewards(uint256,uint256)',
        'transferOwnership(address)'
    ];
    const callDatas = [
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [TIMELOCK_ADDRESS, TWO_MILLION_PNG]),
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [miniChef.address, TWO_MILLION_PNG]),
        ethers.utils.defaultAbiCoder.encode(['address'], [treasuryVesterProxy.address]),
        ethers.constants.AddressZero, // empty bytes
        ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]', 'address[]'], [
            poolConfig.map(entry => entry[0]),
            poolConfig.map(entry => entry[1]),
            poolConfig.map(entry => ethers.constants.AddressZero)
        ]),
        ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256'], [TWO_MILLION_PNG, 30 * 86400]),
        ethers.utils.defaultAbiCoder.encode(['address'], [PANGOLIN_MULTISIG])
    ];

    console.log(`Submitting proposal`);
    await governorAlpha.connect(pngWhale).propose(targets, values, sigs, callDatas, '');
    const proposalNumber = await governorAlpha.proposalCount();
    console.log(`Made proposal #${proposalNumber}`);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    console.log(`Voting yes on proposal #${proposalNumber}`);
    await governorAlpha.connect(pngWhale).castVote(proposalNumber, true);
    console.log('Done');

    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    console.log(`Queuing proposal #${proposalNumber}`);
    await governorAlpha.queue(proposalNumber);
    console.log('Done');

    await ethers.provider.send("evm_increaseTime", [86400 * 2]);
    await ethers.provider.send("evm_mine");

    console.log(`Executing proposal #${proposalNumber}`);
    await governorAlpha.execute(
        proposalNumber,
        {
            gasLimit: 7000000
        }
    );
    console.log('Done');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
