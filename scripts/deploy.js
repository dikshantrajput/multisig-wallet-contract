// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const hre = require("hardhat");

//0x3B06e9393C36B0E746Ee3E391787f44E75ba157a
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const MultiSig = await hre.ethers.getContractFactory("MultiSig");
  const addresses = ["0x525c9C19b7c57f9c02b352C7FD8F93526ab694fB","0xC71207584348042e773C1AD780b3738f9C74b7c7","0x4bc501e30bA11d9f17D7a63678761896c3BDeF97"]
  const requiredSignatures = 2;
  const multiSig = await MultiSig.deploy(addresses,requiredSignatures);

  await multiSig.deployed();

  console.log("multiSig deployed to:", multiSig.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
