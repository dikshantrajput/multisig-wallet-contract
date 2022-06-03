const { expect } = require("chai");
const { ethers } = require("hardhat");
let provider = ethers.provider

describe("MultiSig", function () {
  let multiSig;
  let addr1,addr2,addr3,addr4;
  let owner;

  beforeEach(async () => {
    const MultiSig = await hre.ethers.getContractFactory("MultiSig");
    [owner,addr1,addr2,addr3,addr4] = await ethers.getSigners();
    const addresses = [addr1.address,addr2.address,addr3.address]
    const requiredSignatures = 2;
    multiSig = await MultiSig.deploy(addresses,requiredSignatures);

    await multiSig.deployed();
  });

  it("Should return balance equal to 0", async function () {
    expect(await multiSig.balance()).to.equal(0);
  });

  it("Should deposit funds into contract and balance should be equal to deposited amount and event should be emitted", async function () {
    let amount = "10000000000000000000"; //10 ethers
    let tx = await multiSig.connect(addr1).deposit({value: ethers.utils.parseEther("10")});
    let receipt = await tx.wait();
    let events = receipt.events;
    let depositEvent = events.find((e)=>e.event == 'Deposit');
    let event_params = depositEvent.args;

    expect(event_params.from).to.equal(addr1.address);
    expect(event_params.value).to.equal(ethers.utils.parseEther("10"));
    expect(await multiSig.balance()).to.equal(amount);
  });

  it("Should propose transaction and event should be emitted", async function () {
    let amount = ethers.utils.parseEther("1"); //1 ethers
    let tx = await multiSig.connect(addr1).proposeTransaction(addr4.address,amount,"first proposal");
    let receipt = await tx.wait();

    let txn = await multiSig.transactions(0)
    expect(txn.to).to.equal(addr4.address);
    expect(txn.from).to.equal(addr1.address);
    expect(txn.value).to.equal(amount);
    expect(txn.data).to.equal("first proposal");
    expect(txn.isExecuted).to.equal(false);
    expect(txn.votes).to.equal(1);

    let events = receipt.events;
    let proposalEvent = events.find((e)=>e.event == 'ProposeTransaction');
    let event_params = proposalEvent.args;

    expect(event_params.from).to.equal(addr1.address);
    expect(event_params.to).to.equal(addr4.address);
    expect(event_params.value).to.equal(amount);
    expect(event_params.data).to.equal("first proposal");
  });

  it("Should approve transaction", async function () {
    let amount = ethers.utils.parseEther("1"); //1 ethers
    let tx = await multiSig.connect(addr1).proposeTransaction(addr4.address,amount,"first proposal");
    await tx.wait();

    tx = await multiSig.connect(addr2).approveTransaction(0);
    await tx.wait();

    let txn = await multiSig.transactions(0)
    expect(txn.votes).to.equal(2);
  });

  it("Should revoke approval", async function () {
    let amount = ethers.utils.parseEther("1"); //1 ethers
    let tx = await multiSig.connect(addr1).proposeTransaction(addr4.address,amount,"first proposal");
    await tx.wait();

    tx = await multiSig.connect(addr2).approveTransaction(0);
    await tx.wait();

    let txn = await multiSig.transactions(0)
    expect(txn.votes).to.equal(2);

    tx = await multiSig.connect(addr2).revokeApproval(0);
    await tx.wait();

    txn = await multiSig.transactions(0)
    expect(txn.votes).to.equal(1);
  });

  it("Should execute transaction", async function () {
    let amount = ethers.utils.parseEther("1"); //1 ethers
    
    let tx = await multiSig.connect(addr1).deposit({value: ethers.utils.parseEther("10")});
    await tx.wait();

    tx = await multiSig.connect(addr1).proposeTransaction(addr4.address,amount,"first proposal");
    await tx.wait();
    
    tx = await multiSig.connect(addr2).approveTransaction(0);
    await tx.wait();
    
    let balance = await provider.getBalance(addr4.address)
    tx = await multiSig.connect(addr1).executeTransaction(0);
    await tx.wait();
    let txn = await multiSig.transactions(0)
    expect(txn.isExecuted).to.equal(true);
    expect((await provider.getBalance(addr4.address))/100000).to.equal(parseInt(balance/100000)+parseInt(amount/100000))
    expect(await multiSig.balance()).to.equal(ethers.utils.parseEther("9"))

  });

  it("Should withdraw and deposit in equal amount",async()=>{
    let tx = await multiSig.connect(addr1).deposit({value: ethers.utils.parseEther("10")});
    await tx.wait();
    
    let bal = await provider.getBalance(addr2.address);

    tx = await multiSig.connect(addr1).withdraw()
    await tx.wait()

    expect((await provider.getBalance(addr2.address))/10000).to.equal(parseInt(bal/10000) + parseInt(ethers.utils.parseEther("10")/30000))
  })

});
