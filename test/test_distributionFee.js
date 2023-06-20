const { expect } = require("chai");
const exp = require("constants");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Test addComponent function", async function() {
    let IBL;
    let alice, bob, carol, dean;
    beforeEach("Distribution fees tests", async() => {
        [deployer, alice, bob, carol, dean, devAddress] = await ethers.getSigners();

        const iblContract = await ethers.getContractFactory("IBL");
        IBL = await iblContract.deploy(devAddress.address);
        await IBL.deployed();

    });

    it("Test cycleAccruedFees and devFees variabile", async() => {
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

        let initaialDeveloperBalance = await ethers.provider.getBalance(devAddress.address);
        expect(initaialDeveloperBalance).to.equal(BigNumber.from("10000000000000000000000"));
        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });
        let feeProcentage = BigNumber.from("1000000000000000000").mul(BigNumber.from("95000000000000000000")).div(BigNumber.from("100000000000000000000"));
        expect(await IBL.cycleAccruedFees(0)).to.equal(feeProcentage);
        let afterFirstRunDeveloperBalance = await ethers.provider.getBalance(devAddress.address);
        let devFee = BigNumber.from("1000000000000000000").mul(BigNumber.from("5000000000000000000")).div(BigNumber.from("100000000000000000000"));
        expect(afterFirstRunDeveloperBalance).to.equal(devFee.add(initaialDeveloperBalance));

        await IBL.runApplication(["s", "s4"], { value: ethers.utils.parseEther("10") });
        let feeProcentageAfterTwoRuns = BigNumber.from("5000000000000000000").mul(BigNumber.from("95000000000000000000")).div(BigNumber.from("100000000000000000000"));
        expect(await IBL.cycleAccruedFees(0)).to.equal(feeProcentage.add(feeProcentageAfterTwoRuns));
        let devFeeForFirstComponent = BigNumber.from("1000000000000000000").mul(BigNumber.from("5000000000000000000")).div(BigNumber.from("100000000000000000000"));
        let devFeeForSecondComponent = BigNumber.from("4000000000000000000").mul(BigNumber.from("5000000000000000000")).div(BigNumber.from("100000000000000000000"));
        let afterSecondRunDeveloperBalance = await ethers.provider.getBalance(devAddress.address);
        expect(afterSecondRunDeveloperBalance).to.equal(devFeeForFirstComponent.add(devFeeForSecondComponent).add(afterFirstRunDeveloperBalance));
    });

    it("Test summedCycleStakes variabiles update", async() => {
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

        let initialSummedCycleStales = await IBL.summedCycleStakes(0);
        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });
        expect(await IBL.summedCycleStakes(0)).to.equal(BigNumber.from("1000000000000000000000"));

        await IBL.runApplication(["s", "s4"], { value: ethers.utils.parseEther("10") });
        expect(await IBL.summedCycleStakes(0)).to.equal(BigNumber.from("2000000000000000000000"));
    });

    it.only("Test cycleAccruedFees and devFees variabile", async() => {
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

        let initaialDeveloperBalance = await ethers.provider.getBalance(devAddress.address);
        expect(initaialDeveloperBalance).to.equal(BigNumber.from("10000000000000000000000"));
        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });
        let feeProcentage = BigNumber.from("1000000000000000000").mul(BigNumber.from("95000000000000000000")).div(BigNumber.from("100000000000000000000"));
        expect(await IBL.cycleAccruedFees(0)).to.equal(feeProcentage);
        let afterFirstRunDeveloperBalance = await ethers.provider.getBalance(devAddress.address);
        let devFee = BigNumber.from("1000000000000000000").mul(BigNumber.from("5000000000000000000")).div(BigNumber.from("100000000000000000000"));
        expect(afterFirstRunDeveloperBalance).to.equal(devFee.add(initaialDeveloperBalance));

        await IBL.runApplication(["s", "s4"], { value: ethers.utils.parseEther("10") });
        let feeProcentageAfterTwoRuns = BigNumber.from("5000000000000000000").mul(BigNumber.from("95000000000000000000")).div(BigNumber.from("100000000000000000000"));
        expect(await IBL.cycleAccruedFees(0)).to.equal(feeProcentage.add(feeProcentageAfterTwoRuns));
        let devFeeForFirstComponent = BigNumber.from("1000000000000000000").mul(BigNumber.from("5000000000000000000")).div(BigNumber.from("100000000000000000000"));
        let devFeeForSecondComponent = BigNumber.from("4000000000000000000").mul(BigNumber.from("5000000000000000000")).div(BigNumber.from("100000000000000000000"));
        let afterSecondRunDeveloperBalance = await ethers.provider.getBalance(devAddress.address);
        expect(afterSecondRunDeveloperBalance).to.equal(devFeeForFirstComponent.add(devFeeForSecondComponent).add(afterFirstRunDeveloperBalance));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")
        await IBL.runApplication(["s", "s4"], { value: ethers.utils.parseEther("10") });
        expect(await IBL.currentCycle()).to.equal(1);
        let feePerFirstCycle = feeProcentageAfterTwoRuns.add(feeProcentage);
        expect(feePerFirstCycle).to.equal(await IBL.accAccruedFees(deployer.address));
        let fees = await IBL.accAccruedFees(deployer.address);
        let deployerNativeFeeBalance = await ethers.provider.getBalance(deployer.address);
        let gas = await IBL.connect(deployer).claimFees();
        const transactionReceipt = await ethers.provider.getTransactionReceipt(gas.hash);
        const gasUsed = transactionReceipt.gasUsed;
        const gasPricePaid = transactionReceipt.effectiveGasPrice;
        const transactionFee = gasUsed.mul(gasPricePaid);

        //gas used + actual native fee balance = fees accumulated in contract + balance before claim native fee
        expect((await ethers.provider.getBalance(deployer.address)).add(transactionFee)).to.equal(fees.add(deployerNativeFeeBalance));
    });

});