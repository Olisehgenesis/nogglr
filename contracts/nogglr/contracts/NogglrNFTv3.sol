// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title NogglrNFTv3
 * @dev Non-upgradeable NFT contract with on-chain SVG storage
 * @author Nogglr Team
 */
contract NogglrNFTv3 is ERC721, Ownable, ReentrancyGuard {
    
    // Contract version
    string public constant VERSION = "3.0.0";
    
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
    address public feeRecipient;
    
    // On-chain NFT data structure
    struct OnChainNFTData {
        string svgData;           // Base64 encoded SVG
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
    
    // Global stats
    GlobalStats public globalStats;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string name, uint256 price);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTUnlisted(uint256 indexed tokenId);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event BidAccepted(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 amount);
    event BidCanceled(uint256 indexed tokenId, address indexed bidder, uint256 amount, uint256 fee);
    event NFTLiked(uint256 indexed tokenId, address indexed liker, uint256 newLikeCount);
    event EarningsClaimed(address indexed user, uint256 amount);
    event UserFlagged(address indexed user, string reason);
    event UserUnflagged(address indexed user);
    event NFTFlagged(uint256 indexed tokenId, string reason);
    event NFTUnflagged(uint256 indexed tokenId);
    
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
        
        // Store on-chain data
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
        _awardPoints(msg.sender, 10, "mint");
        
        // Update global stats
        globalStats.totalNFTs++;
        globalStats.totalTransactions++;
        _updateUserCount(msg.sender);
        
        // Refund excess payment
        if (msg.value > calculatedPrice) {
            payable(msg.sender).transfer(msg.value - calculatedPrice);
        }
        
        emit NFTMinted(tokenId, msg.sender, name, calculatedPrice);
    }
    
    /**
     * @dev Generate tokenURI with on-chain data
     */
    function tokenURI(uint256 tokenId) public view override validTokenId(tokenId) returns (string memory) {
        OnChainNFTData memory data = onChainNFTData[tokenId];
        
        // Create metadata JSON
        string memory metadata = generateMetadataJSON(tokenId, data);
        
        // Encode as base64 data URI
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(metadata))
        ));
    }
    
    /**
     * @dev Generate metadata JSON from on-chain data
     */
    function generateMetadataJSON(uint256 tokenId, OnChainNFTData memory data) internal pure returns (string memory) {
        // Build attributes array
        string memory attributes = "[";
        for (uint256 i = 0; i < data.traitTypes.length; i++) {
            attributes = string(abi.encodePacked(
                attributes,
                i > 0 ? "," : "",
                '{"trait_type":"', data.traitTypes[i], '","value":"', data.traitValues[i], '","rarity_score":', _uint2str(data.rarityScores[i]), '}'
            ));
        }
        attributes = string(abi.encodePacked(attributes, "]"));
        
        // Build metadata JSON
        return string(abi.encodePacked(
            '{"name":"', data.name, '",',
            '"description":"', data.description, '",',
            '"image":"data:image/svg+xml;base64,', data.svgData, '",',
            '"attributes":', attributes, ',',
            '"overall_rarity":', _uint2str(data.overallRarity), ',',
            '"created_at":', _uint2str(data.createdAt), ',',
            '"token_id":', _uint2str(tokenId), '}'
        ));
    }
    
    /**
     * @dev Get SVG data for a token
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
        _awardPoints(msg.sender, 1, "like");
        
        // Update global stats
        globalStats.totalTransactions++;
        
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
        
        emit NFTListed(tokenId, price);
    }
    
    /**
     * @dev Unlist NFT
     */
    function unlistNFT(uint256 tokenId) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(nftData[tokenId].isListed, "Not listed");
        
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        
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
        
        // Update global stats
        globalStats.totalTransactions++;
        globalStats.totalVolume += price;
        
        emit NFTSold(tokenId, seller, msg.sender, price);
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
    
    /**
     * @dev Owner functions
     */
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
    
    function setFeeRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        feeRecipient = recipient;
    }
    
    /**
     * @dev Flagging functions
     */
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
    
    /**
     * @dev View functions
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function getContractInfo() external view returns (
        string memory version,
        uint256 totalSupply,
        uint256 currentMintPrice,
        uint256 currentLikePrice,
        uint256 saleFeeBps,
        address feeRecipient
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
    
    /**
     * @dev Internal helper functions
     */
    function _updateUserExperience(address user, uint256 xp) internal {
        userStats[user].experience += xp;
        // Level up logic (every 1000 XP = 1 level)
        uint256 newLevel = userStats[user].experience / 1000;
        if (newLevel > userStats[user].level) {
            userStats[user].level = newLevel;
        }
    }
    
    function _awardPoints(address user, uint256 points, string memory action) internal {
        userStats[user].points += points;
        // Could emit event for points earned
    }
    
    function _updateUserCount(address user) internal {
        if (userStats[user].totalMinted == 1) {
            globalStats.totalUsers++;
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
}
