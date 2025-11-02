// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title Nogglrv3BETA
 * @dev Non-upgradeable NFT contract with on-chain SVG storage + Full Marketplace Features
 * @author Nogglr Team
 */
contract Nogglrv3BETA is ERC721, Ownable, ReentrancyGuard {
    
    // Contract version
    string public constant VERSION = "3.1.0-BETA";
    
    // Token counter
    uint256 private _tokenIdCounter;
    
    // Pricing
    uint256 public baseMintPrice = 1 ether; // 1 CELO minimum
    uint256 public rarityPriceIncrement = 0.1 ether; // 0.1 CELO per rare trait
    uint256 public likePrice = 0.1 ether;
    
    // Fee configuration
    uint256 public constant MAX_BPS = 10000;
    uint256 public saleFeeBps = 500; // 5%
    uint256 public bidCancelFeeBps = 100; // 1%
    uint256 public constant MIN_BID_NON_LISTED = 1 ether; // 1 CELO minimum bid for unlisted NFTs
    address public feeRecipient;
    
    // On-chain NFT data structure
    struct OnChainNFTData {
        string svgData;           // Raw SVG (will be base64 encoded in tokenURI)
        string name;              // NFT name
        string description;       // NFT description
        string[] traitTypes;      // Trait categories
        string[] traitValues;     // Trait values
        uint256[] rarityScores;   // Rarity scores (0-100)
        uint256 overallRarity;    // Overall rarity score
        uint256 createdAt;        // Creation timestamp
    }
    
    // NFT data structure for marketplace
    struct NFTData {
        uint256 likes;
        uint256 totalEarnings;
        address creator;
        uint256 createdAt;
        bool isListed;
        uint256 listPrice;
        uint256 currentBid;
        address currentBidder;
        uint256 bidEndTime;
        uint256 mintPrice;
    }
    
    // User statistics
    struct UserStats {
        uint256 totalMinted;
        uint256 totalLikes;
        uint256 totalEarnings;
        uint256 totalSales;
        uint256 totalPurchases;
        uint256 salesVolume;
        uint256 purchaseVolume;
        uint256 highestSale;
        uint256 level;
        uint256 experience;
        uint256 points;
    }
    
    // Bid structure
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool accepted;
        bool cancelled;
    }
    
    // Global statistics
    struct GlobalStats {
        uint256 totalNFTs;
        uint256 totalUsers;
        uint256 totalTransactions;
        uint256 totalVolume;
        uint256 totalLikes;
    }
    
    // Transaction structure
    struct Transaction {
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string txType;
    }
    
    // Mappings
    mapping(uint256 => OnChainNFTData) public onChainNFTData;
    mapping(uint256 => NFTData) public nftData;
    mapping(uint256 => Bid[]) public bids;
    mapping(uint256 => mapping(address => bool)) public hasLiked;
    mapping(address => UserStats) public userStats;
    mapping(address => uint256) public claimableEarnings;
    mapping(address => bool) public flaggedUsers;
    mapping(uint256 => bool) public flaggedNFTs;
    mapping(address => string) public userFlagReasons;
    mapping(uint256 => string) public nftFlagReasons;
    mapping(address => Transaction[]) public userTransactions;
    mapping(address => bool) private registeredUsers;
    
    // Global stats
    GlobalStats public globalStats;
    
    // Constants
    uint256 public constant MAX_TRANSACTION_HISTORY = 100;
    uint256 public constant POINTS_MINT = 100;
    uint256 public constant POINTS_LIST = 10;
    uint256 public constant POINTS_SALE = 75;
    uint256 public constant POINTS_PURCHASE = 50;
    uint256 public constant POINTS_LIKE_RECEIVED = 5;
    uint256 public constant POINTS_LIKE_GIVEN = 10;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string name, uint256 price);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTUnlisted(uint256 indexed tokenId);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event BidAccepted(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 amount);
    event BidRejected(uint256 indexed tokenId, address indexed seller, address indexed bidder, uint256 amount);
    event BidCanceled(uint256 indexed tokenId, address indexed bidder, uint256 amount, uint256 fee);
    event NFTLiked(uint256 indexed tokenId, address indexed liker, uint256 newLikeCount);
    event EarningsClaimed(address indexed user, uint256 amount);
    event UserFlagged(address indexed user, string reason);
    event UserUnflagged(address indexed user);
    event NFTFlagged(uint256 indexed tokenId, string reason);
    event NFTUnflagged(uint256 indexed tokenId);
    event PointsAwarded(address indexed user, uint256 points, string reason);
    event TransactionRecorded(address indexed user, uint256 indexed tokenId, string txType, uint256 amount);
    
    // Modifiers
    modifier onlyNFTOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= _tokenIdCounter, "Token does not exist");
        _;
    }
    
    modifier notFlagged() {
        require(!flaggedUsers[msg.sender], "User is flagged");
        _;
    }
    
    constructor(address _feeRecipient) ERC721("NogglrNFT", "NOGGLR") Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Mint NFT with on-chain SVG storage
     * @param svgData Raw SVG string (NOT base64 encoded - will be encoded in tokenURI)
     */
    function mintNFTOnChain(
        string memory svgData,
        string memory name,
        string memory description,
        string[] memory traitTypes,
        string[] memory traitValues,
        uint256[] memory rarityScores,
        uint256 calculatedPrice
    ) external payable nonReentrant notFlagged {
        require(bytes(svgData).length > 0, "SVG data cannot be empty");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(calculatedPrice >= baseMintPrice, "Price below minimum");
        require(msg.value >= calculatedPrice, "Insufficient payment");
        require(traitTypes.length == traitValues.length && traitTypes.length == rarityScores.length, "Trait arrays length mismatch");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        // Calculate overall rarity
        uint256 totalRarity = 0;
        for (uint256 i = 0; i < rarityScores.length; i++) {
            require(rarityScores[i] <= 100, "Rarity score cannot exceed 100");
            totalRarity += rarityScores[i];
        }
        uint256 overallRarity = rarityScores.length > 0 ? totalRarity / rarityScores.length : 0;
        
        // Store on-chain data (raw SVG)
        onChainNFTData[tokenId] = OnChainNFTData({
            svgData: svgData,
            name: name,
            description: description,
            traitTypes: traitTypes,
            traitValues: traitValues,
            rarityScores: rarityScores,
            overallRarity: overallRarity,
            createdAt: block.timestamp
        });
        
        // Store marketplace data
        nftData[tokenId] = NFTData({
            likes: 0,
            totalEarnings: 0,
            creator: msg.sender,
            createdAt: block.timestamp,
            isListed: false,
            listPrice: 0,
            currentBid: 0,
            currentBidder: address(0),
            bidEndTime: 0,
            mintPrice: msg.value
        });
        
        // Mint NFT
        _safeMint(msg.sender, tokenId);
        
        // Update user stats
        userStats[msg.sender].totalMinted++;
        _updateUserExperience(msg.sender, 100);
        _awardPoints(msg.sender, POINTS_MINT, "mint");
        
        // Update global stats
        globalStats.totalNFTs++;
        globalStats.totalTransactions++;
        _updateUserCount(msg.sender);
        
        // Record transaction
        _recordTransaction(msg.sender, tokenId, "mint", calculatedPrice);
        
        // Refund excess payment
        if (msg.value > calculatedPrice) {
            payable(msg.sender).transfer(msg.value - calculatedPrice);
        }
        
        emit NFTMinted(tokenId, msg.sender, name, calculatedPrice);
    }
    
    /**
     * @dev Generate tokenURI with on-chain data
     * FIXED: Properly encodes raw SVG to base64
     */
    function tokenURI(uint256 tokenId) public view override validTokenId(tokenId) returns (string memory) {
        OnChainNFTData memory data = onChainNFTData[tokenId];
        
        // Encode the raw SVG to base64
        string memory base64SVG = Base64.encode(bytes(data.svgData));
        
        // Create metadata JSON with base64-encoded SVG
        string memory metadata = generateMetadataJSON(tokenId, data, base64SVG);
        
        // Encode as base64 data URI
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(metadata))
        ));
    }
    
    /**
     * @dev Generate metadata JSON from on-chain data
     */
    function generateMetadataJSON(
        uint256 tokenId, 
        OnChainNFTData memory data,
        string memory base64SVG
    ) internal pure returns (string memory) {
        // Build attributes array
        string memory attributes = "[";
        for (uint256 i = 0; i < data.traitTypes.length; i++) {
            attributes = string(abi.encodePacked(
                attributes,
                i > 0 ? "," : "",
                '{"trait_type":"', data.traitTypes[i], 
                '","value":"', data.traitValues[i], 
                '","rarity_score":', _uint2str(data.rarityScores[i]), '}'
            ));
        }
        attributes = string(abi.encodePacked(attributes, "]"));
        
        // Build metadata JSON with base64-encoded SVG
        return string(abi.encodePacked(
            '{"name":"', data.name, '",',
            '"description":"', data.description, '",',
            '"image":"data:image/svg+xml;base64,', base64SVG, '",',
            '"attributes":', attributes, ',',
            '"overall_rarity":', _uint2str(data.overallRarity), ',',
            '"created_at":', _uint2str(data.createdAt), ',',
            '"token_id":', _uint2str(tokenId), '}'
        ));
    }
    
    /**
     * @dev Get SVG data for a token (returns raw SVG)
     */
    function getSVGData(uint256 tokenId) external view validTokenId(tokenId) returns (string memory) {
        return onChainNFTData[tokenId].svgData;
    }
    
    /**
     * @dev Get NFT metadata
     */
    function getNFTMetadata(uint256 tokenId) external view validTokenId(tokenId) returns (OnChainNFTData memory) {
        return onChainNFTData[tokenId];
    }
    
    /**
     * @dev Like an NFT
     */
    function likeNFT(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) notFlagged {
        require(!hasLiked[tokenId][msg.sender], "Already liked");
        require(msg.value >= likePrice, "Insufficient payment for like");
        require(!flaggedNFTs[tokenId], "NFT is flagged");
        require(ownerOf(tokenId) != msg.sender, "Cannot like own NFT");
        
        // Mark as liked
        hasLiked[tokenId][msg.sender] = true;
        nftData[tokenId].likes++;
        
        // Calculate fees
        uint256 appFee = (likePrice * 50) / 100; // 50% to app
        uint256 ownerFee = likePrice - appFee;   // 50% to NFT owner
        
        // Pay fees
        if (appFee > 0) {
            payable(feeRecipient).transfer(appFee);
        }
        
        // Pay NFT owner
        address nftOwner = ownerOf(tokenId);
        if (ownerFee > 0) {
            claimableEarnings[nftOwner] += ownerFee;
            nftData[tokenId].totalEarnings += ownerFee;
            userStats[nftOwner].totalEarnings += ownerFee;
        }
        
        // Update user stats
        userStats[msg.sender].totalLikes++;
        _updateUserExperience(msg.sender, 5);
        _awardPoints(msg.sender, POINTS_LIKE_GIVEN, "like");
        _awardPoints(nftOwner, POINTS_LIKE_RECEIVED, "like_received");
        
        // Update global stats
        globalStats.totalTransactions++;
        globalStats.totalLikes++;
        
        // Record transaction
        _recordTransaction(msg.sender, tokenId, "like", likePrice);
        
        emit NFTLiked(tokenId, msg.sender, nftData[tokenId].likes);
    }
    
    /**
     * @dev List NFT for sale
     */
    function listNFT(uint256 tokenId, uint256 price) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(price > 0, "Price must be greater than 0");
        require(!nftData[tokenId].isListed, "Already listed");
        require(!flaggedNFTs[tokenId], "NFT is flagged");
        
        nftData[tokenId].isListed = true;
        nftData[tokenId].listPrice = price;
        
        _awardPoints(msg.sender, POINTS_LIST, "list");
        _recordTransaction(msg.sender, tokenId, "list", price);
        
        emit NFTListed(tokenId, price);
    }
    
    /**
     * @dev Unlist NFT
     */
    function unlistNFT(uint256 tokenId) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(nftData[tokenId].isListed, "Not listed");
        
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        
        _recordTransaction(msg.sender, tokenId, "unlist", 0);
        
        emit NFTUnlisted(tokenId);
    }
    
    /**
     * @dev Buy NFT directly
     */
    function buyNow(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(nftData[tokenId].isListed && nftData[tokenId].listPrice > 0, "Not for sale");
        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Owner cannot buy");
        uint256 price = nftData[tokenId].listPrice;
        require(msg.value >= price, "Insufficient payment");
        
        // Calculate fees
        uint256 fee = (price * saleFeeBps) / MAX_BPS;
        uint256 sellerAmount = price - fee;
        
        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);
        
        // Pay fees
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        
        // Add seller amount to claimable balance
        claimableEarnings[seller] += sellerAmount;
        
        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        
        // Reset listing data
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;
        
        // Update stats
        userStats[seller].totalEarnings += sellerAmount;
        userStats[seller].totalSales++;
        userStats[seller].salesVolume += sellerAmount;
        userStats[msg.sender].totalPurchases++;
        userStats[msg.sender].purchaseVolume += price;
        
        if (sellerAmount > userStats[seller].highestSale) {
            userStats[seller].highestSale = sellerAmount;
        }
        
        // Award points
        _awardPoints(seller, POINTS_SALE, "sale");
        _awardPoints(msg.sender, POINTS_PURCHASE, "purchase");
        
        // Update global stats
        globalStats.totalTransactions++;
        globalStats.totalVolume += price;
        
        // Record transactions
        _recordTransaction(seller, tokenId, "sale", sellerAmount);
        _recordTransaction(msg.sender, tokenId, "purchase", price);
        
        emit NFTSold(tokenId, seller, msg.sender, price);
    }
    
    // ==================== BIDDING FUNCTIONS ====================
    
    /**
     * @dev Place a bid on an NFT
     */
    function placeBid(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(ownerOf(tokenId) != msg.sender, "Cannot bid on your own NFT");
        require(!flaggedNFTs[tokenId], "NFT is flagged");
        require(!flaggedUsers[msg.sender], "User is flagged");
        
        // For unlisted NFTs, require minimum bid
        if (!nftData[tokenId].isListed || nftData[tokenId].listPrice == 0) {
            require(msg.value >= MIN_BID_NON_LISTED, "Min bid is 1 CELO");
        }
        
        // Calculate minimum bid increment (5% of current highest bid)
        uint256 minIncrement = nftData[tokenId].currentBid / 20; // 5%
        if (minIncrement < 0.01 ether) minIncrement = 0.01 ether; // Minimum 0.01 CELO
        
        require(msg.value >= nftData[tokenId].currentBid + minIncrement, 
                "Bid must be at least 5% higher than current highest bid");
        
        // Update highest bid tracker (for quick reference)
        if (msg.value > nftData[tokenId].currentBid) {
            nftData[tokenId].currentBid = msg.value;
            nftData[tokenId].currentBidder = msg.sender;
        }
        
        // Set bid end time only once when first bid is placed
        if (nftData[tokenId].bidEndTime == 0) {
            nftData[tokenId].bidEndTime = block.timestamp + 7 days;
        }
        
        // Store bid in history
        bids[tokenId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            accepted: false,
            cancelled: false
        }));
        
        // Award points for bidding
        _awardPoints(msg.sender, 10, "bid");
        
        // Update global stats
        globalStats.totalTransactions++;
        
        // Record transaction
        _recordTransaction(msg.sender, tokenId, "bid", msg.value);
        
        emit BidPlaced(tokenId, msg.sender, msg.value);
    }
    
    /**
     * @dev Accept a bid on an NFT
     */
    function acceptBid(uint256 tokenId, uint256 bidIndex) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(bidIndex < bids[tokenId].length, "Invalid bid index");
        Bid storage bid = bids[tokenId][bidIndex];
        require(!bid.accepted && !bid.cancelled, "Bid already processed");
        require(bid.bidder != address(0), "Invalid bidder");
        
        // Mark bid as accepted
        bid.accepted = true;
        
        // Calculate fees
        uint256 fee = (bid.amount * saleFeeBps) / MAX_BPS;
        uint256 sellerAmount = bid.amount - fee;
        
        // Transfer NFT to bidder
        _transfer(msg.sender, bid.bidder, tokenId);
        
        // Add seller amount to claimable balance
        claimableEarnings[msg.sender] += sellerAmount;
        
        // Pay fees
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        
        // Update earnings and stats
        nftData[tokenId].totalEarnings += sellerAmount;
        userStats[msg.sender].totalEarnings += sellerAmount;
        userStats[msg.sender].totalSales++;
        userStats[msg.sender].salesVolume += sellerAmount;
        userStats[bid.bidder].totalPurchases++;
        userStats[bid.bidder].purchaseVolume += bid.amount;
        
        // Update highest sale
        if (sellerAmount > userStats[msg.sender].highestSale) {
            userStats[msg.sender].highestSale = sellerAmount;
        }
        
        // Award points
        _awardPoints(bid.bidder, 50, "purchase");
        _awardPoints(msg.sender, 25, "sale");
        
        // Update global stats
        globalStats.totalVolume += bid.amount;
        globalStats.totalTransactions++;
        
        // Refund all other active bidders
        for (uint256 i = 0; i < bids[tokenId].length; i++) {
            if (i != bidIndex && !bids[tokenId][i].accepted && !bids[tokenId][i].cancelled) {
                bids[tokenId][i].cancelled = true;
                payable(bids[tokenId][i].bidder).transfer(bids[tokenId][i].amount);
            }
        }
        
        // Reset bid data
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        
        // Record transactions
        _recordTransaction(msg.sender, tokenId, "sale", sellerAmount);
        _recordTransaction(bid.bidder, tokenId, "purchase", bid.amount);
        
        emit BidAccepted(tokenId, msg.sender, bid.bidder, bid.amount);
    }
    
    /**
     * @dev Allow bidders to withdraw their bids
     */
    function withdrawBid(uint256 tokenId, uint256 bidIndex) external nonReentrant validTokenId(tokenId) {
        require(bidIndex < bids[tokenId].length, "Invalid bid index");
        Bid storage bid = bids[tokenId][bidIndex];
        require(bid.bidder == msg.sender, "Not your bid");
        require(!bid.accepted, "Bid already accepted");
        require(!bid.cancelled, "Bid already withdrawn");
        
        // Mark bid as cancelled
        bid.cancelled = true;
        
        // Refund bidder
        payable(msg.sender).transfer(bid.amount);
        
        // Record transaction
        _recordTransaction(msg.sender, tokenId, "bid_withdraw", bid.amount);
        
        emit BidCanceled(tokenId, msg.sender, bid.amount, 0); // No fee for voluntary withdrawal
    }
    
    /**
     * @dev Reject all bids by owner (refund all bidders)
     */
    function rejectBid(uint256 tokenId) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(bids[tokenId].length > 0, "No bids to reject");
        
        // Refund all active bidders
        for (uint256 i = 0; i < bids[tokenId].length; i++) {
            if (!bids[tokenId][i].accepted && !bids[tokenId][i].cancelled) {
                bids[tokenId][i].cancelled = true;
                payable(bids[tokenId][i].bidder).transfer(bids[tokenId][i].amount);
            }
        }
        
        // Reset bid data
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;
        
        emit BidRejected(tokenId, msg.sender, address(0), 0);
    }
    
    /**
     * @dev Bidder cancels their own bid before acceptance; 1% fee
     */
    function cancelBid(uint256 tokenId) external nonReentrant validTokenId(tokenId) {
        // Find the bidder's most recent bid
        uint256 bidIndex = 0;
        bool found = false;
        
        for (uint256 i = bids[tokenId].length; i > 0; i--) {
            if (bids[tokenId][i-1].bidder == msg.sender && 
                !bids[tokenId][i-1].accepted && 
                !bids[tokenId][i-1].cancelled) {
                bidIndex = i-1;
                found = true;
                break;
            }
        }
        
        require(found, "No active bid found");
        
        // Use withdrawBid logic
        Bid storage bid = bids[tokenId][bidIndex];
        bid.cancelled = true;
        
        // Calculate cancellation fee
        uint256 fee = bid.amount * bidCancelFeeBps / MAX_BPS;
        uint256 refundAmount = bid.amount - fee;
        
        // Refund bidder (minus fee)
        payable(msg.sender).transfer(refundAmount);
        
        // Pay fee to contract owner
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        
        // Record transaction
        _recordTransaction(msg.sender, tokenId, "bid_cancel", bid.amount);
        
        emit BidCanceled(tokenId, msg.sender, bid.amount, fee);
    }
    
    /**
     * @dev Claim earnings
     */
    function claimEarnings() external nonReentrant {
        uint256 amount = claimableEarnings[msg.sender];
        require(amount > 0, "No earnings to claim");
        
        claimableEarnings[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit EarningsClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Get claimable earnings for user
     */
    function getClaimableEarnings(address user) external view returns (uint256) {
        return claimableEarnings[user];
    }
    
    // ==================== LEADERBOARD FUNCTIONS ====================
    
    /**
     * @dev Get top 20 leaderboard by different metrics
     */
    function getLeaderboard(
        string memory metric
    ) external view returns (
        address[] memory users,
        uint256[] memory values,
        uint256[] memory ranks
    ) {
        (address[] memory allUsers, uint256 userCount) = _getUniqueUsers();
        uint256[] memory allValues = new uint256[](userCount);
        
        // Calculate values based on metric
        for (uint256 i = 0; i < userCount; i++) {
            address user = allUsers[i];
            allValues[i] = _getMetricValue(user, metric);
        }
        
        // Sort by values (bubble sort)
        _sortLeaderboard(allUsers, allValues, userCount);
        
        // Return top 20 only
        uint256 limit = userCount < 20 ? userCount : 20;
        users = new address[](limit);
        values = new uint256[](limit);
        ranks = new uint256[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            users[i] = allUsers[i];
            values[i] = allValues[i];
            ranks[i] = i + 1; // Rank starts at 1
        }
    }
    
    /**
     * @dev Get user's position in leaderboard with neighbors (user above and below)
     */
    function getUserLeaderboardPosition(
        address user,
        string memory metric
    ) external view returns (
        address[] memory users,      // [above, user, below]
        uint256[] memory values,      // corresponding values
        uint256[] memory ranks,       // corresponding ranks
        uint256 totalUsers            // total users in leaderboard
    ) {
        (address[] memory allUsers, uint256 userCount) = _getUniqueUsers();
        uint256[] memory allValues = new uint256[](userCount);
        
        // Calculate values based on metric
        for (uint256 i = 0; i < userCount; i++) {
            allValues[i] = _getMetricValue(allUsers[i], metric);
        }
        
        // Sort by values
        _sortLeaderboard(allUsers, allValues, userCount);
        
        // Find user's position
        uint256 userPosition = userCount; // Default to last position
        for (uint256 i = 0; i < userCount; i++) {
            if (allUsers[i] == user) {
                userPosition = i;
                break;
            }
        }
        
        // If user not found, return empty arrays
        if (userPosition == userCount) {
            return (new address[](0), new uint256[](0), new uint256[](0), userCount);
        }
        
        // Build result with user and neighbors
        uint256 resultSize = 0;
        if (userPosition > 0) resultSize++; // Has user above
        resultSize++; // The user themselves
        if (userPosition < userCount - 1) resultSize++; // Has user below
        
        users = new address[](resultSize);
        values = new uint256[](resultSize);
        ranks = new uint256[](resultSize);
        
        uint256 index = 0;
        
        // Add user above (if exists)
        if (userPosition > 0) {
            users[index] = allUsers[userPosition - 1];
            values[index] = allValues[userPosition - 1];
            ranks[index] = userPosition; // Rank is position + 1, but this is the one above
            index++;
        }
        
        // Add the user
        users[index] = allUsers[userPosition];
        values[index] = allValues[userPosition];
        ranks[index] = userPosition + 1;
        index++;
        
        // Add user below (if exists)
        if (userPosition < userCount - 1) {
            users[index] = allUsers[userPosition + 1];
            values[index] = allValues[userPosition + 1];
            ranks[index] = userPosition + 2;
        }
        
        totalUsers = userCount;
    }
    
    /**
     * @dev Get user's rank for a specific metric
     */
    function getUserRank(
        address user,
        string memory metric
    ) external view returns (
        uint256 rank,
        uint256 value,
        uint256 totalUsers
    ) {
        (address[] memory allUsers, uint256 userCount) = _getUniqueUsers();
        uint256[] memory allValues = new uint256[](userCount);
        
        // Calculate values based on metric
        for (uint256 i = 0; i < userCount; i++) {
            allValues[i] = _getMetricValue(allUsers[i], metric);
        }
        
        // Sort by values
        _sortLeaderboard(allUsers, allValues, userCount);
        
        // Find user's position
        for (uint256 i = 0; i < userCount; i++) {
            if (allUsers[i] == user) {
                return (i + 1, allValues[i], userCount);
            }
        }
        
        // User not found
        return (0, 0, userCount);
    }
    
    /**
     * @dev Internal function to get metric value for a user
     */
    function _getMetricValue(address user, string memory metric) internal view returns (uint256) {
        if (keccak256(bytes(metric)) == keccak256(bytes("volume"))) {
            return userStats[user].salesVolume;
        } else if (keccak256(bytes(metric)) == keccak256(bytes("sales"))) {
            return userStats[user].totalSales;
        } else if (keccak256(bytes(metric)) == keccak256(bytes("mints"))) {
            return userStats[user].totalMinted;
        } else if (keccak256(bytes(metric)) == keccak256(bytes("points"))) {
            return userStats[user].points;
        } else if (keccak256(bytes(metric)) == keccak256(bytes("earnings"))) {
            return userStats[user].totalEarnings;
        } else if (keccak256(bytes(metric)) == keccak256(bytes("purchases"))) {
            return userStats[user].totalPurchases;
        } else {
            return userStats[user].totalMinted; // Default to mints
        }
    }
    
    /**
     * @dev Internal function to sort leaderboard (bubble sort)
     */
    function _sortLeaderboard(
        address[] memory users,
        uint256[] memory values,
        uint256 count
    ) internal pure {
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (values[j] < values[j + 1]) {
                    // Swap users
                    address tempUser = users[j];
                    users[j] = users[j + 1];
                    users[j + 1] = tempUser;
                    
                    // Swap values
                    uint256 tempValue = values[j];
                    values[j] = values[j + 1];
                    values[j + 1] = tempValue;
                }
            }
        }
    }
    
    /**
     * @dev Get top NFTs by likes
     */
    function getTopNFTsByLikes(uint256 limit) external view returns (
        uint256[] memory tokenIds,
        uint256[] memory likeCounts
    ) {
        require(limit <= 100, "Limit too high");
        
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory allTokenIds = new uint256[](totalSupply);
        uint256[] memory allLikeCounts = new uint256[](totalSupply);
        uint256 count = 0;
        
        // Collect all NFTs
        for (uint256 i = 1; i <= totalSupply; i++) {
            allTokenIds[count] = i;
            allLikeCounts[count] = nftData[i].likes;
            count++;
        }
        
        // Sort by likes (bubble sort)
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (allLikeCounts[j] < allLikeCounts[j + 1]) {
                    // Swap token IDs
                    uint256 tempTokenId = allTokenIds[j];
                    allTokenIds[j] = allTokenIds[j + 1];
                    allTokenIds[j + 1] = tempTokenId;
                    
                    // Swap like counts
                    uint256 tempLikeCount = allLikeCounts[j];
                    allLikeCounts[j] = allLikeCounts[j + 1];
                    allLikeCounts[j + 1] = tempLikeCount;
                }
            }
        }
        
        // Create result arrays
        uint256 resultLimit = limit < count ? limit : count;
        tokenIds = new uint256[](resultLimit);
        likeCounts = new uint256[](resultLimit);
        
        for (uint256 i = 0; i < resultLimit; i++) {
            tokenIds[i] = allTokenIds[i];
            likeCounts[i] = allLikeCounts[i];
        }
    }
    
    /**
     * @dev Get top NFTs by price
     */
    function getTopNFTsByPrice(uint256 limit) external view returns (
        uint256[] memory tokenIds,
        uint256[] memory prices
    ) {
        require(limit <= 100, "Limit too high");
        
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory tempTokenIds = new uint256[](totalSupply);
        uint256[] memory tempPrices = new uint256[](totalSupply);
        uint256 count = 0;
        
        // Collect all listed NFTs
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (nftData[i].isListed && nftData[i].listPrice > 0) {
                tempTokenIds[count] = i;
                tempPrices[count] = nftData[i].listPrice;
                count++;
            }
        }
        
        // Sort by price (bubble sort)
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (tempPrices[j] < tempPrices[j + 1]) {
                    // Swap token IDs
                    uint256 tempTokenId = tempTokenIds[j];
                    tempTokenIds[j] = tempTokenIds[j + 1];
                    tempTokenIds[j + 1] = tempTokenId;
                    
                    // Swap prices
                    uint256 tempPrice = tempPrices[j];
                    tempPrices[j] = tempPrices[j + 1];
                    tempPrices[j + 1] = tempPrice;
                }
            }
        }
        
        // Create result arrays
        uint256 resultLimit = limit < count ? limit : count;
        tokenIds = new uint256[](resultLimit);
        prices = new uint256[](resultLimit);
        
        for (uint256 i = 0; i < resultLimit; i++) {
            tokenIds[i] = tempTokenIds[i];
            prices[i] = tempPrices[i];
        }
    }
    
    /**
     * @dev Get global marketplace statistics
     */
    function getGlobalStats() external view returns (GlobalStats memory) {
        return globalStats;
    }
    
    /**
     * @dev Get user's complete marketplace stats
     */
    function getUserMarketplaceStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    /**
     * @dev Batch fetch multiple NFTs
     */
    function getNFTsBatch(uint256[] memory tokenIds) external view returns (
        NFTData[] memory nfts,
        address[] memory owners,
        string[] memory uris
    ) {
        require(tokenIds.length <= 50, "Too many tokens");
        
        nfts = new NFTData[](tokenIds.length);
        owners = new address[](tokenIds.length);
        uris = new string[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i] > 0 && tokenIds[i] <= _tokenIdCounter, "Token does not exist");
            nfts[i] = nftData[tokenIds[i]];
            owners[i] = ownerOf(tokenIds[i]);
            uris[i] = tokenURI(tokenIds[i]);
        }
    }
    
    // ==================== INTERNAL HELPER FUNCTIONS ====================
    
    function _getUniqueUsers() private view returns (address[] memory users, uint256 userCount) {
        uint256 totalSupply = _tokenIdCounter;
        users = new address[](totalSupply);
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            address creator = nftData[i].creator;
            bool found = false;
            for (uint256 j = 0; j < userCount; j++) {
                if (users[j] == creator) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                users[userCount] = creator;
                userCount++;
            }
        }
    }
    
    function _recordTransaction(
        address user,
        uint256 tokenId,
        string memory txType,
        uint256 amount
    ) internal {
        Transaction[] storage userTxs = userTransactions[user];
        
        userTxs.push(Transaction({
            tokenId: tokenId,
            from: user,
            to: address(0),
            amount: amount,
            timestamp: block.timestamp,
            txType: txType
        }));
        
        if (userTxs.length > MAX_TRANSACTION_HISTORY) {
            for (uint256 i = 0; i < userTxs.length - 1; i++) {
                userTxs[i] = userTxs[i + 1];
            }
            userTxs.pop();
        }
        
        emit TransactionRecorded(user, tokenId, txType, amount);
    }
    
    function _awardPoints(address user, uint256 points, string memory reason) internal {
        userStats[user].points += points;
        emit PointsAwarded(user, points, reason);
    }
    
    function _updateUserCount(address user) internal {
        if (!registeredUsers[user]) {
            registeredUsers[user] = true;
            globalStats.totalUsers++;
        }
    }
    
    function _updateUserExperience(address user, uint256 xp) internal {
        userStats[user].experience += xp;
        uint256 newLevel = userStats[user].experience / 1000;
        if (newLevel > userStats[user].level) {
            userStats[user].level = newLevel;
        }
    }
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 temp = _i;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (_i != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_i % 10)));
            _i /= 10;
        }
        return string(buffer);
    }
    
    // ==================== OWNER FUNCTIONS ====================
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function setBaseMintPrice(uint256 newPrice) external onlyOwner {
        require(newPrice >= 1 ether, "Price must be at least 1 CELO");
        baseMintPrice = newPrice;
    }
    
    function setLikePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        likePrice = newPrice;
    }
    
    function setSaleFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 2000, "Too high"); // max 20%
        saleFeeBps = bps;
    }
    
    function setBidCancelFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Too high"); // max 10%
        bidCancelFeeBps = bps;
    }
    
    function setFeeRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        feeRecipient = recipient;
    }
    
    function flagNFT(uint256 tokenId, string memory reason) external onlyOwner validTokenId(tokenId) {
        flaggedNFTs[tokenId] = true;
        nftFlagReasons[tokenId] = reason;
        emit NFTFlagged(tokenId, reason);
    }
    
    function unflagNFT(uint256 tokenId) external onlyOwner validTokenId(tokenId) {
        flaggedNFTs[tokenId] = false;
        delete nftFlagReasons[tokenId];
        emit NFTUnflagged(tokenId);
    }
    
    function flagUser(address user, string memory reason) external onlyOwner {
        require(user != address(0), "Invalid user address");
        flaggedUsers[user] = true;
        userFlagReasons[user] = reason;
        emit UserFlagged(user, reason);
    }
    
    function unflagUser(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        flaggedUsers[user] = false;
        delete userFlagReasons[user];
        emit UserUnflagged(user);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function getContractInfo() external view returns (
        string memory version,
        uint256 totalSupply,
        uint256 currentMintPrice,
        uint256 currentLikePrice,
        uint256 currentSaleFeeBps,
        address currentFeeRecipient
    ) {
        return (
            VERSION,
            _tokenIdCounter,
            baseMintPrice,
            likePrice,
            saleFeeBps,
            feeRecipient
        );
    }
    
    function getNFTData(uint256 tokenId) external view validTokenId(tokenId) returns (NFTData memory) {
        return nftData[tokenId];
    }
    
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    function getBids(uint256 tokenId) external view validTokenId(tokenId) returns (Bid[] memory) {
        return bids[tokenId];
    }
    
    function getActiveBids(uint256 tokenId) external view validTokenId(tokenId) returns (Bid[] memory) {
        Bid[] memory allBids = bids[tokenId];
        uint256 activeCount = 0;
        
        // Count active bids
        for (uint256 i = 0; i < allBids.length; i++) {
            if (!allBids[i].accepted && !allBids[i].cancelled) {
                activeCount++;
            }
        }
        
        // Create array of active bids
        Bid[] memory activeBids = new Bid[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allBids.length; i++) {
            if (!allBids[i].accepted && !allBids[i].cancelled) {
                activeBids[index] = allBids[i];
                index++;
            }
        }
        
        return activeBids;
    }
    
    function getUserNFTs(address user) external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory tempTokens = new uint256[](totalSupply);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (ownerOf(i) == user) {
                tempTokens[count] = i;
                count++;
            }
        }
        
        uint256[] memory userTokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            userTokens[i] = tempTokens[i];
        }
        
        return userTokens;
    }
    
    function getUserCreatedNFTs(address user) external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory tempTokens = new uint256[](totalSupply);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (nftData[i].creator == user) {
                tempTokens[count] = i;
                count++;
            }
        }
        
        uint256[] memory createdTokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            createdTokens[i] = tempTokens[i];
        }
        
        return createdTokens;
    }
    
    function getUserLikedNFTs(address user) external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory tempTokens = new uint256[](totalSupply);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (hasLiked[i][user]) {
                tempTokens[count] = i;
                count++;
            }
        }
        
        uint256[] memory likedTokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            likedTokens[i] = tempTokens[i];
        }
        
        return likedTokens;
    }
    
    function getUserTransactionHistory(address user, uint256 limit) external view returns (Transaction[] memory) {
        Transaction[] memory allTxs = userTransactions[user];
        
        if (allTxs.length == 0) {
            return new Transaction[](0);
        }
        
        uint256 resultLimit = limit < allTxs.length ? limit : allTxs.length;
        Transaction[] memory result = new Transaction[](resultLimit);
        
        // Return most recent transactions
        uint256 startIndex = allTxs.length > resultLimit ? allTxs.length - resultLimit : 0;
        
        for (uint256 i = 0; i < resultLimit; i++) {
            result[i] = allTxs[startIndex + i];
        }
        
        return result;
    }
    
    function isNFTFlagged(uint256 tokenId) external view validTokenId(tokenId) returns (bool) {
        return flaggedNFTs[tokenId];
    }
    
    function isUserFlagged(address user) external view returns (bool) {
        return flaggedUsers[user];
    }
}