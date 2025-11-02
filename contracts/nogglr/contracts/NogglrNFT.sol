// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NogglrNFT is 
    Initializable,
    ERC721Upgradeable, 
    ERC721URIStorageUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{

    uint256 private _tokenIdCounter;

    // Pricing variables (upgradeable)
    uint256 public baseMintPrice; // 0.4 CELO base price
    uint256 public rarityPriceIncrement; // 0.1 CELO per rare trait
    uint256 public likePrice; // 0.1 CELO
    uint256 public appFeePercentage; // 50% of like price (0.05 CELO)
    uint256 public ownerFeePercentage; // 50% of like price (0.05 CELO)
    
    // Contract version and verification
    string public constant VERSION = "1.0.0";
    bool public isVerified;
    string public verificationHash;

    // Structs
    struct NFTData {
        uint256 likes;
        uint256 totalEarnings;
        address creator;
        uint256 createdAt;
        bool isListed;
        uint256 listPrice; // 0 means not listed or accept bids only
        uint256 currentBid;
        address currentBidder;
        uint256 bidEndTime;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool accepted;
        bool cancelled;
    }

    struct UserStats {
        uint256 totalMinted;
        uint256 totalLikes;
        uint256 totalEarnings;
        uint256 level;
        uint256 experience;
    }

    // Mappings
    mapping(uint256 => NFTData) public nftData;
    mapping(uint256 => mapping(address => bool)) public hasLiked;
    mapping(uint256 => Bid[]) public bids;
    mapping(address => UserStats) public userStats;
    mapping(address => uint256) public userLevels;

    // Flagging system
    mapping(uint256 => bool) public flaggedNFTs;
    mapping(address => bool) public flaggedUsers;
    mapping(uint256 => string) public flagReasons;
    mapping(address => string) public userFlagReasons;
    
    // Events for flagging
    event NFTFlagged(uint256 indexed tokenId, string reason);
    event UserFlagged(address indexed user, string reason);
    event NFTUnflagged(uint256 indexed tokenId);
    event UserUnflagged(address indexed user);

    // Main events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string ipfsUri);
    event NFTLiked(uint256 indexed tokenId, address indexed liker, uint256 totalLikes);
    event NFTAppreciated(uint256 indexed tokenId, address indexed appreciator, uint256 totalLikes);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event BidAccepted(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 amount);
    event BidRejected(uint256 indexed tokenId, address indexed seller, address indexed bidder, uint256 amount);
    event BidCanceled(uint256 indexed tokenId, address indexed bidder, uint256 amount, uint256 feeCharged);
    event Listed(uint256 indexed tokenId, uint256 price);
    event Unlisted(uint256 indexed tokenId);
    event Purchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 feeCharged);
    event UserLevelUp(address indexed user, uint256 newLevel);

    // Fees and bidding config
    uint256 public constant MAX_BPS = 10_000;
    uint256 public constant MIN_BID_NON_LISTED = 1 ether; // 1 CELO
    uint256 public bidCancelFeeBps;
    uint256 public saleFeeBps;
    address public feeRecipient;

    // Modifiers
    modifier onlyNFTOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        _;
    }

    modifier validTokenId(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= _tokenIdCounter, "Token does not exist");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("NogglrNFT", "NOGGLR");
        __ERC721URIStorage_init();
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        // Initialize pricing
        baseMintPrice = 0.4 ether;
        rarityPriceIncrement = 0.1 ether;
        likePrice = 0.1 ether;
        appFeePercentage = 50;
        ownerFeePercentage = 50;
        
        // Initialize verification
        isVerified = false;
        verificationHash = "";
        
        // Initialize fees
        bidCancelFeeBps = 100; // 1%
        saleFeeBps = 500; // 5%
        feeRecipient = msg.sender;
    }

    // Get current mint price (for frontend compatibility)
    function getMintPrice() external view returns (uint256) {
        return baseMintPrice;
    }

    // Calculate dynamic mint price based on metadata
    function calculateMintPrice(string memory ipfsUri) public view returns (uint256) {
        // For now, return base price. In future, we can parse metadata to count rare traits
        // and add rarityPriceIncrement for each rare trait
        return baseMintPrice;
    }

    // Minting function with frontend-calculated price
    function mintNFT(string memory ipfsUri, uint256 calculatedPrice) external payable nonReentrant {
        require(calculatedPrice >= baseMintPrice, "Price below minimum");
        require(msg.value >= calculatedPrice, "Insufficient payment for minting");
        require(!flaggedUsers[msg.sender], "User is flagged");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, ipfsUri);
        
        nftData[tokenId] = NFTData({
            likes: 0,
            totalEarnings: 0,
            creator: msg.sender,
            createdAt: block.timestamp,
            isListed: false,
            listPrice: 0,
            currentBid: 0,
            currentBidder: address(0),
            bidEndTime: 0
        });

        // Update user stats
        userStats[msg.sender].totalMinted++;
        _updateUserExperience(msg.sender, 100); // 100 XP for minting

        // Refund excess payment
        if (msg.value > calculatedPrice) {
            payable(msg.sender).transfer(msg.value - calculatedPrice);
        }

        emit NFTMinted(tokenId, msg.sender, ipfsUri);
    }

    // Mint and send to recipient
    function mintAndSend(address recipient, string memory ipfsUri) external payable nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 requiredPrice = calculateMintPrice(ipfsUri);
        require(msg.value >= requiredPrice, "Insufficient payment for minting");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, ipfsUri);

        nftData[tokenId] = NFTData({
            likes: 0,
            totalEarnings: 0,
            creator: msg.sender,
            createdAt: block.timestamp,
            isListed: false,
            listPrice: 0,
            currentBid: 0,
            currentBidder: address(0),
            bidEndTime: 0
        });

        userStats[msg.sender].totalMinted++;
        _updateUserExperience(msg.sender, 100);

        // Refund excess
        if (msg.value > requiredPrice) {
            payable(msg.sender).transfer(msg.value - requiredPrice);
        }

        emit NFTMinted(tokenId, msg.sender, ipfsUri);
    }

    // Like function
    function likeNFT(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(!hasLiked[tokenId][msg.sender], "Already liked this NFT");
        require(msg.value >= likePrice, "Insufficient payment for liking");
        require(ownerOf(tokenId) != msg.sender, "Cannot like your own NFT");

        hasLiked[tokenId][msg.sender] = true;
        nftData[tokenId].likes++;

        // Distribute payment
        uint256 appFee = likePrice * appFeePercentage / 100;
        uint256 ownerFee = likePrice * ownerFeePercentage / 100;

        // Send fees
        payable(owner()).transfer(appFee);
        payable(ownerOf(tokenId)).transfer(ownerFee);

        // Update earnings
        nftData[tokenId].totalEarnings += ownerFee;
        userStats[ownerOf(tokenId)].totalEarnings += ownerFee;
        userStats[msg.sender].totalLikes++;

        // Update experience
        _updateUserExperience(msg.sender, 10); // 10 XP for liking
        _updateUserExperience(ownerOf(tokenId), 5); // 5 XP for receiving a like

        // Refund excess payment
        if (msg.value > likePrice) {
            payable(msg.sender).transfer(msg.value - likePrice);
        }

        emit NFTLiked(tokenId, msg.sender, nftData[tokenId].likes);
    }

    // Alias: appreciate (same behavior and pricing as like)
    function appreciate(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(!hasLiked[tokenId][msg.sender], "Already appreciated this NFT");
        require(msg.value >= likePrice, "Insufficient payment for appreciation");
        require(ownerOf(tokenId) != msg.sender, "Cannot appreciate your own NFT");

        hasLiked[tokenId][msg.sender] = true;
        nftData[tokenId].likes++;

        uint256 appFee = likePrice * appFeePercentage / 100;
        uint256 ownerFee = likePrice * ownerFeePercentage / 100;

        payable(owner()).transfer(appFee);
        payable(ownerOf(tokenId)).transfer(ownerFee);

        nftData[tokenId].totalEarnings += ownerFee;
        userStats[ownerOf(tokenId)].totalEarnings += ownerFee;
        userStats[msg.sender].totalLikes++;

        _updateUserExperience(msg.sender, 10);
        _updateUserExperience(ownerOf(tokenId), 5);

        if (msg.value > likePrice) {
            payable(msg.sender).transfer(msg.value - likePrice);
        }

        emit NFTAppreciated(tokenId, msg.sender, nftData[tokenId].likes);
    }

    // Bidding functions
    function placeBid(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(ownerOf(tokenId) != msg.sender, "Cannot bid on your own NFT");
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
        
        // Store bid in history (don't refund previous bidders)
        bids[tokenId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            accepted: false,
            cancelled: false
        }));
        
        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

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
        
        // Pay seller
        payable(msg.sender).transfer(sellerAmount);
        
        // Pay fees
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        
        // Update earnings
        nftData[tokenId].totalEarnings += sellerAmount;
        userStats[msg.sender].totalEarnings += sellerAmount;
        
        // Update experience
        _updateUserExperience(bid.bidder, 50); // 50 XP for winning bid
        _updateUserExperience(msg.sender, 25); // 25 XP for selling
        
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
        
        emit BidAccepted(tokenId, msg.sender, bid.bidder, bid.amount);
    }

    // Allow bidders to withdraw their bids
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
        
        emit BidCanceled(tokenId, msg.sender, bid.amount, 0); // No fee for voluntary withdrawal
    }
    // Reject all bids by owner (refund all bidders)
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

    // Bidder cancels their own bid before acceptance; 1% fee
    // Legacy cancelBid function - now redirects to withdrawBid
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
        
        emit BidCanceled(tokenId, msg.sender, bid.amount, fee);
    }

    // Get all bids for a token
    function getBids(uint256 tokenId) external view validTokenId(tokenId) returns (Bid[] memory) {
        return bids[tokenId];
    }
    
    // Get active bids for a token (not accepted or cancelled)
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

    // Listing management
    function listForSale(uint256 tokenId, uint256 price) external onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(price > 0, "Price must be > 0");
        nftData[tokenId].isListed = true;
        nftData[tokenId].listPrice = price;
        emit Listed(tokenId, price);
    }

    function unlist(uint256 tokenId) external onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(nftData[tokenId].isListed, "Not listed");
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        emit Unlisted(tokenId);
    }

    function buyNow(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(nftData[tokenId].isListed && nftData[tokenId].listPrice > 0, "Not for sale");
        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Owner cannot buy");
        uint256 price = nftData[tokenId].listPrice;
        require(msg.value >= price, "Insufficient payment");

        // Fees
        uint256 fee = (price * saleFeeBps) / MAX_BPS;
        uint256 sellerAmount = price - fee;

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Payments
        if (fee > 0) payable(feeRecipient).transfer(fee);
        payable(seller).transfer(sellerAmount);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        // Reset listing and bid data
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;

        // Update stats
        userStats[seller].totalEarnings += price;
        _updateUserExperience(seller, 50);
        _updateUserExperience(msg.sender, 30);

        emit Purchased(tokenId, msg.sender, price, fee);
    }

    // Gamification functions
    function _updateUserExperience(address user, uint256 xp) internal {
        userStats[user].experience += xp;
        
        // Level up system (every 1000 XP = 1 level)
        uint256 newLevel = userStats[user].experience / 1000;
        if (newLevel > userStats[user].level) {
            userStats[user].level = newLevel;
            emit UserLevelUp(user, newLevel);
        }
    }

    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }

    function getNFTData(uint256 tokenId) external view validTokenId(tokenId) returns (NFTData memory) {
        return nftData[tokenId];
    }

    // User utility functions
    function getUserLikes(address user) external view returns (uint256) {
        return userStats[user].totalLikes;
    }

    function getUserReceivedLikes(address user) external view returns (uint256) {
        uint256 totalReceivedLikes = 0;
        uint256 totalSupply = _tokenIdCounter;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (ownerOf(i) == user) {
                totalReceivedLikes += nftData[i].likes;
            }
        }
        
        return totalReceivedLikes;
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

    function _calculateUserCounts(address user) private view returns (
        uint256 receivedLikesCount,
        uint256 ownedCount,
        uint256 createdCount,
        uint256 likedCount
    ) {
        uint256 totalSupply = _tokenIdCounter;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (ownerOf(i) == user) {
                ownedCount++;
                receivedLikesCount += nftData[i].likes;
            }
            if (nftData[i].creator == user) {
                createdCount++;
            }
            if (hasLiked[i][user]) {
                likedCount++;
            }
        }
    }

    function getUserDetailedStats(address user) external view returns (
        uint256 totalMinted,
        uint256 totalLikes,
        uint256 totalEarnings,
        uint256 level,
        uint256 experience,
        uint256 receivedLikes,
        uint256 ownedNFTs,
        uint256 createdNFTs,
        uint256 likedNFTs
    ) {
        UserStats memory stats = userStats[user];
        (uint256 receivedLikesCount, uint256 ownedCount, uint256 createdCount, uint256 likedCount) = _calculateUserCounts(user);
        
        return (
            stats.totalMinted,
            stats.totalLikes,
            stats.totalEarnings,
            stats.level,
            stats.experience,
            receivedLikesCount,
            ownedCount,
            createdCount,
            likedCount
        );
    }

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

    function _calculateRankings(address user, address[] memory users, uint256 userCount) private view returns (
        uint256 mintRank,
        uint256 likesRank,
        uint256 earningsRank
    ) {
        uint256 userMinted = userStats[user].totalMinted;
        uint256 userLikes = userStats[user].totalLikes;
        uint256 userEarnings = userStats[user].totalEarnings;
        
        uint256 mintCount = 0;
        uint256 likesCount = 0;
        uint256 earningsCount = 0;
        
        for (uint256 i = 0; i < userCount; i++) {
            address currentUser = users[i];
            if (userStats[currentUser].totalMinted > userMinted) mintCount++;
            if (userStats[currentUser].totalLikes > userLikes) likesCount++;
            if (userStats[currentUser].totalEarnings > userEarnings) earningsCount++;
        }
        
        return (mintCount + 1, likesCount + 1, earningsCount + 1);
    }

    function getUserRanking(address user) external view returns (
        uint256 mintRank,
        uint256 likesRank,
        uint256 earningsRank,
        uint256 totalUsers
    ) {
        (address[] memory users, uint256 userCount) = _getUniqueUsers();
        (uint256 mintRankValue, uint256 likesRankValue, uint256 earningsRankValue) = _calculateRankings(user, users, userCount);
        
        return (mintRankValue, likesRankValue, earningsRankValue, userCount);
    }

    function getUserActivity(address user, uint256 limit) external view returns (
        uint256[] memory tokenIds,
        string[] memory activities,
        uint256[] memory timestamps
    ) {
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory tempTokenIds = new uint256[](limit);
        string[] memory tempActivities = new string[](limit);
        uint256[] memory tempTimestamps = new uint256[](limit);
        uint256 count = 0;
        
        // Get created NFTs
        for (uint256 i = 1; i <= totalSupply && count < limit; i++) {
            if (nftData[i].creator == user) {
                tempTokenIds[count] = i;
                tempActivities[count] = "created";
                tempTimestamps[count] = nftData[i].createdAt;
                count++;
            }
        }
        
        // Get liked NFTs
        for (uint256 i = 1; i <= totalSupply && count < limit; i++) {
            if (hasLiked[i][user]) {
                tempTokenIds[count] = i;
                tempActivities[count] = "liked";
                tempTimestamps[count] = nftData[i].createdAt; // Using creation time as proxy
                count++;
            }
        }
        
        return (tempTokenIds, tempActivities, tempTimestamps);
    }

    function _collectUserData() private view returns (
        address[] memory tempUsers,
        uint256[] memory tempMints,
        uint256[] memory tempLikes,
        uint256[] memory tempEarnings,
        uint256 userCount
    ) {
        uint256 totalSupply = _tokenIdCounter;
        tempUsers = new address[](totalSupply);
        tempMints = new uint256[](totalSupply);
        tempLikes = new uint256[](totalSupply);
        tempEarnings = new uint256[](totalSupply);
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            address creator = nftData[i].creator;
            bool found = false;
            uint256 userIndex = 0;
            
            for (uint256 j = 0; j < userCount; j++) {
                if (tempUsers[j] == creator) {
                    found = true;
                    userIndex = j;
                    break;
                }
            }
            
            if (!found) {
                tempUsers[userCount] = creator;
                tempMints[userCount] = 1;
                tempLikes[userCount] = userStats[creator].totalLikes;
                tempEarnings[userCount] = userStats[creator].totalEarnings;
                userCount++;
            } else {
                tempMints[userIndex]++;
            }
        }
    }

    function _sortUsersByMints(
        address[] memory tempUsers,
        uint256[] memory tempMints,
        uint256[] memory tempLikes,
        uint256[] memory tempEarnings,
        uint256 userCount
    ) private pure {
        for (uint256 i = 0; i < userCount - 1; i++) {
            for (uint256 j = 0; j < userCount - i - 1; j++) {
                if (tempMints[j] < tempMints[j + 1]) {
                    // Swap users
                    address tempUser = tempUsers[j];
                    tempUsers[j] = tempUsers[j + 1];
                    tempUsers[j + 1] = tempUser;
                    
                    // Swap mints
                    uint256 tempMint = tempMints[j];
                    tempMints[j] = tempMints[j + 1];
                    tempMints[j + 1] = tempMint;
                    
                    // Swap likes
                    uint256 tempLike = tempLikes[j];
                    tempLikes[j] = tempLikes[j + 1];
                    tempLikes[j + 1] = tempLike;
                    
                    // Swap earnings
                    uint256 tempEarn = tempEarnings[j];
                    tempEarnings[j] = tempEarnings[j + 1];
                    tempEarnings[j + 1] = tempEarn;
                }
            }
        }
    }

    function getTopUsers(uint256 limit) external view returns (
        address[] memory users,
        uint256[] memory mintCounts,
        uint256[] memory likeCounts,
        uint256[] memory earnings
    ) {
        (address[] memory tempUsers, uint256[] memory tempMints, uint256[] memory tempLikes, uint256[] memory tempEarnings, uint256 userCount) = _collectUserData();
        
        _sortUsersByMints(tempUsers, tempMints, tempLikes, tempEarnings, userCount);
        
        uint256 resultLimit = limit < userCount ? limit : userCount;
        address[] memory resultUsers = new address[](resultLimit);
        uint256[] memory resultMints = new uint256[](resultLimit);
        uint256[] memory resultLikes = new uint256[](resultLimit);
        uint256[] memory resultEarnings = new uint256[](resultLimit);
        
        for (uint256 i = 0; i < resultLimit; i++) {
            resultUsers[i] = tempUsers[i];
            resultMints[i] = tempMints[i];
            resultLikes[i] = tempLikes[i];
            resultEarnings[i] = tempEarnings[i];
        }
        
        return (resultUsers, resultMints, resultLikes, resultEarnings);
    }

    // Utility functions
    function getTotalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function getTopCreators(uint256 /*limit*/) external pure returns (address[] memory, uint256[] memory) {
        // Placeholder implementation; no storage access
        address[] memory creators = new address[](0);
        uint256[] memory counts = new uint256[](0);
        return (creators, counts);
    }

    // Flagging functions
    function flagNFT(uint256 tokenId, string memory reason) external onlyOwner validTokenId(tokenId) {
        flaggedNFTs[tokenId] = true;
        flagReasons[tokenId] = reason;
        emit NFTFlagged(tokenId, reason);
    }
    
    function unflagNFT(uint256 tokenId) external onlyOwner validTokenId(tokenId) {
        flaggedNFTs[tokenId] = false;
        delete flagReasons[tokenId];
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
    
    // Check if NFT or user is flagged
    function isNFTFlagged(uint256 tokenId) external view validTokenId(tokenId) returns (bool) {
        return flaggedNFTs[tokenId];
    }
    
    function isUserFlagged(address user) external view returns (bool) {
        return flaggedUsers[user];
    }

    // Owner functions
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Pricing update functions
    function setBaseMintPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        baseMintPrice = newPrice;
    }

    function setRarityPriceIncrement(uint256 newIncrement) external onlyOwner {
        rarityPriceIncrement = newIncrement;
    }

    // Legacy function for backward compatibility
    function setMintPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        baseMintPrice = newPrice;
    }

    function setLikePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        likePrice = newPrice;
    }

    function setFeePercentages(uint256 appFee, uint256 ownerFee) external onlyOwner {
        require(appFee + ownerFee == 100, "Fee percentages must sum to 100");
        appFeePercentage = appFee;
        ownerFeePercentage = ownerFee;
    }

    // Admin fee config
    function setFeeRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        feeRecipient = recipient;
    }

    function setBidCancelFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Too high"); // max 10%
        bidCancelFeeBps = bps;
    }

    function setSaleFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 2000, "Too high"); // max 20%
        saleFeeBps = bps;
    }

    // Contract verification functions
    function verifyContract(string memory hash) external onlyOwner {
        verificationHash = hash;
        isVerified = true;
    }

    function revokeVerification() external onlyOwner {
        isVerified = false;
        verificationHash = "";
    }

    function getContractInfo() external view returns (
        string memory version,
        bool verified,
        string memory hash,
        uint256 totalSupply,
        uint256 currentMintPrice,
        uint256 currentLikePrice
    ) {
        return (
            VERSION,
            isVerified,
            verificationHash,
            _tokenIdCounter,
            baseMintPrice,
            likePrice
        );
    }

    // UUPS Upgrade authorization
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
