const { expect } = require("chai");
const exp = require("constants");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Test addComponent function", async function() {
    let IBL;
    let alice, bob, carol, dean;
    beforeEach("Set enviroment", async() => {
        [deployer, alice, bob, carol, dean] = await ethers.getSigners();

        const iblContract = await ethers.getContractFactory("IBL");
        IBL = await iblContract.deploy(alice.address);
        await IBL.deployed();

    });

    it("Test addComponent function", async() => {
        let component = ["s", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString()],
            [ethers.utils.parseEther("0.5")]
        ]
        let component2 = ["s2", ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), [alice.address.toString(), bob.address.toString(), carol.address.toString()],
            [ethers.utils.parseEther("0.6"), ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.2")]
        ]
        await IBL.connect(alice).addComponent(component, { value: ethers.utils.parseEther("1") })
        await IBL.connect(alice).addComponent(component2, { value: ethers.utils.parseEther("1") })

        let componentData = await IBL.componentData("s");
        expect(componentData.id).to.equal("s");
        expect(componentData.runPrice).to.equal(ethers.utils.parseEther("1"));
        expect(componentData.downloadPrice).to.equal(ethers.utils.parseEther("1"));

        let owners = await IBL.getOwnersForComponent("s");
        expect(owners[0]).to.equal(alice.address);

        let procentages = await IBL.getProcentagesForComponent("s");
        expect(procentages[0]).to.equal(ethers.utils.parseEther("0.5"));

        let componentData2 = await IBL.componentData("s2");
        expect(componentData2.id).to.equal("s2");
        expect(componentData2.runPrice).to.equal(ethers.utils.parseEther("1"));
        expect(componentData2.downloadPrice).to.equal(ethers.utils.parseEther("1"));

        let owners2 = await IBL.getOwnersForComponent("s2");
        expect(owners2[0]).to.equal(alice.address);
        expect(owners2[1]).to.equal(bob.address);
        expect(owners2[2]).to.equal(carol.address);

        let procentages2 = await IBL.getProcentagesForComponent("s2");
        expect(procentages2[0]).to.equal(ethers.utils.parseEther("0.6"));
        expect(procentages2[1]).to.equal(ethers.utils.parseEther("0.2"));
        expect(procentages2[2]).to.equal(ethers.utils.parseEther("0.2"));
    });

    it("Test addComponent with more components", async() => {
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

        let componentData = await IBL.componentData("s");
        expect(componentData.id).to.equal("s");
        expect(componentData.runPrice).to.equal(ethers.utils.parseEther("1"));
        expect(componentData.downloadPrice).to.equal(ethers.utils.parseEther("1"));

        let owners = await IBL.getOwnersForComponent("s");
        expect(owners[0]).to.equal(alice.address);

        let procentages = await IBL.getProcentagesForComponent("s");
        expect(procentages[0]).to.equal(ethers.utils.parseEther("0.5"));

        let componentData2 = await IBL.componentData("s2");
        expect(componentData2.id).to.equal("s2");
        expect(componentData2.runPrice).to.equal(ethers.utils.parseEther("1"));
        expect(componentData2.downloadPrice).to.equal(ethers.utils.parseEther("1"));

        let owners2 = await IBL.getOwnersForComponent("s2");
        expect(owners2[0]).to.equal(alice.address);
        expect(owners2[1]).to.equal(bob.address);
        expect(owners2[2]).to.equal(carol.address);

        let procentages2 = await IBL.getProcentagesForComponent("s2");
        expect(procentages2[0]).to.equal(ethers.utils.parseEther("0.6"));
        expect(procentages2[1]).to.equal(ethers.utils.parseEther("0.2"));
        expect(procentages2[2]).to.equal(ethers.utils.parseEther("0.2"));

        let componentData3 = await IBL.componentData("s3");
        expect(componentData3.id).to.equal("s3");
        expect(componentData3.runPrice).to.equal(ethers.utils.parseEther("2"));
        expect(componentData3.downloadPrice).to.equal(ethers.utils.parseEther("3"));

        let owners3 = await IBL.getOwnersForComponent("s3");
        expect(owners3[0]).to.equal(alice.address);
        expect(owners3[1]).to.equal(dean.address);

        let procentages3 = await IBL.getProcentagesForComponent("s3");
        expect(procentages3[0]).to.equal(ethers.utils.parseEther("0.5"));
        expect(procentages3[1]).to.equal(ethers.utils.parseEther("0.5"));

        let componentData4 = await IBL.componentData("s4");
        expect(componentData4.id).to.equal("s4");
        expect(componentData4.runPrice).to.equal(ethers.utils.parseEther("4"));
        expect(componentData4.downloadPrice).to.equal(ethers.utils.parseEther("5"));

        let owners4 = await IBL.getOwnersForComponent("s4");
        expect(owners4[0]).to.equal(alice.address);
        expect(owners4[1]).to.equal(bob.address);
        expect(owners4[2]).to.equal(carol.address);
        expect(owners4[3]).to.equal(dean.address);

        let procentages4 = await IBL.getProcentagesForComponent("s4");
        expect(procentages4[0]).to.equal(ethers.utils.parseEther("0.6"));
        expect(procentages4[1]).to.equal(ethers.utils.parseEther("0.2"));
        expect(procentages4[2]).to.equal(ethers.utils.parseEther("0.1"));
        expect(procentages4[3]).to.equal(ethers.utils.parseEther("0.1"));
    })
});