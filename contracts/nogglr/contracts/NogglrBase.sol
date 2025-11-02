// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title NogglrBase
 * @dev Non-upgradeable NFT contract based on Nogglrv3BETA with USDC minting
 */
contract NogglrBase is ERC721, Ownable, ReentrancyGuard {
    // Contract version
    string public constant VERSION = "4.0.0-USDC";

    // Token counter
    uint256 private _tokenIdCounter;

    // Pricing (USDC)
    IERC20 public immutable usdc;
    uint8 private immutable usdcDecimals;
    uint256 public baseMintPriceUSDC; // in USDC smallest units
    uint256 public rarityPriceIncrementUSDC; // per rare trait, in USDC

    // CELO-based prices retained for non-mint paths (likes, bids, etc.)
    uint256 public likePrice = 0.1 ether;

    // Fee configuration
    uint256 public constant MAX_BPS = 10000;
    uint256 public saleFeeBps = 500; // 5%
    uint256 public bidCancelFeeBps = 100; // 1%
    uint256 public constant MIN_BID_NON_LISTED = 1 ether; // 1 CELO minimum bid for unlisted NFTs
    address public feeRecipient;

    // On-chain NFT data structure
    struct OnChainNFTData {
        string svgData;
        string name;
        string description;
        string[] traitTypes;
        string[] traitValues;
        uint256[] rarityScores;   // 0-100
        uint256 overallRarity;
        uint256 createdAt;
    }

    // NFT data structure for marketplace
    struct NFTData {
        uint256 likes;
        uint256 totalEarnings;    // in wei from likes/sales
        address creator;
        uint256 createdAt;
        bool isListed;
        uint256 listPrice;        // in wei
        uint256 currentBid;       // in wei
        address currentBidder;
        uint256 bidEndTime;
        uint256 mintPriceUSDC;    // in USDC units for mint
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
        uint256 totalVolume; // in wei (sales volume)
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
    mapping(address => uint256) public claimableEarnings; // in wei
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
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string name, uint256 priceUSDC);
    event NFTListed(uint256 indexed tokenId, uint256 priceWei);
    event NFTUnlisted(uint256 indexed tokenId);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 priceWei);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amountWei);
    event BidAccepted(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 amountWei);
    event BidRejected(uint256 indexed tokenId, address indexed seller, address indexed bidder, uint256 amountWei);
    event BidCanceled(uint256 indexed tokenId, address indexed bidder, uint256 amountWei, uint256 feeWei);
    event NFTLiked(uint256 indexed tokenId, address indexed liker, uint256 newLikeCount);
    event EarningsClaimed(address indexed user, uint256 amountWei);
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

    constructor(address _feeRecipient, address _usdc) ERC721("NogglrNFT", "NOGGLR") Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_usdc != address(0), "Invalid USDC address");
        feeRecipient = _feeRecipient;
        usdc = IERC20(_usdc);
        usdcDecimals = IERC20Metadata(_usdc).decimals();
        // Default: min mint of 0.2 USDC, rarity increment 0.02 USDC
        baseMintPriceUSDC = 2 * (10 ** (usdcDecimals - 1)); // 0.2 * 10^decimals
        rarityPriceIncrementUSDC = (10 ** (usdcDecimals - 2)); // 0.01 * 10^decimals
    }

    /**
     * @dev Mint NFT with USDC (on-chain SVG storage)
     * @param calculatedPriceUSDC price computed off-chain (>= baseMintPriceUSDC)
     */
    function mintNFTOnChain(
        string memory svgData,
        string memory name,
        string memory description,
        string[] memory traitTypes,
        string[] memory traitValues,
        uint256[] memory rarityScores,
        uint256 calculatedPriceUSDC
    ) external nonReentrant notFlagged {
        require(bytes(svgData).length > 0, "SVG data cannot be empty");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(calculatedPriceUSDC >= baseMintPriceUSDC, "Price below 0.2 USDC");
        require(traitTypes.length == traitValues.length && traitTypes.length == rarityScores.length, "Trait arrays length mismatch");

        // Pull USDC payment
        require(usdc.allowance(msg.sender, address(this)) >= calculatedPriceUSDC, "Approve USDC first");
        bool ok = usdc.transferFrom(msg.sender, feeRecipient, calculatedPriceUSDC);
        require(ok, "USDC transfer failed");

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
            mintPriceUSDC: calculatedPriceUSDC
        });

        // Mint NFT
        _safeMint(msg.sender, tokenId);

        // Stats
        _updateUserExperience(msg.sender, 100);
        _awardPoints(msg.sender, POINTS_MINT, "mint");
        globalStats.totalNFTs++;
        globalStats.totalTransactions++;
        _updateUserCount(msg.sender);

        // Record transaction (store USDC amount in generic field)
        _recordTransaction(msg.sender, tokenId, "mint_usdc", calculatedPriceUSDC);

        emit NFTMinted(tokenId, msg.sender, name, calculatedPriceUSDC);
    }

    /**
     * @dev tokenURI with base64-encoded SVG image
     */
    function tokenURI(uint256 tokenId) public view override validTokenId(tokenId) returns (string memory) {
        OnChainNFTData memory data = onChainNFTData[tokenId];
        string memory base64SVG = Base64.encode(bytes(data.svgData));
        string memory metadata = generateMetadataJSON(tokenId, data, base64SVG);
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(metadata))));
    }

    function generateMetadataJSON(
        uint256 tokenId,
        OnChainNFTData memory data,
        string memory base64SVG
    ) internal pure returns (string memory) {
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

    // Like, list, buy, bids remain CELO-native for now (unchanged vs. beta)
    function likeNFT(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) notFlagged {
        require(!hasLiked[tokenId][msg.sender], "Already liked");
        require(msg.value >= likePrice, "Insufficient payment for like");
        require(!flaggedNFTs[tokenId], "NFT is flagged");
        require(ownerOf(tokenId) != msg.sender, "Cannot like own NFT");

        hasLiked[tokenId][msg.sender] = true;
        nftData[tokenId].likes++;

        uint256 appFee = (likePrice * 50) / 100; // 50% to app
        uint256 ownerFee = likePrice - appFee;   // 50% to NFT owner

        if (appFee > 0) {
            payable(feeRecipient).transfer(appFee);
        }

        address nftOwner = ownerOf(tokenId);
        if (ownerFee > 0) {
            claimableEarnings[nftOwner] += ownerFee;
            nftData[tokenId].totalEarnings += ownerFee;
        }

        globalStats.totalTransactions++;
        globalStats.totalLikes++;
        _recordTransaction(msg.sender, tokenId, "like", likePrice);
        emit NFTLiked(tokenId, msg.sender, nftData[tokenId].likes);
    }

    // The rest of marketplace functions mirror Nogglrv3BETA (CELO-based)
    function listNFT(uint256 tokenId, uint256 price) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(price > 0, "Price must be greater than 0");
        require(!nftData[tokenId].isListed, "Already listed");
        require(!flaggedNFTs[tokenId], "NFT is flagged");
        nftData[tokenId].isListed = true;
        nftData[tokenId].listPrice = price;
        _recordTransaction(msg.sender, tokenId, "list", price);
        emit NFTListed(tokenId, price);
    }

    function unlistNFT(uint256 tokenId) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(nftData[tokenId].isListed, "Not listed");
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        _recordTransaction(msg.sender, tokenId, "unlist", 0);
        emit NFTUnlisted(tokenId);
    }

    function buyNow(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(nftData[tokenId].isListed && nftData[tokenId].listPrice > 0, "Not for sale");
        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Owner cannot buy");
        uint256 price = nftData[tokenId].listPrice;
        require(msg.value >= price, "Insufficient payment");

        uint256 fee = (price * saleFeeBps) / MAX_BPS;
        uint256 sellerAmount = price - fee;
        _transfer(seller, msg.sender, tokenId);
        if (fee > 0) payable(feeRecipient).transfer(fee);
        claimableEarnings[seller] += sellerAmount;
        if (msg.value > price) payable(msg.sender).transfer(msg.value - price);
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;
        globalStats.totalTransactions++;
        globalStats.totalVolume += price;
        _recordTransaction(seller, tokenId, "sale", sellerAmount);
        _recordTransaction(msg.sender, tokenId, "purchase", price);
        emit NFTSold(tokenId, seller, msg.sender, price);
    }

    function placeBid(uint256 tokenId) external payable nonReentrant validTokenId(tokenId) {
        require(ownerOf(tokenId) != msg.sender, "Cannot bid on your own NFT");
        require(!flaggedNFTs[tokenId], "NFT is flagged");
        require(!flaggedUsers[msg.sender], "User is flagged");
        if (!nftData[tokenId].isListed || nftData[tokenId].listPrice == 0) {
            require(msg.value >= MIN_BID_NON_LISTED, "Min bid is 1 CELO");
        }
        uint256 minIncrement = nftData[tokenId].currentBid / 20; // 5%
        if (minIncrement < 0.01 ether) minIncrement = 0.01 ether;
        require(msg.value >= nftData[tokenId].currentBid + minIncrement, "Bid too low");
        if (msg.value > nftData[tokenId].currentBid) {
            nftData[tokenId].currentBid = msg.value;
            nftData[tokenId].currentBidder = msg.sender;
        }
        if (nftData[tokenId].bidEndTime == 0) {
            nftData[tokenId].bidEndTime = block.timestamp + 7 days;
        }
        bids[tokenId].push(Bid({ bidder: msg.sender, amount: msg.value, timestamp: block.timestamp, accepted: false, cancelled: false }));
        _recordTransaction(msg.sender, tokenId, "bid", msg.value);
        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    function acceptBid(uint256 tokenId, uint256 bidIndex) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(bidIndex < bids[tokenId].length, "Invalid bid index");
        Bid storage bid = bids[tokenId][bidIndex];
        require(!bid.accepted && !bid.cancelled, "Bid already processed");
        require(bid.bidder != address(0), "Invalid bidder");
        bid.accepted = true;
        uint256 fee = (bid.amount * saleFeeBps) / MAX_BPS;
        uint256 sellerAmount = bid.amount - fee;
        _transfer(msg.sender, bid.bidder, tokenId);
        claimableEarnings[msg.sender] += sellerAmount;
        if (fee > 0) payable(feeRecipient).transfer(fee);
        for (uint256 i = 0; i < bids[tokenId].length; i++) {
            if (i != bidIndex && !bids[tokenId][i].accepted && !bids[tokenId][i].cancelled) {
                bids[tokenId][i].cancelled = true;
                payable(bids[tokenId][i].bidder).transfer(bids[tokenId][i].amount);
            }
        }
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;
        nftData[tokenId].isListed = false;
        nftData[tokenId].listPrice = 0;
        _recordTransaction(msg.sender, tokenId, "sale", sellerAmount);
        _recordTransaction(bid.bidder, tokenId, "purchase", bid.amount);
        emit BidAccepted(tokenId, msg.sender, bid.bidder, bid.amount);
    }

    function withdrawBid(uint256 tokenId, uint256 bidIndex) external nonReentrant validTokenId(tokenId) {
        require(bidIndex < bids[tokenId].length, "Invalid bid index");
        Bid storage bid = bids[tokenId][bidIndex];
        require(bid.bidder == msg.sender, "Not your bid");
        require(!bid.accepted && !bid.cancelled, "Bid already processed");
        bid.cancelled = true;
        payable(msg.sender).transfer(bid.amount);
        _recordTransaction(msg.sender, tokenId, "bid_withdraw", bid.amount);
        emit BidCanceled(tokenId, msg.sender, bid.amount, 0);
    }

    function rejectBid(uint256 tokenId) external nonReentrant onlyNFTOwner(tokenId) validTokenId(tokenId) {
        require(bids[tokenId].length > 0, "No bids to reject");
        for (uint256 i = 0; i < bids[tokenId].length; i++) {
            if (!bids[tokenId][i].accepted && !bids[tokenId][i].cancelled) {
                bids[tokenId][i].cancelled = true;
                payable(bids[tokenId][i].bidder).transfer(bids[tokenId][i].amount);
            }
        }
        nftData[tokenId].currentBid = 0;
        nftData[tokenId].currentBidder = address(0);
        nftData[tokenId].bidEndTime = 0;
        emit BidRejected(tokenId, msg.sender, address(0), 0);
    }

    function cancelBid(uint256 tokenId) external nonReentrant validTokenId(tokenId) {
        uint256 bidIndex = 0;
        bool found = false;
        for (uint256 i = bids[tokenId].length; i > 0; i--) {
            if (bids[tokenId][i-1].bidder == msg.sender && !bids[tokenId][i-1].accepted && !bids[tokenId][i-1].cancelled) {
                bidIndex = i-1;
                found = true;
                break;
            }
        }
        require(found, "No active bid found");
        Bid storage bid = bids[tokenId][bidIndex];
        bid.cancelled = true;
        uint256 fee = bid.amount * bidCancelFeeBps / MAX_BPS;
        uint256 refundAmount = bid.amount - fee;
        payable(msg.sender).transfer(refundAmount);
        if (fee > 0) payable(feeRecipient).transfer(fee);
        _recordTransaction(msg.sender, tokenId, "bid_cancel", bid.amount);
        emit BidCanceled(tokenId, msg.sender, bid.amount, fee);
    }

    function claimEarnings() external nonReentrant {
        uint256 amount = claimableEarnings[msg.sender];
        require(amount > 0, "No earnings to claim");
        claimableEarnings[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit EarningsClaimed(msg.sender, amount);
    }

    // Views and helpers
    function totalSupply() external view returns (uint256) { return _tokenIdCounter; }

    function getContractInfo() external view returns (
        string memory version,
        uint256 total,
        uint256 currentMintPriceUSDC,
        uint256 currentLikePriceWei,
        uint256 currentSaleFeeBps,
        address currentFeeRecipient
    ) {
        return (VERSION, _tokenIdCounter, baseMintPriceUSDC, likePrice, saleFeeBps, feeRecipient);
    }

    function setBaseMintPriceUSDC(uint256 newPriceUSDC) external onlyOwner {
        require(newPriceUSDC >= (2 * (10 ** (usdcDecimals - 1))), "Min 0.2 USDC");
        baseMintPriceUSDC = newPriceUSDC;
    }

    function setRarityPriceIncrementUSDC(uint256 newIncrementUSDC) external onlyOwner {
        rarityPriceIncrementUSDC = newIncrementUSDC;
    }

    function setLikePrice(uint256 newPriceWei) external onlyOwner {
        require(newPriceWei > 0, "Price must be > 0");
        likePrice = newPriceWei;
    }

    function setSaleFeeBps(uint256 bps) external onlyOwner { require(bps <= 2000, "Too high"); saleFeeBps = bps; }
    function setBidCancelFeeBps(uint256 bps) external onlyOwner { require(bps <= 1000, "Too high"); bidCancelFeeBps = bps; }
    function setFeeRecipient(address recipient) external onlyOwner { require(recipient != address(0), "Invalid"); feeRecipient = recipient; }

    function _recordTransaction(address user, uint256 tokenId, string memory txType, uint256 amount) internal {
        Transaction[] storage userTxs = userTransactions[user];
        userTxs.push(Transaction({ tokenId: tokenId, from: user, to: address(0), amount: amount, timestamp: block.timestamp, txType: txType }));
        if (userTxs.length > MAX_TRANSACTION_HISTORY) {
            for (uint256 i = 0; i < userTxs.length - 1; i++) { userTxs[i] = userTxs[i + 1]; }
            userTxs.pop();
        }
        emit TransactionRecorded(user, tokenId, txType, amount);
    }

    function _awardPoints(address user, uint256 points, string memory reason) internal {
        // points tracking can be extended
        emit PointsAwarded(user, points, reason);
    }

    function _updateUserCount(address user) internal {
        if (!registeredUsers[user]) { registeredUsers[user] = true; globalStats.totalUsers++; }
    }

    function _updateUserExperience(address /*user*/, uint256 /*xp*/) internal {}

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 temp = _i; uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (_i != 0) { digits -= 1; buffer[digits] = bytes1(uint8(48 + uint256(_i % 10))); _i /= 10; }
        return string(buffer);
    }
}


