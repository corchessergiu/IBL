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

    mapping(string => address) public ownerComponent;

    mapping(address => uint256) public builderReward;

    mapping(address => uint256) public ownerNativeFeeAcc;
    
    mapping(uint256 => bool) public alreadyUpdateCycleData;

    mapping(string => uint256) public lastHighestRunPrice;

    mapping(string => uint256) public lastHighestDownloadPrice;

    /**
     * Sum of previous total cycle accrued fees divided by cycle stake.
     */
    mapping(uint256 => uint256) public cycleFeesPerStakeSummed;


    /**
    * The fee amount the account can withdraw.
    */
    mapping(address => uint256) public accAccruedFees;

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

    /**
     * Reward token amount allocated for the current cycle.
     */
    uint256 public currentCycleReward;

    /**
     * Reward token amount allocated for the previous cycle.
     */
    uint256 public lastCycleReward;

    /**
     * Helper variable to store the index of the last active cycle.
     */
    uint256 public lastStartedCycle;

    /**
     * Stores the index of the penultimate active cycle plus one.
     */
    uint256 public previousStartedCycle;

    /**
     * Helper variable to store the index of the last active cycle.
     */
    uint256 public currentStartedCycle;

    /**
     * Stores the amount of stake that will be subracted from the total
     * stake once a new cycle starts.
     */
    uint256 public pendingStakeWithdrawal;

    /**
     * Accumulates fees while there are no tokens staked after the
     * entire token supply has been distributed. Once tokens are
     * staked again, these fees will be distributed in the next
     * active cycle.
     */
    uint256 public pendingFees;

      /**
     * Total amount of batches burned
     */
    uint256 public totalNumberOfBatchesBurned;

    /**
     * The amount of batches an account has burned.
     * Resets during a new cycle when an account performs an action
     * that updates its stats.
     */
    mapping(address => uint256) public accCycleBatchesBurned;

    /**
     * The total amount of batches all accounts have burned per cycle.
     */
    mapping(uint256 => uint256) public cycleTotalBatchesBurned;

    /**
     * The last cycle in which an account has burned.
     */
    mapping(address => uint256) public lastActiveCycle;

    /**
     * Current unclaimed rewards and staked amounts per account.
     */
    mapping(address => uint256) public accRewards;

    /**
     * Total token rewards allocated per cycle.
     */
    mapping(uint256 => uint256) public rewardPerCycle;

    /**
     * Total unclaimed token reward and stake. 
     * 
     * Updated when a new cycle starts and when an account claims rewards, stakes or unstakes externally owned tokens.
     */
    mapping(uint256 => uint256) public summedCycleStakes;

    /**
     * The last cycle in which the account had its fees updated.
     */ 
    mapping(address => uint256) public lastFeeUpdateCycle;

    /**
     * The total amount of accrued fees per cycle.
     */
    mapping(uint256 => uint256) public cycleAccruedFees;

    /**
     * Amount an account has staked and is locked during given cycle.
     */
    mapping(address => mapping(uint256 => uint256)) public accStakeCycle;

    /**
     * Stake amount an account can currently withdraw.
     */
    mapping(address => uint256) public accWithdrawableStake;

    /**
     * Cycle in which an account's stake is locked and begins generating fees.
     */
    mapping(address => uint256) public accFirstStake;

    /**
     * Same as accFirstStake, but stores the second stake seperately 
     * in case the account stakes in two consecutive active cycles.
     */
    mapping(address => uint256) public accSecondStake;

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
            totalPrice += componentData[componentsIds[i]].downloadPrice;
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += componentData[componentsIds[i]].downloadPrice;
        }
        
        require(msg.value == totalPrice*2 ether, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice*IBL_TEAM_FEE) / 10000);
        cycleAccruedFees[currentCycle] += (totalPrice * POOL_FEE) / 10000;
        currentCycleReward += 10000 ether;
        ibl.mintReward(msg.sender, 10000 ether);
        rewardPerCycle[currentCycle] += 1000 ether;
    }  

    function runApplication(string[] memory componentsIds) external payable nonReentrant {
        calculateCycle();
        uint256 totalPrice = 0; 
        for(uint256 i=0; i<componentsIds.length;i++){
            totalPrice += componentData[componentsIds[i]].runPrice;
            ownerNativeFeeAcc[ownerComponent[componentsIds[i]]] += componentData[componentsIds[i]].runPrice;
        }
        
        require(msg.value == totalPrice*2 ether, "IBL: You must send exact value!");
        sendViaCall(payable(devAddress), (totalPrice * IBL_TEAM_FEE) / 10000);
        cycleAccruedFees[currentCycle] += (totalPrice * POOL_FEE) / 10000;
        currentCycleReward += 10000 ether;
        ibl.mintReward(msg.sender, 10000 ether);
        rewardPerCycle[currentCycle] += 10000 ether;
    }

    function addComponent(Component memory component) external payable nonReentrant {
        require(msg.value == component.downloadPrice, "IBL: You must pay publication fee!");
        userComponents[msg.sender][component.id] = Component(component.id, component.runPrice, component.downloadPrice , component.owners, component.procentages);
        componentData[component.id] = Component(component.id, component.runPrice, component.downloadPrice , component.owners, component.procentages);
        ownerComponent[component.id] = msg.sender;
        lastHighestRunPrice[component.id] = component.runPrice;
        lastHighestDownloadPrice[component.id] = component.downloadPrice;
    }

    function setNewPrice(string memory id, uint256 newRunPrice, uint256 newDownloadPrice) external payable nonReentrant {
        require(ownerComponent[id] == msg.sender, "IBL: You are not the owner of this component!");
        Component memory ownerComponents = userComponents[msg.sender][id];
        if(lastHighestRunPrice[id] != newRunPrice){
            if(lastHighestRunPrice[id] < newRunPrice) {
                require(msg.value >= newRunPrice - lastHighestRunPrice[id],"IBL: you must send the fee in contract!");
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                componentData[id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                lastHighestRunPrice[id] = newRunPrice;
            } else {
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                componentData[id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
            }
        }

        if(lastHighestDownloadPrice[id] != newDownloadPrice){
            if(lastHighestDownloadPrice[id] < newDownloadPrice) {
                require(msg.value >= newDownloadPrice - lastHighestDownloadPrice[id],"IBL: you must send the fee in contract!");
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                componentData[id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                lastHighestDownloadPrice[id] = newDownloadPrice;
            } else {
                userComponents[msg.sender][id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
                componentData[id] = Component(id, newRunPrice, newDownloadPrice, ownerComponents.owners, ownerComponents.procentages);
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


    /**
     * @dev Updates the global helper variables related to fee distribution.
     */
    function updateCycleFeesPerStakeSummed() internal {
        if (currentCycle != currentStartedCycle) {
            previousStartedCycle = lastStartedCycle + 1;
            lastStartedCycle = currentStartedCycle;
        }
       
        if (
            currentCycle > lastStartedCycle &&
            cycleFeesPerStakeSummed[lastStartedCycle + 1] == 0
        ) {
            uint256 feePerStake;
            if(summedCycleStakes[lastStartedCycle] != 0) {
                feePerStake = ((cycleAccruedFees[lastStartedCycle] + pendingFees) * SCALING_FACTOR) / 
            summedCycleStakes[lastStartedCycle];
                pendingFees = 0;
            } else {
                pendingFees += cycleAccruedFees[lastStartedCycle];
                feePerStake = 0;
            }
            
            cycleFeesPerStakeSummed[lastStartedCycle + 1] = cycleFeesPerStakeSummed[previousStartedCycle] + feePerStake;
        }
    }

    /**
    * @dev Updates the global state related to starting a new cycle along 
    * with helper state variables used in computation of staking rewards.
    */
    function setUpNewCycle() internal {
        if (alreadyUpdateCycleData[currentCycle] == false) {
            alreadyUpdateCycleData[currentCycle] = true;
            lastCycleReward = currentCycleReward;
            uint256 calculatedCycleReward = (lastCycleReward * 10000) / 10020;
            currentCycleReward = calculatedCycleReward;
            rewardPerCycle[currentCycle] = calculatedCycleReward;

            currentStartedCycle = currentCycle;
            
            summedCycleStakes[currentStartedCycle] += summedCycleStakes[lastStartedCycle] + currentCycleReward;
            
            if (pendingStake != 0) {
                summedCycleStakes[currentStartedCycle] += pendingStake;
                pendingStake = 0;
            }
            
            if (pendingStakeWithdrawal != 0) {
                summedCycleStakes[currentStartedCycle] -= pendingStakeWithdrawal;
                pendingStakeWithdrawal = 0;
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

    // function getUserComponent(address user, uint256 arrayLength) public view returns(Component[] memory){
    //     Component[] memory components = new Component[](arrayLength);
    //     for (uint i = 0; i < arrayLength; i++) {
    //       Component memory lBid = userComponents[user][i];
    //       components[i] = lBid;
    //   }
    //   return components;
    // }

    function getFees(string memory id) public view returns(uint256, uint256) {
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