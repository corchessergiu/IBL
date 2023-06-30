const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { abi } = require("../artifacts/contracts/IBLERC20.sol/IBLERC20.json");

describe("Test stake function", async function() {
    let IBL, IBLERC20;
    let alice, bob, carol, dean;
    beforeEach("Set enviroment", async() => {
        [deployer, alice, bob, carol, dean] = await ethers.getSigners();

        const iblContract = await ethers.getContractFactory("IBL");
        IBL = await iblContract.deploy(alice.address);
        await IBL.deployed();

        const IBLAddress = await IBL.ibl();
        IBLERC20 = new ethers.Contract(IBLAddress, abi, hre.ethers.provider);
    });

    it("Test stake function", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("0.5")]
        ]
        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") })
        await IBL.connect(alice).distributeFeesFoRunningApplication(["s"], { value: ethers.utils.parseEther("2") });
        expect(await IBL.accRewards(alice.address)).to.equal(BigNumber.from("0"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("200"));

        let aliceBalanceBeforeFirstClaim = await IBLERC20.balanceOf(alice.address);
        expect(aliceBalanceBeforeFirstClaim).to.equal(0);
        await IBL.connect(alice).claimRewards();
        let aliceBalanceAfterFirstClaim = await IBLERC20.balanceOf(alice.address);
        expect(aliceBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("200"));

        expect(await IBL.accStakeCycle(alice.address, 0)).to.equal(0);
        await IBLERC20.connect(alice).approve(IBL.address, ethers.utils.parseEther("4000"));
        await IBL.connect(alice).stake(ethers.utils.parseEther("200"));
        expect(await IBL.accStakeCycle(alice.address, 1)).to.equal(ethers.utils.parseEther("200"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        expect(await IBL.accStakeCycle(alice.address, 1)).to.equal(ethers.utils.parseEther("200"));

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accStakeCycle(alice.address, 1)).to.equal(ethers.utils.parseEther("0"));
        expect(await IBL.accWithdrawableStake(alice.address)).to.equal(ethers.utils.parseEther("200"))
    });

    it("Test stake function for multiple users", async() => {
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
        await IBL.connect(alice).addComponent(component2, { value: ethers.utils.parseEther("1") })
        await IBL.connect(alice).addComponent(component3, { value: ethers.utils.parseEther("3") })
        await IBL.connect(alice).addComponent(component4, { value: ethers.utils.parseEther("5") })

        await IBL.connect(alice).distributeFeesFoRunningApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).distributeFeesFoRunningApplication(["s2"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).distributeFeesFoRunningApplication(["s3"], { value: ethers.utils.parseEther("4") });
        await IBL.connect(carol).distributeFeesFoRunningApplication(["s4"], { value: ethers.utils.parseEther("8") });

        expect(await IBL.accRewards(alice.address)).to.equal(BigNumber.from("0"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        await IBL.connect(dean).setNewPrice("s3", ethers.utils.parseEther("2"), ethers.utils.parseEther("3"));
        await IBL.connect(carol).setNewPrice("s4", ethers.utils.parseEther("4"), ethers.utils.parseEther("5"));

        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("200"));

        let aliceBalanceBeforeFirstClaim = await IBLERC20.balanceOf(alice.address);
        expect(aliceBalanceBeforeFirstClaim).to.equal(0);
        await IBL.connect(alice).claimRewards();
        await IBL.connect(dean).claimRewards();
        await IBL.connect(carol).claimRewards();
        let aliceBalanceAfterFirstClaim = await IBLERC20.balanceOf(alice.address);
        let deanBalanceAfterFirstClaim = await IBLERC20.balanceOf(dean.address);
        let carolBalanceAfterFirstClaim = await IBLERC20.balanceOf(carol.address);
        expect(aliceBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("200"));
        expect(deanBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("400"));
        expect(carolBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("800"));

        expect(await IBL.accStakeCycle(alice.address, 0)).to.equal(0);
        await IBLERC20.connect(alice).approve(IBL.address, ethers.utils.parseEther("4000"));
        await IBL.connect(alice).stake(ethers.utils.parseEther("200"));
        expect(await IBL.accStakeCycle(alice.address, 1)).to.equal(ethers.utils.parseEther("200"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")
        expect(await IBL.accStakeCycle(alice.address, 1)).to.equal(ethers.utils.parseEther("200"));

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accStakeCycle(alice.address, 1)).to.equal(ethers.utils.parseEther("0"));
        expect(await IBL.accWithdrawableStake(alice.address)).to.equal(ethers.utils.parseEther("200"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        //Last active cycle have value 1!
        await IBLERC20.connect(dean).approve(IBL.address, ethers.utils.parseEther("4000"));
        let deanBalanceBeforeStake = await IBLERC20.balanceOf(dean.address);
        await IBL.connect(dean).stake(ethers.utils.parseEther("23"));
        let balanceAfterStake = await IBLERC20.balanceOf(dean.address);
        expect(deanBalanceBeforeStake).to.equal(balanceAfterStake.add(ethers.utils.parseEther("23")));
        expect(await IBL.accStakeCycle(dean.address, 1)).to.equal(ethers.utils.parseEther("23"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        await IBLERC20.connect(carol).approve(IBL.address, ethers.utils.parseEther("4000"));
        let carolBalanceBeforeStake = await IBLERC20.balanceOf(carol.address);
        await IBL.connect(carol).stake(ethers.utils.parseEther("123"));
        let carolBalanceAfterStake = await IBLERC20.balanceOf(carol.address);
        expect(carolBalanceBeforeStake).to.equal(carolBalanceAfterStake.add(ethers.utils.parseEther("123")));
        expect(await IBL.accStakeCycle(carol.address, 1)).to.equal(ethers.utils.parseEther("123"));

        await IBL.connect(bob).distributeFeesFoRunningApplication(["s2"], { value: ethers.utils.parseEther("2") });

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        await IBL.connect(bob).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("400"));
        await IBL.connect(bob).claimRewards();
        expect(await IBL.accRewards(bob.address)).to.equal("0");

        await IBLERC20.connect(bob).approve(IBL.address, ethers.utils.parseEther("4000"));
        let bobBalanceBeforeStake = await IBLERC20.balanceOf(bob.address);
        await IBL.connect(bob).stake(ethers.utils.parseEther("84"));
        let bobBalanceAfterStake = await IBLERC20.balanceOf(bob.address);
        expect(bobBalanceBeforeStake).to.equal(bobBalanceAfterStake.add(ethers.utils.parseEther("84")));
    });
});