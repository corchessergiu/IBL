require("@nomicfoundation/hardhat-toolbox");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.17",

    networks: {
        hardhat: {
            gas: 19000000,
            allowUnlimitedContractSize: true,
            timeout: 1800000
        },
    }
};