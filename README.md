# Unlock - Decentralized Content Platform

A blockchain-based content platform enabling creators to monetize their work through encrypted content and decentralized payments on Polygon Amoy testnet.

## Features

- **Encrypted Content Storage**: AES-256-GCM encryption with IPFS storage via Lighthouse
- **Blockchain Registry**: Smart contract-based content registration on Polygon Amoy
- **Decentralized Payments**: POL (native token) payments for content access
- **Web3 Wallet Integration**: RainbowKit + wagmi for seamless wallet connectivity
- **Modern UI**: Next.js 14 with Tailwind CSS and shadcn/ui components

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Web3**: wagmi + viem + RainbowKit
- **Blockchain**: ethers.js v6
- **Storage**: Lighthouse (IPFS)

### Smart Contracts
- **Language**: Solidity
- **Framework**: Hardhat
- **Network**: Polygon Amoy Testnet
- **Contract**: AccessRegistry.sol

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Polygon Amoy testnet POL (get from [faucet](https://faucet.polygon.technology/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd unlock
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- `NEXT_PUBLIC_PINATA_JWT`: Get from [Pinata](https://pinata.cloud/)
- `NEXT_PUBLIC_LIGHTHOUSE_API_KEY`: Get from [Lighthouse](https://lighthouse.storage/)

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Smart Contract Deployment

The AccessRegistry contract is already deployed on Polygon Amoy testnet.

To deploy your own instance:

```bash
# Compile contracts
npx hardhat compile

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy

# Update .env with new contract address
NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS=<your-contract-address>
```

## Usage

### For Creators

1. **Connect Wallet**: Click "Connect Wallet" and select your Web3 wallet
2. **Upload Content**: 
   - Navigate to `/upload`
   - Fill in content details (title, description, category, price)
   - Select file to upload
   - Click "Upload Content"
   - Approve transaction in wallet
3. **Content is Encrypted**: File is automatically encrypted with AES-256-GCM
4. **Registered On-Chain**: Content metadata is registered on Polygon Amoy blockchain

### For Consumers

1. **Browse Content**: Navigate to `/explore` to see available content
2. **View Details**: Click on content to see full details
3. **Purchase Access**:
   - Click "Pay to Unlock"
   - Approve POL payment in wallet
   - Content is automatically decrypted after payment
4. **Access Content**: Download and view your unlocked content

## Project Structure

```
unlock/
├── contracts/              # Solidity smart contracts
│   └── AccessRegistry.sol  # Main content registry contract
├── src/
│   ├── app/               # Next.js app router pages
│   │   ├── upload/        # Content upload page
│   │   ├── explore/       # Content discovery page
│   │   ├── content/[id]/  # Content detail page
│   │   └── api/           # API routes for key management
│   ├── components/        # React components
│   │   ├── upload/        # Upload form components
│   │   ├── content/       # Content display components
│   │   └── ui/            # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   │   ├── useContentUpload.ts      # Upload logic
│   │   ├── usePolPaymentDirect.ts   # Payment logic
│   │   └── useContentRegistry.ts    # Contract interactions
│   ├── lib/               # Utility libraries
│   │   ├── encryption.ts  # AES-256-GCM encryption
│   │   ├── lighthouse.ts  # IPFS storage via Lighthouse
│   │   └── contracts.ts   # Contract ABIs and addresses
│   └── types/             # TypeScript type definitions
├── scripts/               # Deployment and utility scripts
├── test/                  # Smart contract tests
└── tests/                 # E2E tests (Playwright)
```

## Key Components

### Content Upload Flow

1. **Encryption**: File encrypted with AES-256-GCM (256-bit key, 96-bit IV)
2. **IPFS Upload**: Encrypted content uploaded to IPFS via Lighthouse
3. **Metadata Creation**: JSON metadata with encryption details
4. **Blockchain Registration**: Metadata CID registered on-chain via AccessRegistry contract

### Payment Flow

1. **Price Calculation**: USDC price converted to POL using fixed rate
2. **Transaction**: Direct POL transfer to creator's address
3. **Access Grant**: Backend API grants access after payment confirmation
4. **Decryption**: Consumer receives decryption key to unlock content

## Smart Contract

### AccessRegistry.sol

Main contract for content registration and access control.

**Key Functions:**
- `registerContent(metadataCID, contentCID, priceUSDC)`: Register new content
- `getContent(contentId)`: Retrieve content metadata
- `getContentByCreator(creator)`: Get all content by creator

**Events:**
- `ContentRegistered(contentId, creator, metadataCID, contentCID, priceUSDC, timestamp)`

## Security

- **Encryption**: AES-256-GCM with randomly generated keys
- **Key Storage**: Encryption keys stored securely off-chain
- **Access Control**: Blockchain-verified payment before key release
- **IPFS**: Content stored on decentralized IPFS network

## Testing

### Run Smart Contract Tests
```bash
npx hardhat test
```

### Run E2E Tests
```bash
# Install Playwright browsers
npx playwright install

# Run tests
npm run test:e2e
```

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

### "Internal JSON-RPC error" when making transactions

This error typically occurs due to:
1. **Insufficient POL**: Get testnet POL from [Polygon faucet](https://faucet.polygon.technology/)
2. **Wrong Network**: Ensure MetaMask is on Polygon Amoy (Chain ID: 80002)
3. **RPC Issues**: Try changing MetaMask RPC to `https://rpc-amoy.polygon.technology`
4. **Stuck Transactions**: Reset MetaMask: Settings → Advanced → Clear activity tab data

### Content upload fails

- Check you have testnet POL for gas fees
- Verify Lighthouse API key is valid
- Ensure file size is reasonable (< 100MB recommended)

### Payment not working

- Confirm you're on Polygon Amoy network
- Check POL balance (need ~0.01 POL for gas)
- Verify creator address is valid

## Environment Variables

Required variables in `.env`:

```env
# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract
NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS=0xA8621c45bfe3A4f163b17Ba509735118fbC7610e

# IPFS Storage
NEXT_PUBLIC_PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
PINATA_JWT=your_pinata_jwt

# Lighthouse Storage
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_key

# Blockchain
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
DEPLOYER_PRIVATE_KEY=your_private_key_for_deployment
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions:
- Open a GitHub issue
- Check existing documentation in `/docs`
- Review test files for usage examples
