# AutoMint Frontend & Deployment Documentation

This document describes how to deploy the AutoMint Next.js frontend, configure environment variables, deploy via Vercel or Docker, and run preview environments in CI.

---

## Required Environment Variables

All environment variables used by the frontend are prefixed with `NEXT_PUBLIC_` so Next.js can inline them at build time.

| Variable Name | Required | Default / Example Value | Description |
|---|---|---|---|
| `NEXT_PUBLIC_NETWORK` | Yes | `TESTNET` | Network environment label (e.g. `TESTNET` or `MAINNET`). |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Yes | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint used for simulation & transaction submission. |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | Yes | `"Test SDF Network ; September 2015"` | Network passphrase used when signing transactions. |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | Yes | `C...01` | Deployed Registry contract ID for user profiles and leaderboards. |
| `NEXT_PUBLIC_BOT_NFT_CONTRACT_ID` | Yes | `C...02` | Deployed BotNFT contract ID for bot minting and ownership tracking. |
| `NEXT_PUBLIC_ACCRUAL_CONTRACT_ID` | Yes | `C...03` | Deployed Accrual contract ID for point accrual math and claims. |
| `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID` | Yes | `C...04` | Deployed Marketplace contract ID for bot NFT escrow and sales. |
| `NEXT_PUBLIC_TOKEN_CONTRACT_ID` | Yes | `C...05` | Deployed Token contract ID for in-app $AMT reward assets. |
| `NEXT_PUBLIC_HORIZON_URL` | Yes | `https://horizon-testnet.stellar.org` | Horizon RPC URL for account balance queries. |
| `NEXT_PUBLIC_TX_TIMEOUT` | No | `30` | Transaction submission timeout (in seconds). |
| `NEXT_PUBLIC_BASE_FEE` | No | `100` | Base fee in stroops for transactions. |
| `NEXT_PUBLIC_POINTS_PER_AMT` | No | `1000` | Points required per 1 `$AMT` token minted. |
| `NEXT_PUBLIC_LEADERBOARD_LIMIT` | No | `50` | Default record limit for leaderboard queries. |

---

## How to Get Testnet Contract IDs

To obtain fresh, functional contract IDs on Stellar Testnet:

1. Generate a testnet identity and fund it via Friendbot:
   ```bash
   stellar keys generate mykey --network testnet
   curl "https://friendbot.stellar.org/?addr=$(stellar keys address mykey)"
   ```

2. Run the automated contract deployment & initialization script:
   ```bash
   ./scripts/deploy.sh testnet mykey
   ```

3. The script compiles all 5 smart contracts (`registry`, `bot_nft`, `accrual`, `marketplace`, `token`), deploys them to Testnet, invokes their `initialize` functions, and populates `frontend/.env.local` automatically.

---

## Hosting Options

### 1. Vercel Deployment

The application includes a `frontend/vercel.json` configuration file ready for Vercel integration.

- **Root Directory**: Set root directory to `frontend` in Vercel project settings.
- **Framework Preset**: Next.js.
- **Environment Variables**: Add all `NEXT_PUBLIC_*` contract IDs and RPC endpoints in the Vercel Dashboard project settings.

### 2. Docker & Containerized Deployment

A multi-stage `Dockerfile` is provided in `frontend/Dockerfile`.

Build and run locally:
```bash
cd frontend
docker build -t automint-frontend .
docker run -p 3000:3000 automint-frontend
```

Run using Docker Compose from the project root:
```bash
docker-compose up --build
```

---

## CI Preview Deployments

Every Pull Request targeting `main` automatically triggers `.github/workflows/preview-deployment.yml`.

- Injects contract IDs into the Next.js build environment.
- Executes a clean production build (`npm run build`).
- Comments the build status and deployment preview confirmation directly on the PR.
