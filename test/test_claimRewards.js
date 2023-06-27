const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { abi } = require("../artifacts/contracts/IBLERC20.sol/IBLERC20.json");

describe("Test claimRewards function", async function() {
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

    it("Test claimRewards function", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [deployer.address.toString()],
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

        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });

        try {
            await IBL.accRewards(deployer.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }
        expect(await IBL.accRewards(deployer.address)).to.equal(BigNumber.from("0"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        expect(await IBL.accWithdrawableStake(deployer.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(deployer.address)).to.equal(BigNumber.from("0"));
        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("200"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")
        expect(await IBL.accWithdrawableStake(deployer.address)).to.equal(BigNumber.from("0"));
        //Call setNewProce only for test update stats function
        await IBL.setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.runApplication(["s", "s2", "s3"], { value: ethers.utils.parseEther("8") });
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("400"));
        await IBL.setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("400"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine");
        await IBL.setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(deployer.address)).to.equal(ethers.utils.parseEther("1200"));
    });

    it("Test claimRewards function update data", async() => {
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

        await IBL.connect(alice).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).runApplication(["s2"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).runApplication(["s3"], { value: ethers.utils.parseEther("4") });
        await IBL.connect(carol).runApplication(["s4"], { value: ethers.utils.parseEther("8") });

        try {
            await IBL.accRewards(alice.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(bob.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(dean.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(carol.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        expect(await IBL.accRewards(alice.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(bob.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(dean.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(carol.address)).to.equal(BigNumber.from("0"));
        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        expect(await IBL.accWithdrawableStake(alice.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accWithdrawableStake(bob.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accWithdrawableStake(carol.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accWithdrawableStake(dean.address)).to.equal(BigNumber.from("0"));

        expect(await IBL.accRewards(alice.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(bob.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(dean.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(carol.address)).to.equal(BigNumber.from("0"));

        await IBL.connect(alice).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(carol).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).runApplication(["s"], { value: ethers.utils.parseEther("2") });

        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("200"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("200"));
        expect(await IBL.accRewards(carol.address)).to.equal(ethers.utils.parseEther("800"));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("400"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        //Call setNewProce only for test update stats function
        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.connect(bob).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.connect(dean).setNewPrice("s3", ethers.utils.parseEther("2"), ethers.utils.parseEther("3"));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("600"));

        await IBL.connect(carol).setNewPrice("s4", ethers.utils.parseEther("4"), ethers.utils.parseEther("5"));
        expect(await IBL.accRewards(carol.address)).to.equal(ethers.utils.parseEther("1000"));

        await IBL.connect(alice).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(carol).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).runApplication(["s"], { value: ethers.utils.parseEther("2") });

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 10])
        await hre.ethers.provider.send("evm_mine")

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("600"));

        await IBL.connect(bob).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("600"));

        await IBL.connect(dean).setNewPrice("s3", ethers.utils.parseEther("2"), ethers.utils.parseEther("3"));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("800"));

        await IBL.connect(carol).setNewPrice("s4", ethers.utils.parseEther("4"), ethers.utils.parseEther("5"));
        expect(await IBL.accRewards(carol.address)).to.equal(ethers.utils.parseEther("1200"));
    });

    it("Test claimRewards function, user balance after claim and data from contract", async() => {
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

        await IBL.connect(alice).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).runApplication(["s2"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).runApplication(["s3"], { value: ethers.utils.parseEther("4") });
        await IBL.connect(carol).runApplication(["s4"], { value: ethers.utils.parseEther("8") });

        try {
            await IBL.accRewards(alice.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(bob.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(dean.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(carol.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        expect(await IBL.accRewards(alice.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(bob.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(dean.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(carol.address)).to.equal(BigNumber.from("0"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        expect(await IBL.accWithdrawableStake(alice.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accWithdrawableStake(bob.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accWithdrawableStake(carol.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accWithdrawableStake(dean.address)).to.equal(BigNumber.from("0"));

        expect(await IBL.accRewards(alice.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(bob.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(dean.address)).to.equal(BigNumber.from("0"));
        expect(await IBL.accRewards(carol.address)).to.equal(BigNumber.from("0"));

        await IBL.connect(alice).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(carol).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).runApplication(["s"], { value: ethers.utils.parseEther("2") });

        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("200"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("200"));
        expect(await IBL.accRewards(carol.address)).to.equal(ethers.utils.parseEther("800"));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("400"));

        let aliceBalanceBeforeFirstClaim = await IBLERC20.balanceOf(alice.address);
        expect(aliceBalanceBeforeFirstClaim).to.equal(0);
        await IBL.connect(alice).claimRewards();
        let aliceBalanceAfterFirstClaim = await IBLERC20.balanceOf(alice.address);
        expect(aliceBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("200"));

        let bobBalanceBeforeFirstClaim = await IBLERC20.balanceOf(bob.address);
        expect(bobBalanceBeforeFirstClaim).to.equal(0);
        await IBL.connect(bob).claimRewards();
        let bobBalanceAfterFirstClaim = await IBLERC20.balanceOf(bob.address);
        expect(bobBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("200"));

        let deanBalanceBeforeFirstClaim = await IBLERC20.balanceOf(dean.address);
        expect(deanBalanceBeforeFirstClaim).to.equal(0);
        await IBL.connect(dean).claimRewards();
        let deanBalanceAfterFirstClaim = await IBLERC20.balanceOf(dean.address);
        expect(deanBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("400"));

        let carolBalanceBeforeFirstClaim = await IBLERC20.balanceOf(carol.address);
        expect(carolBalanceBeforeFirstClaim).to.equal(0);
        await IBL.connect(carol).claimRewards();
        let carolBalanceAfterFirstClaim = await IBLERC20.balanceOf(carol.address);
        expect(carolBalanceAfterFirstClaim).to.equal(ethers.utils.parseEther("800"));

        try {
            await IBL.accRewards(alice.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(bob.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(dean.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(carol.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        //Call setNewProce only for test update stats function
        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("200"));

        await IBL.connect(bob).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("200"));

        await IBL.connect(dean).setNewPrice("s3", ethers.utils.parseEther("2"), ethers.utils.parseEther("3"));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("200"));

        await IBL.connect(carol).setNewPrice("s4", ethers.utils.parseEther("4"), ethers.utils.parseEther("5"));
        expect(await IBL.accRewards(carol.address)).to.equal(ethers.utils.parseEther("200"));

        await IBL.connect(alice).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(bob).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(carol).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        await IBL.connect(dean).runApplication(["s"], { value: ethers.utils.parseEther("2") });

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 10])
        await hre.ethers.provider.send("evm_mine")

        await IBL.connect(alice).setNewPrice("s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(alice.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.connect(bob).setNewPrice("s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));
        expect(await IBL.accRewards(bob.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.connect(dean).setNewPrice("s3", ethers.utils.parseEther("2"), ethers.utils.parseEther("3"));
        expect(await IBL.accRewards(dean.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.connect(carol).setNewPrice("s4", ethers.utils.parseEther("4"), ethers.utils.parseEther("5"));
        expect(await IBL.accRewards(carol.address)).to.equal(ethers.utils.parseEther("400"));

        await IBL.connect(alice).claimRewards();
        let aliceBalanceAfteSecondClaim = await IBLERC20.balanceOf(alice.address);
        expect(aliceBalanceAfteSecondClaim).to.equal(ethers.utils.parseEther("400").add(aliceBalanceAfterFirstClaim));

        await IBL.connect(bob).claimRewards();
        let bobBalanceAfterSecondClaim = await IBLERC20.balanceOf(bob.address);
        expect(bobBalanceAfterSecondClaim).to.equal(ethers.utils.parseEther("400").add(bobBalanceAfterFirstClaim));

        await IBL.connect(dean).claimRewards();
        let deanBalanceAfterSecondClaim = await IBLERC20.balanceOf(dean.address);
        expect(deanBalanceAfterSecondClaim).to.equal(ethers.utils.parseEther("400").add(deanBalanceAfterFirstClaim));

        await IBL.connect(carol).claimRewards();
        let carolBalanceAfterSecondClaim = await IBLERC20.balanceOf(carol.address);
        expect(carolBalanceAfterSecondClaim).to.equal(ethers.utils.parseEther("400").add(carolBalanceAfterFirstClaim));

        try {
            await IBL.accRewards(alice.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(bob.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(dean.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }

        try {
            await IBL.accRewards(carol.address)
        } catch (error) {
            expect(error.message).to.include("IBL: account has no rewards");
        }
    });

});