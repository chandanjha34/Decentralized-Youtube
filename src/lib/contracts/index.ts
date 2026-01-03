// Contract exports for frontend integration
import addressesJson from "./addresses.json";

export const ACCESS_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS || addressesJson.AccessRegistry) as `0x${string}`;

// Deployment block for efficient event queries (avoids scanning from genesis)
export const CONTRACT_DEPLOYMENT_BLOCK = BigInt(addressesJson.deploymentBlock || 18000000);

// Types for contract interactions
export interface ContentInfo {
  creator: `0x${string}`;
  metadataCID: string;
  contentCID: string;
  priceUSDC: bigint;
  createdAt: bigint;
  active: boolean;
}

export interface AccessProof {
  paymentTxHash: `0x${string}`;
  grantedAt: bigint;
  expiryTimestamp: bigint;
}

// ABI for AccessRegistry contract
export const accessRegistryAbi = [
  {
    inputs: [{ internalType: "address", name: "_facilitator", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "contentId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "consumer", type: "address" },
      { indexed: false, internalType: "bytes32", name: "paymentTxHash", type: "bytes32" },
      { indexed: false, internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
    ],
    name: "AccessGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "contentId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "string", name: "metadataCID", type: "string" },
      { indexed: false, internalType: "uint256", name: "priceUSDC", type: "uint256" },
    ],
    name: "ContentRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "contentId", type: "bytes32" },
      { indexed: false, internalType: "uint256", name: "oldPrice", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newPrice", type: "uint256" },
    ],
    name: "PriceUpdated",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "", type: "bytes32" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "accessProofs",
    outputs: [
      { internalType: "bytes32", name: "paymentTxHash", type: "bytes32" },
      { internalType: "uint256", name: "grantedAt", type: "uint256" },
      { internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "contents",
    outputs: [
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "string", name: "metadataCID", type: "string" },
      { internalType: "string", name: "contentCID", type: "string" },
      { internalType: "uint256", name: "priceUSDC", type: "uint256" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
      { internalType: "bool", name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "creatorContents",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "facilitator",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "contentId", type: "bytes32" },
      { internalType: "address", name: "consumer", type: "address" },
    ],
    name: "getAccessProof",
    outputs: [
      {
        components: [
          { internalType: "bytes32", name: "paymentTxHash", type: "bytes32" },
          { internalType: "uint256", name: "grantedAt", type: "uint256" },
          { internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
        ],
        internalType: "struct AccessRegistry.AccessProof",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "contentId", type: "bytes32" }],
    name: "getContent",
    outputs: [
      {
        components: [
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "string", name: "metadataCID", type: "string" },
          { internalType: "string", name: "contentCID", type: "string" },
          { internalType: "uint256", name: "priceUSDC", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "bool", name: "active", type: "bool" },
        ],
        internalType: "struct AccessRegistry.ContentInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "creator", type: "address" }],
    name: "getCreatorContents",
    outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "contentId", type: "bytes32" },
      { internalType: "address", name: "consumer", type: "address" },
      { internalType: "bytes32", name: "paymentTxHash", type: "bytes32" },
      { internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
    ],
    name: "grantAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "contentId", type: "bytes32" },
      { internalType: "address", name: "consumer", type: "address" },
    ],
    name: "hasAccess",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "metadataCID", type: "string" },
      { internalType: "string", name: "contentCID", type: "string" },
      { internalType: "uint256", name: "priceUSDC", type: "uint256" },
    ],
    name: "registerContent",
    outputs: [{ internalType: "bytes32", name: "contentId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_facilitator", type: "address" }],
    name: "setFacilitator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "contentId", type: "bytes32" },
      { internalType: "uint256", name: "newPriceUSDC", type: "uint256" },
    ],
    name: "updatePrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
