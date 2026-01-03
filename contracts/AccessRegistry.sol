// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AccessRegistry
 * @notice Single source of truth for content registration, pricing, and access proofs
 * @dev Manages content registration, access control, and payment verification for decentralized content platform
 */
contract AccessRegistry is Ownable {
    // ============ Structs ============
    struct ContentInfo {
        address creator;
        string metadataCID;
        string contentCID;
        uint256 priceUSDC;
        uint256 createdAt;
        bool active;
    }

    struct AccessProof {
        bytes32 paymentTxHash;
        uint256 grantedAt;
        uint256 expiryTimestamp;
    }

    // ============ State ============
    mapping(bytes32 => ContentInfo) public contents;
    mapping(bytes32 => mapping(address => AccessProof)) public accessProofs;
    mapping(address => bytes32[]) public creatorContents;

    address public facilitator; // Authorized to call grantAccess

    // ============ Events ============
    event ContentRegistered(
        bytes32 indexed contentId,
        address indexed creator,
        string metadataCID,
        uint256 priceUSDC
    );

    event AccessGranted(
        bytes32 indexed contentId,
        address indexed consumer,
        bytes32 paymentTxHash,
        uint256 expiryTimestamp
    );

    event PriceUpdated(
        bytes32 indexed contentId,
        uint256 oldPrice,
        uint256 newPrice
    );


    // ============ Modifiers ============
    modifier onlyCreator(bytes32 contentId) {
        require(contents[contentId].creator == msg.sender, "Not creator");
        _;
    }

    modifier onlyFacilitator() {
        require(msg.sender == facilitator || msg.sender == owner(), "Not authorized");
        _;
    }

    // ============ Constructor ============
    constructor(address _facilitator) Ownable(msg.sender) {
        facilitator = _facilitator;
    }

    // ============ Content Management ============
    /**
     * @notice Register new content on the platform
     * @param metadataCID IPFS CID of the metadata JSON
     * @param contentCID IPFS CID of the encrypted content
     * @param priceUSDC Price in USDC (6 decimals)
     * @return contentId Unique identifier for the content
     */
    function registerContent(
        string calldata metadataCID,
        string calldata contentCID,
        uint256 priceUSDC
    ) external returns (bytes32 contentId) {
        // Generate unique content ID from CIDs
        contentId = keccak256(abi.encodePacked(metadataCID, contentCID, msg.sender, block.timestamp));

        contents[contentId] = ContentInfo({
            creator: msg.sender,
            metadataCID: metadataCID,
            contentCID: contentCID,
            priceUSDC: priceUSDC,
            createdAt: block.timestamp,
            active: true
        });

        creatorContents[msg.sender].push(contentId);

        emit ContentRegistered(contentId, msg.sender, metadataCID, priceUSDC);
    }

    /**
     * @notice Update the price of existing content
     * @param contentId The content to update
     * @param newPriceUSDC New price in USDC (6 decimals)
     */
    function updatePrice(bytes32 contentId, uint256 newPriceUSDC) external onlyCreator(contentId) {
        uint256 oldPrice = contents[contentId].priceUSDC;
        contents[contentId].priceUSDC = newPriceUSDC;
        emit PriceUpdated(contentId, oldPrice, newPriceUSDC);
    }


    // ============ Access Management ============
    /**
     * @notice Grant access to content after payment verification
     * @param contentId The content to grant access to
     * @param consumer The address receiving access
     * @param paymentTxHash Transaction hash of the payment
     * @param expiryTimestamp When access expires (0 for permanent)
     */
    function grantAccess(
        bytes32 contentId,
        address consumer,
        bytes32 paymentTxHash,
        uint256 expiryTimestamp
    ) external onlyFacilitator {
        require(contents[contentId].active, "Content not found");

        accessProofs[contentId][consumer] = AccessProof({
            paymentTxHash: paymentTxHash,
            grantedAt: block.timestamp,
            expiryTimestamp: expiryTimestamp
        });

        emit AccessGranted(contentId, consumer, paymentTxHash, expiryTimestamp);
    }

    // ============ Queries ============
    /**
     * @notice Get content information by ID
     * @param contentId The content to query
     * @return ContentInfo struct with all content details
     */
    function getContent(bytes32 contentId) external view returns (ContentInfo memory) {
        return contents[contentId];
    }

    /**
     * @notice Check if a consumer has valid access to content
     * @param contentId The content to check
     * @param consumer The address to check access for
     * @return bool True if consumer has valid access
     */
    function hasAccess(bytes32 contentId, address consumer) external view returns (bool) {
        AccessProof memory proof = accessProofs[contentId][consumer];
        if (proof.grantedAt == 0) return false;
        if (proof.expiryTimestamp != 0 && block.timestamp > proof.expiryTimestamp) return false;
        return true;
    }

    /**
     * @notice Get all content IDs created by a specific creator
     * @param creator The creator address
     * @return bytes32[] Array of content IDs
     */
    function getCreatorContents(address creator) external view returns (bytes32[] memory) {
        return creatorContents[creator];
    }

    /**
     * @notice Get access proof details for a consumer
     * @param contentId The content ID
     * @param consumer The consumer address
     * @return AccessProof struct with access details
     */
    function getAccessProof(bytes32 contentId, address consumer) external view returns (AccessProof memory) {
        return accessProofs[contentId][consumer];
    }

    // ============ Admin ============
    /**
     * @notice Update the facilitator address
     * @param _facilitator New facilitator address
     */
    function setFacilitator(address _facilitator) external onlyOwner {
        facilitator = _facilitator;
    }
}
