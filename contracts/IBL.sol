pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBLERC20.sol";
contract IBL is Ownable, ReentrancyGuard {
    using SafeERC20 for IBLERC20;
    
    IBLERC20 public ibl;
    mapping(address => Component[]) public userComponents;
    mapping(string => uint256) public runPrice;
    mapping(string => uint256) public downloadPrice;
    mapping(string => address) public ownerComponent;
    mapping(address => uint256) public builderReward;
    mapping(address => uint256) public ownerNativeFeeAcc;
    mapping(uint256 => bool) public alreadyUpdateCycleData;
    uint256  public accruedFees;
    //IBL TEAM FEE paid for each download or run = 5%;
    uint256 public IBL_TEAM_FEE = 500;
    //POOL FEE = 95%;
    uint256 public POOL_FEE = 9500;
    address public devAddress;
    /**
     * Index (0-based) of the current cycle.
     * 
     * Updated upon cycle setup that is triggered by contract interraction 
     * (account burn tokens, claims fees, claims rewards, stakes or unstakes).
     */
    uint256 public currentCycle;
    /**
     * Contract creation timestamp.
     * Initialized in constructor.
     */
    uint256 public immutable i_initialTimestamp;
    /**
     * Length of a reward distribution cycle. 
     * Initialized in contstructor to 1 day.
     */
    uint256 public immutable i_periodDuration;
    /**
     * The fee amount the account can withdraw.
     */
    mapping(address => uint256) public accAccruedFees;
    struct Component {
        string id;
        uint256 runPrice;
        uint256 downloadPrice;
    }
    /**
     * @dev Emitted when `account` claims an amount of `fees` in native token
     * through {claimFees} in `cycle`.
     */
    event FeesClaimed(
        uint256 indexed cycle,
        address indexed account,
        uint256 fees
    );
    constructor(address _devAddress){
        ibl = new IBLERC20();
        devAddress = _devAddress;
        i_initialTimestamp = block.timestamp;
        i_periodDuration = 1 days;
    }
    function downlodApplication(string[] memory componentsIds) external payable nonReentrant {
        uint256 totalPrice = 0; 
        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += downloadPrice[componentsIds[i]];
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += downloadPrice[componentsIds[i]];
        }
        
        require(msg.value == totalPrice*2, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        accruedFees +=  (totalPrice*POOL_FEE) / 10000;
        ibl.mintReward(msg.sender, 10000 * 10**18);
    } 
    function runApplication(string[] memory componentsIds) external payable nonReentrant {
        uint256 totalPrice = 0; 
        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += runPrice[componentsIds[i]];
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += runPrice[componentsIds[i]];
        }
        
        require(msg.value == totalPrice*2, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        accruedFees +=  (totalPrice*POOL_FEE) / 10000;
    }
    function addComponent(Component[] memory components) external nonReentrant {
        for(uint256 i=0; i<components.length;i++){
            userComponents[msg.sender].push(Component(components[i].id, components[i].runPrice, components[i].downloadPrice));
            runPrice[components[i].id] = components[i].runPrice;
            downloadPrice[components[i].id] = components[i].downloadPrice;
            ownerComponent[components[i].id] = msg.sender;
        }
    }
    function setNewPrice(Component memory newComponent) external nonReentrant {
        Component[] memory ownerComponents = userComponents[msg.sender];
        for(uint256 i=0; i<ownerComponents.length;i++){
            if(keccak256(abi.encodePacked(ownerComponents[i].id)) == keccak256(abi.encodePacked(newComponent.id))){
                userComponents[msg.sender][i] = Component(newComponent.id, newComponent.runPrice, newComponent.downloadPrice);
                runPrice[newComponent.id] = newComponent.runPrice;
                downloadPrice[newComponent.id] = newComponent.downloadPrice;
            } 
        }
    }
    
    function claimNativeFeeAcc() external nonReentrant {
        uint256 fees = ownerNativeFeeAcc[msg.sender];
        require(fees > 0,"IBL: You do not have fees");
        
        ownerNativeFeeAcc[msg.sender] = 0;
        sendViaCall(payable(msg.sender), fees);
    }
    /**
     * @dev Transfers newly accrued fees to sender's address.
     */
    function claimFees()
        external
        nonReentrant()
    {
        calculateCycle();
        uint256 fees = accAccruedFees[_msgSender()];
        require(fees > 0, "DBXen: amount is zero");
        accAccruedFees[_msgSender()] = 0;
        sendViaCall(payable(_msgSender()), fees);
        emit FeesClaimed(getCurrentCycle(), _msgSender(), fees);
    }
    /**
     * @dev Updates the index of the cycle.
     */
    function calculateCycle() internal {
        uint256 calculatedCycle = getCurrentCycle();
        
        if (calculatedCycle > currentCycle) {
            currentCycle = calculatedCycle;
        }
    }
    /**
     * @dev Returns the index of the cycle at the current block time.
     */
    function getCurrentCycle() public view returns (uint256) {
        return (block.timestamp - i_initialTimestamp) / i_periodDuration;
    }
    function appInteraction() external nonReentrant {
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