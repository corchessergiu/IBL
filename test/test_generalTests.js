const { expect } = require("chai");
const exp = require("constants");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Test getUserComponent", async function() {
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

    it("Test setNewPrice function", async() => {
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

    it("Test runApplication functionality", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("0.5")]
        ]
        let component2 = ["s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString(), bob.address.toString(), carol.address.toString()],
            [ethers.utils.parseEther("0.6"), ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.2")]
        ]
        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") })
        await IBL.connect(alice).addComponent(component2, { value: ethers.utils.parseEther("1") })

        expect(await IBL.getCurrentCycle()).to.equal(0);
        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(ethers.utils.parseEther("0.5"));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("1000"));
        expect(await IBL.rewardPerCycle(0)).to.equal(ethers.utils.parseEther("1000"));

        let aliceNative = await IBL.ownerNativeFeeAcc(alice.address);
        await IBL.runApplication(["s2"], { value: ethers.utils.parseEther("2") });
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(BigNumber.from(aliceNative).add(ethers.utils.parseEther("0.6")));
        expect(await IBL.ownerNativeFeeAcc(bob.address)).to.equal(ethers.utils.parseEther("0.2"));
        expect(await IBL.ownerNativeFeeAcc(carol.address)).to.equal(ethers.utils.parseEther("0.2"));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("2000"));
        expect(await IBL.rewardPerCycle(0)).to.equal(ethers.utils.parseEther("2000"));

        let aliceNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(alice.address);
        let bobNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(bob.address);
        let carolNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(carol.address);
        await IBL.connect(dean).runApplication(["s2", "s"], { value: ethers.utils.parseEther("4") });
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(BigNumber.from(aliceNativeAfterSecondCall).add(ethers.utils.parseEther("0.5")).add(ethers.utils.parseEther("0.6")));
        expect(await IBL.ownerNativeFeeAcc(bob.address)).to.equal(BigNumber.from(bobNativeAfterSecondCall).add(ethers.utils.parseEther("0.2")));
        expect(await IBL.ownerNativeFeeAcc(carol.address)).to.equal(BigNumber.from(carolNativeAfterSecondCall).add(ethers.utils.parseEther("0.2")));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("1000"));
        expect(await IBL.rewardPerCycle(0)).to.equal(ethers.utils.parseEther("3000"));
    });

    it("Test runApplication functionality, more components", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("0.5")]
        ]
        let component2 = ["s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString(), bob.address.toString(), carol.address.toString()],
            [ethers.utils.parseEther("0.6"), ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.2")]
        ]
        let component3 = ["s3", ethers.utils.parseEther("2"), ethers.utils.parseEther("3"), [alice.address.toString(), dean.address.toString()],
            [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")]
        ]
        let component4 = ["s4", ethers.utils.parseEther("4"), ethers.utils.parseEther("5"), [alice.address.toString(), bob.address.toString(), carol.address.toString(), dean.address.toString()],
            [ethers.utils.parseEther("0.6"), ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.1")]
        ]

        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") })
        await IBL.connect(bob).addComponent(component2, { value: ethers.utils.parseEther("1") })
        await IBL.connect(dean).addComponent(component3, { value: ethers.utils.parseEther("3") })
        await IBL.connect(carol).addComponent(component4, { value: ethers.utils.parseEther("5") })

        expect(await IBL.getCurrentCycle()).to.equal(0);
        await IBL.runApplication(["s", "s4"], { value: ethers.utils.parseEther("10") });
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(ethers.utils.parseEther("2.9"));
        expect(await IBL.ownerNativeFeeAcc(bob.address)).to.equal(ethers.utils.parseEther("0.8"));
        expect(await IBL.ownerNativeFeeAcc(carol.address)).to.equal(ethers.utils.parseEther("0.4"));
        expect(await IBL.ownerNativeFeeAcc(dean.address)).to.equal(ethers.utils.parseEther("0.4"));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("1000"));
        expect(await IBL.rewardPerCycle(0)).to.equal(ethers.utils.parseEther("1000"));

        let aliceNative = await IBL.ownerNativeFeeAcc(alice.address);
        let bobNative = await IBL.ownerNativeFeeAcc(bob.address);
        let carolNative = await IBL.ownerNativeFeeAcc(carol.address);
        let deanNative = await IBL.ownerNativeFeeAcc(dean.address);
        await IBL.runApplication(["s", "s2", "s3"], { value: ethers.utils.parseEther("8") });
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(BigNumber.from(aliceNative).add(ethers.utils.parseEther("0.5")).add(ethers.utils.parseEther("0.6")).add(ethers.utils.parseEther("1")));
        expect(await IBL.ownerNativeFeeAcc(bob.address)).to.equal(BigNumber.from(bobNative).add(ethers.utils.parseEther("0.2")));
        expect(await IBL.ownerNativeFeeAcc(carol.address)).to.equal(BigNumber.from(carolNative).add(ethers.utils.parseEther("0.2")));
        expect(await IBL.ownerNativeFeeAcc(dean.address)).to.equal(BigNumber.from(deanNative).add(ethers.utils.parseEther("1")));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("2000"));
        expect(await IBL.rewardPerCycle(0)).to.equal(ethers.utils.parseEther("2000"));

        let aliceNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(alice.address);
        let bobNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(bob.address);
        let carolNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(carol.address);
        let deanNativeAfterSecondCall = await IBL.ownerNativeFeeAcc(dean.address);
        await IBL.runApplication(["s", "s2", "s3", "s4"], { value: ethers.utils.parseEther("16") });
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(BigNumber.from(aliceNativeAfterSecondCall).add(ethers.utils.parseEther("0.5")).add(ethers.utils.parseEther("0.6")).add(ethers.utils.parseEther("1")).add(ethers.utils.parseEther("2.4")));
        expect(await IBL.ownerNativeFeeAcc(bob.address)).to.equal(BigNumber.from(bobNativeAfterSecondCall).add(ethers.utils.parseEther("0.2")).add(ethers.utils.parseEther("0.8")));
        expect(await IBL.ownerNativeFeeAcc(carol.address)).to.equal(BigNumber.from(carolNativeAfterSecondCall).add(ethers.utils.parseEther("0.2")).add(ethers.utils.parseEther("0.4")));
        expect(await IBL.ownerNativeFeeAcc(dean.address)).to.equal(BigNumber.from(deanNativeAfterSecondCall).add(ethers.utils.parseEther("1")).add(ethers.utils.parseEther("0.4")));
        expect(await IBL.rewardPerCycle(0)).to.equal(ethers.utils.parseEther("3000"));
    });
});