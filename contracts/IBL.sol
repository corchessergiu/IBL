// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBLERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract IBL is Ownable, ReentrancyGuard {
    using SafeERC20 for IBLERC20;
    
    IBLERC20 public ibl;

    mapping(string => Component) public componentData;

    mapping(address => uint256) public ownerNativeFeeAcc;
    
    mapping(uint256 => bool) public alreadyUpdateCycleData;

    mapping(string => uint256) public lastHighestDownloadPrice;

    mapping(string =>  uint256) public applicationFee;

    mapping(string => address) public applicationOwner;

    mapping(address => uint256) public applicationFeeReward;
    /**
     * Sum of previous total cycle accrued fees divided by cycle stake.
     */
    mapping(uint256 => uint256) public cycleFeesPerStakeSummed;

    mapping(string => uint256) public applicationTotalFeeAccrued;

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
     * Current unclaimed rewards and staked amounts per account.
     */
    mapping(address => uint256) public lastActiveCycleAccReward;

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
        uint256[] percentages;
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
        uint256 componentsLength = componentsIds.length;
        Component memory actualComponent;
        address[] memory owners;
        uint256[] memory percentages;
        uint256 ownersLength;
        for(uint256 i=0; i<componentsLength; i++) {
            actualComponent = componentData[componentsIds[i]];
            owners = actualComponent.owners;
            percentages = actualComponent.percentages;
            ownersLength = owners.length;
            for(uint256 j=0; j<ownersLength; j++){
                ownerNativeFeeAcc[owners[j]] += actualComponent.downloadPrice * percentages[j] / 1 ether;
            }
        }
        totalPrice = calculatedownlodFeeApplication(componentsIds);
        require(msg.value == totalPrice, "IBL: You must send exact value!");
        uint256 totalPriceForDistribution = totalPrice / 2;
        sendViaCall(payable(devAddress), (totalPriceForDistribution * IBL_TEAM_FEE) / 10000);
        cycleAccruedFees[currentCycle] += (totalPriceForDistribution * POOL_FEE) / 10000;
        uint256 tokenAmount = calculateProportion(msg.value);
        rewardPerCycle[currentCycle] += tokenAmount;
        lastActiveCycleAccReward[msg.sender] += tokenAmount;
        lastActiveCycle[msg.sender] = currentCycle;
        summedCycleStakes[currentCycle] += tokenAmount;
    }  

    function distributeFeesForRunningApplication(string[] memory componentsIds, string memory applicationId) external payable nonReentrant {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        setUpNewCycle();
        updateStats(msg.sender);
        uint256 totalPrice = 0; 
        uint256 componentsLength = componentsIds.length;
        Component memory actualComponent;
        address[] memory owners;
        uint256[] memory percentages;
        uint256 ownersLength;
        for(uint256 i=0; i<componentsLength; i++){
            actualComponent = componentData[componentsIds[i]];
            owners = actualComponent.owners;
            percentages = actualComponent.percentages;
            ownersLength = owners.length;
            for(uint256 j=0; j<ownersLength; j++){
                ownerNativeFeeAcc[owners[j]] += actualComponent.runPrice * percentages[j] / 1 ether;
            }
        }  
        uint256 applicationFee = applicationFee[applicationId];
        applicationFeeReward[applicationOwner[applicationId]] += applicationFee;
        applicationTotalFeeAccrued[applicationId] += applicationFee;
        totalPrice = calculateFeesFoRunningApplication(componentsIds, applicationId);
        require(msg.value == totalPrice, "IBL: You must send exact value!");
        uint256 totalPriceForDistribution = (totalPrice - applicationFee) / 2;
        sendViaCall(payable(devAddress), (totalPriceForDistribution * IBL_TEAM_FEE) / 10000);
        cycleAccruedFees[currentCycle] += (totalPriceForDistribution * POOL_FEE) / 10000;
        uint256 tokenAmount = calculateProportion(msg.value);
        rewardPerCycle[currentCycle] += tokenAmount;
        lastActiveCycleAccReward[msg.sender] += tokenAmount;
        lastActiveCycle[msg.sender] = currentCycle;
        summedCycleStakes[currentCycle] += tokenAmount;
    }

    function calculatedownlodFeeApplication(string[] memory componentsIds) public view returns(uint256) {
        uint256 totalPrice = 0; 
        uint256 componentsLength = componentsIds.length;
        Component memory actualComponent;
        for(uint256 i=0; i<componentsLength; i++) {
            actualComponent = componentData[componentsIds[i]];
            totalPrice += actualComponent.downloadPrice;
        }
        return totalPrice * 2;
    }

    function calculateFeesFoRunningApplication(string[] memory componentsIds, string memory applicationId) public view returns(uint256) {
        uint256 totalPrice = 0; 
        uint256 componentsLength = componentsIds.length;
        Component memory actualComponent;
        for(uint256 i=0; i<componentsLength; i++){
            actualComponent = componentData[componentsIds[i]];
            totalPrice += actualComponent.runPrice;
        }  
        uint256 applicationFee = applicationFee[applicationId];
        return totalPrice * 2 + applicationFee;
    }

    function calculateProportion(uint256 x) internal pure returns (uint256) {
        uint256 d = (x * 100) / 1;
        return d;
    }

    function addComponent(Component memory component) external payable nonReentrant {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        require(msg.value == component.downloadPrice, "IBL: You must pay publication fee!");
        componentData[component.id] = Component(component.id, component.runPrice, component.downloadPrice , component.owners, component.percentages);
        lastHighestDownloadPrice[component.id] = component.downloadPrice;
        sendViaCall(payable(devAddress), msg.value);
    }

    function addApplicationFee(string memory id, uint256 fee) external nonReentrant {
        applicationFee[id] = fee;
        applicationOwner[id] = msg.sender;
    }

    function setNewApplicationFee(string memory id, uint256 newFee) external nonReentrant {
        require(applicationOwner[id] == msg.sender, "IBL: You are not the owner of this application!");
        applicationFee[id] = newFee;
    }

    function setNewPrice(string memory id, uint256 newRunPrice, uint256 newDownloadPrice) external payable nonReentrant {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        Component memory component = componentData[id];
        address[] memory owners = component.owners;
        uint256 ownersLength = owners.length;
        bool ok;
        for(uint256 i=0; i<ownersLength; i++){
            if(owners[i] == msg.sender){
                ok = true;
                break;
            }
        }
        require(ok,"IBL: You cannot update the price because you are not the owner");
        
        if(lastHighestDownloadPrice[id] < newDownloadPrice) {
            require(msg.value >= newDownloadPrice - lastHighestDownloadPrice[id],"IBL: you must send the fee in contract!");
            lastHighestDownloadPrice[id] = newDownloadPrice;
            cycleAccruedFees[currentCycle] += msg.value;
        } 
        componentData[id] = Component(id, newRunPrice, newDownloadPrice, component.owners, component.percentages);
    }
    
    /**
     * @dev Mints newly accrued account rewards and transfers the entire 
     * allocated amount to the transaction sender address.
     */
    function claimRewards()
        external
        nonReentrant()
    {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        uint256 reward = accRewards[msg.sender] - accWithdrawableStake[msg.sender];
        require(reward > 0, "IBL: account has no rewards");

        accRewards[msg.sender] -= reward;
        if (lastStartedCycle == currentStartedCycle) {
            pendingStakeWithdrawal += reward;
        } else {
            summedCycleStakes[currentCycle] = summedCycleStakes[currentCycle] - reward;
        }

        ibl.mintReward(msg.sender, reward);
        //emit RewardsClaimed(currentCycle, _msgSender(), reward);
    }

    /**
     * @dev Transfers newly accrued fees to sender's address.
     */
    function claimFees()
        external
        nonReentrant()
    {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        uint256 fees = accAccruedFees[msg.sender];
        require(fees > 0, "IBL: amount is zero");
        accAccruedFees[msg.sender] = 0;
        sendViaCall(payable(msg.sender), fees);
    }

    function claimComponentOwnerFees() external nonReentrant()
       {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        uint256 fees = ownerNativeFeeAcc[msg.sender];
        require(fees > 0, "IBL: amount is zero");
        ownerNativeFeeAcc[msg.sender] = 0;
        sendViaCall(payable(msg.sender), fees);
    }

    function claimApplicationFee() external nonReentrant()
       {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        uint256 fees = applicationFeeReward[msg.sender];
        require(fees > 0, "IBL: amount is zero");
        applicationFeeReward[msg.sender] = 0;
        sendViaCall(payable(msg.sender), fees);
    }

    /**
     * @dev Stakes the given amount and increases the share of the daily allocated fees.
     * The tokens are transfered from sender account to this contract.
     * To receive the tokens back, the unstake function must be called by the same account address.
     * 
     * @param amount token amount to be staked (in wei).
     */
    function stake(uint256 amount)
        external
        nonReentrant()
    {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        require(amount > 0, "IBL: amount is zero");
        pendingStake += amount;
        uint256 cycleToSet = currentCycle + 1;
        if (lastStartedCycle == currentStartedCycle) {
            cycleToSet = lastStartedCycle + 1;
        }

        if (
            (cycleToSet != accFirstStake[msg.sender] &&
                cycleToSet != accSecondStake[msg.sender])
        ) {
            if (accFirstStake[msg.sender] == 0) {
                accFirstStake[msg.sender] = cycleToSet;
            } else if (accSecondStake[msg.sender] == 0) {
                accSecondStake[msg.sender] = cycleToSet;
            }
        }
        accStakeCycle[msg.sender][cycleToSet] += amount;
        ibl.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Unstakes the given amount and decreases the share of the daily allocated fees.
     * If the balance is availabe, the tokens are transfered from this contract to the sender account.
     * 
     * @param amount token amount to be unstaked (in wei).
     */
    function unstake(uint256 amount)
        external
        nonReentrant()
    {
        calculateCycle();
        updateCycleFeesPerStakeSummed();
        updateStats(msg.sender);
        require(amount > 0, "IBL: amount is zero");

        require(
            amount <= accWithdrawableStake[msg.sender],
            "IBL: amount greater than withdrawable stake"
        );

        if (lastStartedCycle == currentStartedCycle) {
            pendingStakeWithdrawal += amount;
        } else {
            summedCycleStakes[currentCycle] -= amount;
        }

        accWithdrawableStake[msg.sender] -= amount;
        accRewards[msg.sender] -= amount;

        ibl.safeTransfer(msg.sender, amount);
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
                feePerStake = ((cycleAccruedFees[lastStartedCycle]) * SCALING_FACTOR) / 
            summedCycleStakes[lastStartedCycle];
            } else {
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
     * @dev Updates various helper state variables used to compute token rewards 
     * and fees distribution for a given account.
     * 
     * @param account the address of the account to make the updates for.
     */
    function updateStats(address account) internal {
           if (	
            currentCycle > lastActiveCycle[account] &&	
            lastActiveCycleAccReward[account] != 0	
        ) {	
            accRewards[account] += lastActiveCycleAccReward[account];	
            lastActiveCycleAccReward[account] = 0;
        }


        if (
            currentCycle > lastStartedCycle &&
            lastFeeUpdateCycle[account] != lastStartedCycle + 1
        ) {
            accAccruedFees[account] =
                accAccruedFees[account] +
                (
                    (accRewards[account] * 
                        (cycleFeesPerStakeSummed[lastStartedCycle + 1] - 
                            cycleFeesPerStakeSummed[lastFeeUpdateCycle[account]]
                        )
                    )
                ) /
                SCALING_FACTOR;
            lastFeeUpdateCycle[account] = lastStartedCycle + 1;
            
        }

        if (
            accFirstStake[account] != 0 &&
            currentCycle > accFirstStake[account]
        ) {
            uint256 unlockedFirstStake = accStakeCycle[account][accFirstStake[account]];

            accRewards[account] += unlockedFirstStake;
            accWithdrawableStake[account] += unlockedFirstStake;
            if (lastStartedCycle + 1 > accFirstStake[account]) {
                accAccruedFees[account] = accAccruedFees[account] + 
                (
                    (accStakeCycle[account][accFirstStake[account]] * 
                        (cycleFeesPerStakeSummed[lastStartedCycle + 1] - 
                            cycleFeesPerStakeSummed[accFirstStake[account]]
                        )
                    )
                ) / 
                SCALING_FACTOR;
            }

            accStakeCycle[account][accFirstStake[account]] = 0;
            accFirstStake[account] = 0;

            if (accSecondStake[account] != 0) {
                if (currentCycle > accSecondStake[account]) {
                    uint256 unlockedSecondStake = accStakeCycle[account][accSecondStake[account]];
                    accRewards[account] += unlockedSecondStake;
                    accWithdrawableStake[account] += unlockedSecondStake;
                    
                    if (lastStartedCycle + 1 > accSecondStake[account]) {
                        accAccruedFees[account] = accAccruedFees[account] + 
                        (
                            (accStakeCycle[account][accSecondStake[account]] * 
                                (cycleFeesPerStakeSummed[lastStartedCycle + 1] - 
                                    cycleFeesPerStakeSummed[accSecondStake[account]]
                                )
                            )
                        ) / 
                        SCALING_FACTOR;
                    }

                    accStakeCycle[account][accSecondStake[account]] = 0;
                    accSecondStake[account] = 0;
                } else {
                    accFirstStake[account] = accSecondStake[account];
                    accSecondStake[account] = 0;
                }
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

    function getFees(string memory id) public view returns(uint256, uint256) {
        return (componentData[id].runPrice, componentData[id].downloadPrice);
    }  

    function getOwnersForComponent(string memory id) public view returns(address[] memory) {
        return componentData[id].owners;
    }   

    function getPercentagesForComponent(string memory id) public view returns(uint256[] memory) {
        return componentData[id].percentages;
    }


    function setDevAddress(address _devAddress) public onlyOwner nonReentrant{
        devAddress = _devAddress;
    }
}