const { expect } = require("chai");
const exp = require("constants");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Test addComponent function", async function() {
    let IBL;
    let alice, bob, carol, dean;
    beforeEach("Distribution fees tests", async() => {
        [deployer, alice, bob, carol, dean, devAddress, runner1, runner2, runner3, runner4] = await ethers.getSigners();

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

    it("Test ownerNativeFeeAcc distribution", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("1")]
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

        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") });
        await IBL.runApplication(["s"], { value: ethers.utils.parseEther("2") });
        let aliceBalanceBeforeClaim = await ethers.provider.getBalance(alice.address);
        let gas = await IBL.connect(alice).claimComponentOwnerFees();
        const transactionReceipt = await ethers.provider.getTransactionReceipt(gas.hash);
        const gasUsed = transactionReceipt.gasUsed;
        const gasPricePaid = transactionReceipt.effectiveGasPrice;
        const transactionFee = gasUsed.mul(gasPricePaid);
        let aliceBalanceAfterClaim = await ethers.provider.getBalance(alice.address);
        expect(aliceBalanceAfterClaim.sub(BigNumber.from("1000000000000000000")).add(transactionFee)).to.equal(aliceBalanceBeforeClaim);

        await IBL.connect(bob).addComponent(component2, { value: ethers.utils.parseEther("1") });
        await IBL.runApplication(["s2"], { value: ethers.utils.parseEther("2") });
        let gas2 = await IBL.connect(alice).claimComponentOwnerFees();
        const transactionReceipt2 = await ethers.provider.getTransactionReceipt(gas2.hash);
        const gasUsed2 = transactionReceipt2.gasUsed;
        const gasPricePaid2 = transactionReceipt2.effectiveGasPrice;
        const transactionFee2 = gasUsed2.mul(gasPricePaid2);
        let aliceBalanceAfterSecondClaim = await ethers.provider.getBalance(alice.address);
        expect(aliceBalanceAfterSecondClaim.sub(BigNumber.from("600000000000000000")).add(transactionFee2)).to.equal(aliceBalanceAfterClaim);
    });

    it("Test fees distribution", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("1")]
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

        expect(await ethers.provider.getBalance(devAddress.address)).to.equal(ethers.utils.parseEther("10").add(ethers.utils.parseEther("10000")))
        let initialBalanceRunner1 = await ethers.provider.getBalance(runner1.address);
        let initialBalanceRunner2 = await ethers.provider.getBalance(runner2.address);

        expect(initialBalanceRunner1).to.equal(ethers.utils.parseEther("10000"));
        expect(initialBalanceRunner2).to.equal(ethers.utils.parseEther("10000"));
        //Cycle 0, Alice run application
        let runner1GasUsed = await IBL.connect(runner1).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        const transactionReceiptRunner1FirstRun = await ethers.provider.getTransactionReceipt(runner1GasUsed.hash);
        const gasUsedRunner1FirstRun = transactionReceiptRunner1FirstRun.gasUsed;
        const gasPricePaidRunner1FirstRun = transactionReceiptRunner1FirstRun.effectiveGasPrice;
        const transactionFeeRunner1 = gasUsedRunner1FirstRun.mul(gasPricePaidRunner1FirstRun);
        let balanceRunner1AfterFirstRun = await ethers.provider.getBalance(runner1.address);
        expect(balanceRunner1AfterFirstRun.add(transactionFeeRunner1).add(ethers.utils.parseEther("2"))).to.equal(initialBalanceRunner1);

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        //Cycle 1, Alice run application again
        let runner2GasUsed = await IBL.connect(runner2).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        const transactionReceiptRunner2FirstRun = await ethers.provider.getTransactionReceipt(runner2GasUsed.hash);
        const gasUsedRunner2FirstRun = transactionReceiptRunner2FirstRun.gasUsed;
        const gasPricePaidRunner2FirstRun = transactionReceiptRunner2FirstRun.effectiveGasPrice;
        const transactionFeeRunner2 = gasUsedRunner2FirstRun.mul(gasPricePaidRunner2FirstRun);
        let balanceRunner2AfterFirstRun = await ethers.provider.getBalance(runner2.address);
        expect(balanceRunner2AfterFirstRun.add(transactionFeeRunner2).add(ethers.utils.parseEther("2"))).to.equal(initialBalanceRunner2);
        let cycle0AccFees = await IBL.cycleAccruedFees(0);
        expect(cycle0AccFees).to.equal(ethers.utils.parseEther("0.95"));

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")
            //Cycle 2, Alice run application again
        let runner1GasUsedRun2 = await IBL.connect(runner1).runApplication(["s"], { value: ethers.utils.parseEther("2") });
        const transactionReceiptRunner1SecondRun = await ethers.provider.getTransactionReceipt(runner1GasUsedRun2.hash);
        const gasUsedRunner1SecondRun = transactionReceiptRunner1SecondRun.gasUsed;
        const gasPricePaidRunner1SecondRun = transactionReceiptRunner1SecondRun.effectiveGasPrice;
        const transactionFeeRunner1SecondRun = gasUsedRunner1SecondRun.mul(gasPricePaidRunner1SecondRun);
        let balanceRunner1AfterSecondRun = await ethers.provider.getBalance(runner1.address);
        expect(balanceRunner1AfterSecondRun.add(transactionFeeRunner1SecondRun).add(ethers.utils.parseEther("2"))).to.equal(balanceRunner1AfterFirstRun);

        let cycle1AccFees = await IBL.cycleAccruedFees(1);
        expect(cycle0AccFees).to.equal(ethers.utils.parseEther("0.95"));

        let runner1ClaimFee = await IBL.connect(runner1).claimFees();
        const transactionReceiptRunner1ClaimFees = await ethers.provider.getTransactionReceipt(runner1ClaimFee.hash);
        const gasUsedRunner1ClaimFee = transactionReceiptRunner1ClaimFees.gasUsed;
        const gasPricePaidRunner1ClaimFee = transactionReceiptRunner1ClaimFees.effectiveGasPrice;
        const transactionFeeRunner1ClaimFee = gasUsedRunner1ClaimFee.mul(gasPricePaidRunner1ClaimFee);
        let balanceRunner1AfterClaimFee = await ethers.provider.getBalance(runner1.address);
        expect(balanceRunner1AfterClaimFee.add(transactionFeeRunner1ClaimFee).sub(ethers.utils.parseEther("1.9"))).to.equal(balanceRunner1AfterSecondRun);

        let runner2GasUsedClaimFee = await IBL.connect(runner2).claimFees();
        const transactionReceiptRunner2ClaimFee = await ethers.provider.getTransactionReceipt(runner2GasUsedClaimFee.hash);
        const gasUsedRunner2ClaimFee = transactionReceiptRunner2ClaimFee.gasUsed;
        const gasPricePaidRunner2ClaimFee = transactionReceiptRunner2ClaimFee.effectiveGasPrice;
        const transactionFeeRunnerClaimFee = gasUsedRunner2ClaimFee.mul(gasPricePaidRunner2ClaimFee);
        let balanceRunner2AfterClaimFee = await ethers.provider.getBalance(runner2.address);
        expect(balanceRunner2AfterClaimFee.add(transactionFeeRunnerClaimFee).sub(ethers.utils.parseEther("0.95"))).to.equal(balanceRunner2AfterFirstRun);

        let initialAliceBalace = await ethers.provider.getBalance(alice.address);
        expect(await IBL.ownerNativeFeeAcc(alice.address)).to.equal(ethers.utils.parseEther("3"));

        let aliceOwnerFeeClaim = await IBL.connect(alice).claimComponentOwnerFees();
        const transactionReceiptAliceOwnerFeeClaim = await ethers.provider.getTransactionReceipt(aliceOwnerFeeClaim.hash);
        const gasUsedAliceOwnerFeeClaim = transactionReceiptAliceOwnerFeeClaim.gasUsed;
        const gasPricePaidAliceOwnerFeeClaim = transactionReceiptAliceOwnerFeeClaim.effectiveGasPrice;
        const transactionFeeAliceOwnerFeeClaim = gasUsedAliceOwnerFeeClaim.mul(gasPricePaidAliceOwnerFeeClaim);

        let aliceBalanceAfterOwnerFeeClaim = await ethers.provider.getBalance(alice.address);
        expect(initialAliceBalace.add(ethers.utils.parseEther("3"))).to.equal(aliceBalanceAfterOwnerFeeClaim.add(transactionFeeAliceOwnerFeeClaim));

        expect(await ethers.provider.getBalance(IBL.address)).to.equal(0);
    });

    it.only("Test fees distribution with complex scenarios", async() => {
        let component = ["s", ethers.utils.parseEther("2"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("1")]
        ]
        let component2 = ["s2", ethers.utils.parseEther("2"), ethers.utils.parseEther("1"), [alice.address.toString(), bob.address.toString(), carol.address.toString()],
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

        expect(await ethers.provider.getBalance(devAddress.address)).to.equal(ethers.utils.parseEther("10").add(ethers.utils.parseEther("10000")))
        let initialBalanceRunner1 = await ethers.provider.getBalance(runner1.address);
        let initialBalanceRunner2 = await ethers.provider.getBalance(runner2.address);
        let initialBalanceRunner3 = await ethers.provider.getBalance(runner3.address);
        let initialBalanceRunner4 = await ethers.provider.getBalance(runner4.address);

        expect(initialBalanceRunner1).to.equal(ethers.utils.parseEther("10000"));
        expect(initialBalanceRunner2).to.equal(ethers.utils.parseEther("10000"));
        expect(initialBalanceRunner3).to.equal(ethers.utils.parseEther("10000"));
        expect(initialBalanceRunner4).to.equal(ethers.utils.parseEther("10000"));

        await IBL.connect(runner1).runApplication(["s"], { value: ethers.utils.parseEther("4") });

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        let feeProcentageFirstRun = BigNumber.from("2000000000000000000").mul(BigNumber.from("95000000000000000000")).div(BigNumber.from("100000000000000000000"));
        await IBL.connect(runner1).runApplication(["s"], { value: ethers.utils.parseEther("4") });
        let accPerCycle0 = await IBL.accAccruedFees(runner1.address);
        expect(feeProcentageFirstRun).to.equal(accPerCycle0);

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")
        await IBL.connect(runner1).runApplication(["s2"], { value: ethers.utils.parseEther("4") });
        let accPerCycle1 = accPerCycle0.add(feeProcentageFirstRun);
        let cycle2AccFees = await IBL.accAccruedFees(runner1.address)
        expect(accPerCycle1).to.equal(cycle2AccFees);

        await IBL.connect(runner2).runApplication(["s2"], { value: ethers.utils.parseEther("4") });
        expect(await IBL.currentCycle()).to.equal("2");

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        let runner1BalanceBeforeClaim = await ethers.provider.getBalance(runner1.address);
        let runner2BalanceBeforeClaim = await ethers.provider.getBalance(runner2.address);

        let runner1ClaimFees = await IBL.connect(runner1).claimFees();
        const transactionReceiptRunner1ClaimFees = await ethers.provider.getTransactionReceipt(runner1ClaimFees.hash);
        const gasUsedRunner1ClaimFee = transactionReceiptRunner1ClaimFees.gasUsed;
        const gasPricePaidRunner1ClaimFee = transactionReceiptRunner1ClaimFees.effectiveGasPrice;
        const transactionFeeRunner1ClaimFee = gasUsedRunner1ClaimFee.mul(gasPricePaidRunner1ClaimFee);

        //Cycle 0, protocol fee = 1.9
        //Cycle 1, protocol fee = 1.9
        //Cycle 2, protocol fee = 3.8
        //Claim: Runner 1 get cycle 0 and cycle 1 protocol fee => balance = 3.8 and also get 75% from cycle 2 which have 3.8 eth to distribute in protocol fee
        //Claim: Runner 2 get from cycle 2 25% => 0.95(25/100*3.8)
        //=> Runner 1 must claim 6.65 eth from fees
        //=>Runner 2 must claim 0.95 eth from fees
        let runner1BalanceAfterClaim = await ethers.provider.getBalance(runner1.address);
        expect(runner1BalanceAfterClaim.add(transactionFeeRunner1ClaimFee)).to.equal(runner1BalanceBeforeClaim.add(BigNumber.from("6650000000000000000")))

        let runner2ClaimFees = await IBL.connect(runner2).claimFees();
        const transactionReceiptRunner2ClaimFees = await ethers.provider.getTransactionReceipt(runner2ClaimFees.hash);
        const gasUsedRunner2ClaimFee = transactionReceiptRunner2ClaimFees.gasUsed;
        const gasPricePaidRunner2ClaimFee = transactionReceiptRunner2ClaimFees.effectiveGasPrice;
        const transactionFeeRunner2ClaimFee = gasPricePaidRunner2ClaimFee.mul(gasUsedRunner2ClaimFee);

        let runner2BalanceAfterClaim = await ethers.provider.getBalance(runner2.address);
        expect(runner2BalanceAfterClaim.add(transactionFeeRunner2ClaimFee)).to.equal(runner2BalanceBeforeClaim.add(BigNumber.from("950000000000000000")))
    })
});