pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBLERC20.sol";


contract IBL is Ownable, ReentrancyGuard {
    using SafeERC20 for IBLERC20;
    
    IBLERC20 public ibl;

    mapping(address => Componet[]) public userComponents;

    mapping(string => uint256) public componentPrice;

    mapping(string => address) public ownerComponent;

    mapping(address => uint256) public builderReward;

    mapping(address => uint256) public ownerNativeFeeAcc;

    uint256  public accruedFees;
    //IBL TEAM FEE paid for each download or run = 5%;
    uint256 public IBL_TEAM_FEE = 500;

    //POOL FEE = 95%;
    uint256 public POOL_FEE = 9500;

    address public devAddress;

    struct Componet {
        string id;
        uint256 price;
    }

    constructor(address _devAddress){
        ibl = new IBLERC20();
        devAddress = _devAddress;
    }

    function downlodApplication(string[] memory componentsIds) external payable nonReentrant {
        uint256 totalPrice = 0; 

        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += componentPrice[componentsIds[i]];
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += componentPrice[componentsIds[i]];
        }
        
        require(msg.value == totalPrice*2, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        accruedFees +=  (totalPrice*POOL_FEE) / 10000;
        ibl.mintReward(msg.sender, 10000);
    } 

    function runApplication(string[] memory componentsIds) external payable nonReentrant {
        uint256 totalPrice = 0; 

        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += componentPrice[componentsIds[i]];
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += componentPrice[componentsIds[i]];
        }
        
        require(msg.value == totalPrice*2, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        accruedFees +=  (totalPrice*POOL_FEE) / 10000;
    }

    function addComponent(string[] memory newComponentsIds, uint256[] memory componetsPrice) external nonReentrant {
        require(newComponentsIds.length == componetsPrice.length,"IBL: Different length for array");
       
        for(uint256 i=0; i<newComponentsIds.length;i++){
            userComponents[msg.sender].push(Componet(newComponentsIds[i], componetsPrice[i]));
            componentPrice[newComponentsIds[i]] = componetsPrice[i];
            ownerComponent[newComponentsIds[i]] = msg.sender;
        }
    }

    function claimNativeFeeAcc() external nonReentrant {
        uint256 fees = ownerNativeFeeAcc[msg.sender];
        require(fees > 0,"IBL: You do not have fees");
        
        ownerNativeFeeAcc[msg.sender] = 0;
        sendViaCall(payable(msg.sender), fees);
    }

    function setNewPrice(string memory componentId, uint256 newPrice) external nonReentrant {
        Componet[] memory ownerComponents = userComponents[msg.sender];

        for(uint256 i=0; i<ownerComponents.length;i++){
            if(keccak256(abi.encodePacked(ownerComponents[i].id)) == keccak256(abi.encodePacked(componentId))){
                userComponents[msg.sender][i] = Componet(componentId, newPrice);
                componentPrice[componentId] = newPrice;
            } 
        }
    }

    /**
     * Recommended method to use to send native coins.
     * 
     * @param to receiving address.
     * @param amount in wei.
     */
    function sendViaCall(address payable to, uint256 amount) internal {
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "DBXen: failed to send amount");
    }

    function setDevAddress(address _devAddress) public onlyOwner nonReentrant{
        devAddress = _devAddress;
    }
}