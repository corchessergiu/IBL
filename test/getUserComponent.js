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
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), ["0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"],
            [1]
        ]
        await IBL.addComponent(component, { value: ethers.utils.parseEther("1") })
        let val = await IBL.componentData("s");
        console.log(val)
    });

    it("Test download function", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("0.5")]
        ]
        let component2 = ["s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString(), bob.address.toString(), carol.address.toString()],
            [ethers.utils.parseEther("0.6"), ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.2")]
        ]
        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") })
        await IBL.connect(alice).addComponent(component2, { value: ethers.utils.parseEther("1") })
        await IBL.downlodApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.downlodApplication(["s2"], { value: ethers.utils.parseEther("2") });
        console.log(await IBL.ownerNativeFeeAcc(alice.address));
        console.log(await IBL.ownerNativeFeeAcc(bob.address));
        console.log(await IBL.ownerNativeFeeAcc(carol.address));
    });

    it.only("Test setNewPrice function", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("0.5")]
        ]
        let component2 = ["s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString(), bob.address.toString(), carol.address.toString()],
            [ethers.utils.parseEther("0.6"), ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.2")]
        ]
        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") })
        await IBL.connect(alice).addComponent(component2, { value: ethers.utils.parseEther("1") })
        await IBL.downlodApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.downlodApplication(["s2"], { value: ethers.utils.parseEther("2") });
        console.log(await IBL.ownerNativeFeeAcc(alice.address));
        console.log(await IBL.ownerNativeFeeAcc(bob.address));
        console.log(await IBL.ownerNativeFeeAcc(carol.address));

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("2"), ethers.utils.parseEther("2"), { value: ethers.utils.parseEther("1") });
        console.log(await IBL.getFees("s"));
        await IBL.connect(bob).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("0"));
        console.log(await IBL.getFees("s2"));
        await IBL.connect(carol).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("5"), { value: ethers.utils.parseEther("4") });
        console.log(await IBL.getFees("s2"));
        await IBL.connect(alice).setNewPrice("s2", ethers.utils.parseEther("10"), ethers.utils.parseEther("1"));
        console.log(await IBL.getFees("s2"));
    });

});