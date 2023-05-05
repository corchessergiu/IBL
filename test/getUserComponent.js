const { expect } = require("chai");
const exp = require("constants");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe.only("Test getUserComponent", async function() {
    let IBL;
    let alice, bob, carol, dean;
    beforeEach("Set enviroment", async() => {
        [deployer, alice, bob, carol, dean] = await ethers.getSigners();

        const iblContract = await ethers.getContractFactory("IBL");
        IBL = await iblContract.deploy(alice.address);
        await IBL.deployed();

    });

    it("Test data", async() => {
        let data = [
            ["1", 1, 2],
            ["2", 3, 4],
        ];
        await IBL.addComponent(data)
        let arrayLength = await IBL.getUserComponentNumber(deployer.address);
        let val = await IBL.getUserComponent(deployer.address, 0, Number(arrayLength));
        console.log(val)
    });

});