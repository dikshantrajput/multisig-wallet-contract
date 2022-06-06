// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";
contract MultiSig{
    uint256 private txId;
    uint256 public balance;
    uint256 private requiredSignatures;
    address[] private rawOwners;
    mapping (address => uint8) private owners;

    uint256 private constant TIME_LOCK = 1 seconds;

    struct Transaction{
        address to;
        address from;
        uint256 value;
        string data;
        bool isExecuted;
        uint256 votes;
        uint256 timestamp;
        mapping (address => bool) approvals;
    }

    Transaction[] public transactions;

    modifier onlyOwner(){
        require(owners[msg.sender] == 1,"Not the owner");
        _;
    }

    modifier validTx(uint256 _txId){
        require(_txId < txId,"Invalid tx id");
        _;
    }

    modifier notApproved(uint256 _txId){
        require(! transactions[_txId].approvals[msg.sender], "Already approved");
        _;
    }

    modifier notExecuted(uint256 _txId){
        require(! transactions[_txId].isExecuted, "Already executed");
        _;
    }

    modifier txCreator(uint256 _txId){
        require(transactions[_txId].from == msg.sender, "Not the creator of tx");
        _;
    }

    modifier minimumApprovals(uint256 _txId){
        require(transactions[_txId].votes >= requiredSignatures, "Less approvals");
        _;
    }

    event ProposeTransaction(address indexed from, address indexed to, uint256 value,string data);
    event ApproveTransaction(uint txId ,address indexed approvedFrom);
    event RevokeApproval(uint txId ,address indexed revokedFrom);
    event ExecuteTransaction(uint txId);
    event Deposit(address indexed from,uint value, uint timestamp);
    event Withdraw(address indexed from,uint value, uint timestamp);

    constructor(address[] memory _owners, uint256 _requiredSig){
        require(_requiredSig <= _owners.length,"Invalid sig count");
        for(uint256 i=0;i<_owners.length;i++){
            require(_owners[i] != address(0),"Invalid address");
            owners[_owners[i]] = 1;
        }
        rawOwners = _owners;
        requiredSignatures = _requiredSig;
    }

    function deposit() public payable{
        require(msg.value > 0,"No ethers given");
        balance+=msg.value;
        emit Deposit(msg.sender,msg.value,block.timestamp);
    }

    function proposeTransaction(address _to, uint256 _value, string memory _data) public onlyOwner {
        Transaction storage txn = transactions.push();
        txn.to = _to;
        txn.from = msg.sender;
        txn.value = _value;
        txn.data = _data;
        txn.timestamp = block.timestamp;
        txn.votes = 1;
        txn.approvals[msg.sender] = true;
        txId++;
        emit ProposeTransaction(msg.sender, _to, _value,_data);
    }
    
    function approveTransaction(uint256 _txId) public onlyOwner validTx(_txId) notApproved(_txId) notExecuted(_txId){
        Transaction storage transaction = transactions[_txId];
        transaction.approvals[msg.sender] = true;
        transaction.votes++;
        emit ApproveTransaction(_txId ,msg.sender);
    }
    
    function executeTransaction(uint256 _txId) public onlyOwner validTx(_txId) txCreator(_txId) notExecuted(_txId) minimumApprovals(_txId){
        //require time to be 1 second spent
        require(transactions[_txId].timestamp + TIME_LOCK < block.timestamp,"Can only execute after a second");
        
        Transaction storage transaction = transactions[_txId];
        require(balance >= transaction.value,"Not enough balance");
        balance -= transaction.value;
        transaction.isExecuted = true;
        //if data withdraw, ditsibute value among equally
        if(keccak256(abi.encodePacked(transaction.data)) == keccak256(abi.encodePacked("withdraw"))){
            uint256 amountToTransfer = transaction.value / rawOwners.length;
            for(uint256 i=0;i<rawOwners.length;i++){
                payable(rawOwners[i]).transfer(amountToTransfer);
                emit Withdraw(msg.sender,amountToTransfer,block.timestamp);
            }
        }else{
            payable(transaction.to).transfer(transaction.value);
        }
        emit ExecuteTransaction(_txId);
    }

    function revokeApproval(uint256 _txId) public onlyOwner validTx(_txId) notExecuted(_txId){
        Transaction storage transaction = transactions[_txId];
        require(transaction.from != msg.sender, "Can't revoke self vote");
        require(transaction.approvals[msg.sender] == true,"Not approved");
        transaction.votes--;
        transaction.approvals[msg.sender] = false;
        emit RevokeApproval(_txId ,msg.sender);
    }

    function withdraw() public onlyOwner{
        //withdraw funds equally in everyones wallet
        uint256 amountToTransfer = balance / rawOwners.length;
        balance = 0;
        for(uint256 i=0;i<rawOwners.length;i++){
            payable(rawOwners[i]).transfer(amountToTransfer);
            emit Withdraw(msg.sender,amountToTransfer,block.timestamp);
        }
    }
    
    // ["0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"],2
}