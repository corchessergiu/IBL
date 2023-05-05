// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBLERC20.sol";
import "hardhat/console.sol";

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

    /**
     * Current unclaimed rewards and staked amounts per account.
     */
    mapping(address => uint256) public accRewards;

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
     * Sum of previous total cycle accrued fees divided by cycle stake.
     */
    mapping(uint256 => uint256) public cycleFeesPerStakeSummed;

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
     * Accumulates fees while there are no tokens staked after the
     * entire token supply has been distributed. Once tokens are
     * staked again, these fees will be distributed in the next
     * active cycle.
     */
    uint256 public pendingFees;

     /**
     * Stores the amount of stake that will be subracted from the total
     * stake once a new cycle starts.
     */
    uint256 public pendingStakeWithdrawal;

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
        updateCycleFeesPerStakeSummed();
        setUpNewCycle();
        updateStats(msg.sender);
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
        updateCycleFeesPerStakeSummed();
        setUpNewCycle();
        updateStats(msg.sender);
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
     * @dev Updates the global state related to starting a new cycle along 
     * with helper state variables used in computation of staking rewards.
     */
    function setUpNewCycle() internal {
        if (alreadyUpdateCycleData[currentCycle] == false) {
            alreadyUpdateCycleData[currentCycle] = true;

            currentStartedCycle = currentCycle;
            
            summedCycleStakes[currentStartedCycle] += summedCycleStakes[lastStartedCycle];
            
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
     * @dev Updates various helper state variables used to compute token rewards 
     * and fees distribution for a given account.
     * 
     * @param account the address of the account to make the updates for.
     */
    function updateStats(address account) internal {
        //  if (	
        //     currentCycle > lastActiveCycle[account] &&	
        //     accCycleBatchesBurned[account] != 0	
        // ) {	
        //     uint256 lastCycleAccReward = (accCycleBatchesBurned[account] * rewardPerCycle[lastActiveCycle[account]]) / 	
        //         cycleTotalBatchesBurned[lastActiveCycle[account]];	
        //     accRewards[account] += lastCycleAccReward;	
        //     accCycleBatchesBurned[account] = 0;
        // }

        // if (
        //     currentCycle > lastStartedCycle &&
        //     lastFeeUpdateCycle[account] != lastStartedCycle + 1
        // ) {
        //     accAccruedFees[account] =
        //         accAccruedFees[account] +
        //         (
        //             (accRewards[account] * 
        //                 (cycleFeesPerStakeSummed[lastStartedCycle + 1] - 
        //                     cycleFeesPerStakeSummed[lastFeeUpdateCycle[account]]
        //                 )
        //             )
        //         ) /
        //         SCALING_FACTOR;
        //     lastFeeUpdateCycle[account] = lastStartedCycle + 1;
        // }

        // if (
        //     accFirstStake[account] != 0 &&
        //     currentCycle > accFirstStake[account]
        // ) {
        //     uint256 unlockedFirstStake = accStakeCycle[account][accFirstStake[account]];

        //     accRewards[account] += unlockedFirstStake;
        //     accWithdrawableStake[account] += unlockedFirstStake;
        //     if (lastStartedCycle + 1 > accFirstStake[account]) {
        //         accAccruedFees[account] = accAccruedFees[account] + 
        //         (
        //             (accStakeCycle[account][accFirstStake[account]] * 
        //                 (cycleFeesPerStakeSummed[lastStartedCycle + 1] - 
        //                     cycleFeesPerStakeSummed[accFirstStake[account]]
        //                 )
        //             )
        //         ) / 
        //         SCALING_FACTOR;
        //     }

        //     accStakeCycle[account][accFirstStake[account]] = 0;
        //     accFirstStake[account] = 0;

        //     if (accSecondStake[account] != 0) {
        //         if (currentCycle > accSecondStake[account]) {
        //             uint256 unlockedSecondStake = accStakeCycle[account][accSecondStake[account]];
        //             accRewards[account] += unlockedSecondStake;
        //             accWithdrawableStake[account] += unlockedSecondStake;
                    
        //             if (lastStartedCycle + 1 > accSecondStake[account]) {
        //                 accAccruedFees[account] = accAccruedFees[account] + 
        //                 (
        //                     (accStakeCycle[account][accSecondStake[account]] * 
        //                         (cycleFeesPerStakeSummed[lastStartedCycle + 1] - 
        //                             cycleFeesPerStakeSummed[accSecondStake[account]]
        //                         )
        //                     )
        //                 ) / 
        //                 SCALING_FACTOR;
        //             }

        //             accStakeCycle[account][accSecondStake[account]] = 0;
        //             accSecondStake[account] = 0;
        //         } else {
        //             accFirstStake[account] = accSecondStake[account];
        //             accSecondStake[account] = 0;
        //         }
        //     }
        // }
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

    function getUserComponentNumber(address user) public view returns(uint256){
        return userComponents[user].length;
    }

    function getUserComponent(address user, uint256 arrayLength) public view returns(Component[] memory){
        Component[] memory components = new Component[](arrayLength);
        for (uint i = 0; i < arrayLength; i++) {
          Component memory lBid = userComponents[user][i];
          components[i] = lBid;
      }
      return components;
    }

    function setDevAddress(address _devAddress) public onlyOwner nonReentrant{
        devAddress = _devAddress;
    }
}