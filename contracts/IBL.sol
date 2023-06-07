// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBLERC20.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract IBL is Ownable, ReentrancyGuard {
    using SafeERC20 for IBLERC20;
    
    IBLERC20 public ibl;

    mapping(address => mapping(string => Component)) public userComponents;

    mapping(string => Component) public componentData;

    mapping(string => uint256) public runPrice;

    mapping(string => uint256) public downloadPrice;

    mapping(string => address) public ownerComponent;

    mapping(address => uint256) public builderReward;

    mapping(address => uint256) public ownerNativeFeeAcc;

    mapping(uint256 => bool) public alreadyUpdateCycleData;

    mapping(string => uint256) public lastRunPrice;

    mapping(string => uint256) public lastDownloadPrice;

    /**
     * The total amount of accrued fees per cycle.
     */
    mapping(uint256 => uint256) public cycleAccruedFees;

    /**
     * Sum of previous total cycle accrued fees divided by cycle stake.
     */
    mapping(uint256 => uint256) public cycleFeesPerStakeSummed;


    /**
    * The fee amount the account can withdraw.
    */
    mapping(address => uint256) public accAccruedFees;

    /**
    * Total token rewards allocated per cycle.
    */
    mapping(uint256 => uint256) public rewardPerCycle;

    uint256  public accruedFees;
    //IBL TEAM FEE paid for each download or run = 5%;
    uint256 public IBL_TEAM_FEE = 500;
    //POOL FEE = 95%;
    uint256 public POOL_FEE = 9500;
     //Dev address;
    address public devAddress;

    /**
     * Helper variable to store pending stake amount.   
     */
    uint256 public pendingStake;

    /**
     * Used to minimise division remainder when earned fees are calculated.
     */
    uint256 public constant SCALING_FACTOR = 1e40;

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

    struct Component {
        string id;
        uint256 runPrice;
        uint256 downloadPrice;
        address[] owners;
        uint256[] procentages;
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
        calculateCycle();
        uint256 totalPrice = 0; 
        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += downloadPrice[componentsIds[i]];
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += downloadPrice[componentsIds[i]];
        }
        
        require(msg.value == totalPrice*2, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        cycleAccruedFees[currentCycle] += (totalPrice*POOL_FEE) / 10000;
        ibl.mintReward(msg.sender, 10000 * 10**18);
        rewardPerCycle[currentCycle] +=   rewardPerCycle[currentCycle] + 10000 * 10**18;
    }  

    function runApplication(string[] memory componentsIds) external payable nonReentrant {
        calculateCycle();
        uint256 totalPrice = 0; 
        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += runPrice[componentsIds[i]];
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += runPrice[componentsIds[i]];
        }
        
        require(msg.value == totalPrice*2, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        cycleAccruedFees[currentCycle] += (totalPrice*POOL_FEE) / 10000;
        ibl.mintReward(msg.sender, 10000 * 10**18);
        rewardPerCycle[currentCycle] +=   rewardPerCycle[currentCycle] + 10000 * 10**18;
    }

    function addComponent(Component[] memory components) external nonReentrant {

        for(uint256 i=0; i< components.length;i++) {
            userComponents[msg.sender][components[i].id] = Component(components[i].id, components[i].runPrice, components[i].downloadPrice , components[i].owners, components[i].procentages);
            componentData[components[i].id] = Component(components[i].id, components[i].runPrice, components[i].downloadPrice , components[i].owners, components[i].procentages);
            runPrice[components[i].id] = components[i].runPrice;
            downloadPrice[components[i].id] = components[i].downloadPrice;
            ownerComponent[components[i].id] = msg.sender;
        }
    }

    function setNewPrice(string memory id, uint256 newRunPrice, uint256 newDownloadPrice) external payable nonReentrant {
        Component memory ownerComponents = userComponents[msg.sender][id];
        if(lastRunPrice[id] != newRunPrice){
            if(lastRunPrice[id] < newRunPrice) {
                require(msg.value > newRunPrice - lastRunPrice[id],"IBL: you must send the fee in contract!");
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                runPrice[id] = newRunPrice;
                downloadPrice[id] = newDownloadPrice;
                lastRunPrice[id] = newRunPrice;
            } else {
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                runPrice[id] = newRunPrice;
                downloadPrice[id] = newDownloadPrice;
                lastRunPrice[id] = newRunPrice;
            }
        }

        if(lastDownloadPrice[id] != newDownloadPrice){
            if(lastDownloadPrice[id] < newDownloadPrice) {
                require(msg.value > newDownloadPrice - lastDownloadPrice[id],"IBL: you must send the fee in contract!");
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                runPrice[id] = newRunPrice;
                downloadPrice[id] = newDownloadPrice;
                lastDownloadPrice[id] = newDownloadPrice;
            } else {
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                runPrice[id] = newRunPrice;
                downloadPrice[id] = newDownloadPrice;
                lastDownloadPrice[id] = newDownloadPrice;
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
        uint256 fees = accAccruedFees[msg.sender];
        require(fees > 0, "DBXen: amount is zero");
        accAccruedFees[msg.sender] = 0;
        sendViaCall(payable(msg.sender), fees);
        emit FeesClaimed(getCurrentCycle(), msg.sender, fees);
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

    // function getUserComponent(address user, uint256 arrayLength) public view returns(Component[] memory){
    //     Component[] memory components = new Component[](arrayLength);
    //     for (uint i = 0; i < arrayLength; i++) {
    //       Component memory lBid = userComponents[user][i];
    //       components[i] = lBid;
    //   }
    //   return components;
    // }
    function getPrices(string memory id) public view returns(uint256, uint256) {
        return (componentData[id].runPrice, componentData[id].downloadPrice);
    }  

    function getOwnersForComponent(string memory id) public view returns(address[] memory) {
        return componentData[id].owners;
    }   

    function getProcentagesForComponent(string memory id) public view returns(uint256[] memory) {
        return componentData[id].procentages;
    }


    function setDevAddress(address _devAddress) public onlyOwner nonReentrant{
        devAddress = _devAddress;
    }
}