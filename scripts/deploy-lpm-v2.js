const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

const { PNG_ADDRESS, TREASURY_VESTER_ADDRESS } = require("./mainnet-constants");
const { AVAX_ETH, AVAX_WBTC, AVAX_LINK, AVAX_PNG, AVAX_USDT, AVAX_SUSHI,
    AVAX_DAI, AVAX_AAVE, AVAX_UNI, AVAX_YFI, PNG_ETH, PNG_WBTC, PNG_LINK,
    PNG_USDT, PNG_SUSHI, PNG_DAI, PNG_AAVE, PNG_UNI, PNG_YFI } = require("./mainnet-pools");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:",deployer.address);

    const initBalance = await deployer.getBalance();
    console.log("Account balance:", initBalance.toString());

    const WAVAX = ethers.utils.getAddress("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");

    // Deploy LiquidityPoolManagerV2
    const LpManager = await ethers.getContractFactory("LiquidityPoolManagerV2");
    const lpManager = await LpManager.deploy(WAVAX, PNG_ADDRESS,
        TREASURY_VESTER_ADDRESS);
    await lpManager.deployed();

    console.log("LpManagerV2 address: ", lpManager.address);

    // whitelist pools
    await lpManager.addWhitelistedPool(AVAX_ETH, 100);
    console.log("Whitelisted AVAX_ETH");

    await lpManager.addWhitelistedPool(AVAX_WBTC, 100);
    console.log("Whitelisted AVAX_WBTC");

    await lpManager.addWhitelistedPool(AVAX_LINK, 100);
    console.log("Whitelisted AVAX_LINK");

    await lpManager.addWhitelistedPool(AVAX_USDT, 100);
    console.log("Whitelisted AVAX_USDT");

    await lpManager.addWhitelistedPool(AVAX_SUSHI,100);
    console.log("Whitelisted AVAX_SUSH");

    await lpManager.addWhitelistedPool(AVAX_DAI, 100);
    console.log("Whitelisted AVAX_DAI");

    await lpManager.addWhitelistedPool(AVAX_AAVE, 100);
    console.log("Whitelisted AVAX_AAVE");

    await lpManager.addWhitelistedPool(AVAX_UNI, 100);
    console.log("Whitelisted AVAX_UNI");

    await lpManager.addWhitelistedPool(AVAX_YFI, 100);
    console.log("Whitelisted AVAX_YFI");

    await lpManager.addWhitelistedPool(AVAX_PNG, 300);
    console.log("Whitelisted AVAX_PNG");

    await lpManager.addWhitelistedPool(PNG_ETH, 300);
    console.log("Whitelisted PNG_ETH");

    await lpManager.addWhitelistedPool(PNG_WBTC, 300);
    console.log("Whitelisted PNG_WBTC");

    await lpManager.addWhitelistedPool(PNG_LINK,300);
    console.log("Whitelisted PNG_LIN");

    await lpManager.addWhitelistedPool(PNG_USDT, 300);
    console.log("Whitelisted PNG_USDT");

    await lpManager.addWhitelistedPool(PNG_SUSHI, 300);
    console.log("Whitelisted PNG_SUSHI");

    await lpManager.addWhitelistedPool(PNG_DAI, 300);
    console.log("Whitelisted PNG_DAI");

    await lpManager.addWhitelistedPool(PNG_AAVE, 300);
    console.log("Whitelisted PNG_AAVE");

    await lpManager.addWhitelistedPool(PNG_UNI, 300);
    console.log("Whitelisted PNG_UNI");

    await lpManager.addWhitelistedPool(PNG_YFI,300);
    console.log("Whitelisted PNG_YFI");

    await lpManager.setAvaxPngPair(AVAX_PNG);
    console.log("AVAX/PNG set")

    const endBalance = await deployer.getBalance();
    console.log("Deploy cost: ", initBalance.sub(endBalance).toString())
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
