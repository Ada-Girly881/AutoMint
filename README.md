# AutoMint

**Idle auto-mining dApp on Stellar (Soroban).**  
Deploy NFT bots that accrue `$AMT` tokens 24/7. No tapping. Trade bots on a P2P marketplace. Compete on an on-chain leaderboard.

---

**[Live App](https://auto-mint-theta.vercel.app/)** &nbsp;|&nbsp; **[Demo Video](https://www.loom.com/share/ba6c8e7cd5eb49b0ad46b691d61fdc3b)** &nbsp;|&nbsp; **[Stellar Expert](https://stellar.expert/explorer/testnet)**

---

## Contracts (Testnet)

| Contract    | Address | Explorer |
|-------------|---------|---------|
| AMT Token   | `CDEERRPRAJ4SQEJ47D2KT4W4QO37KLTXP24YIDGH3L2MOAVDDXO334T2` | [View](https://stellar.expert/explorer/testnet/contract/CDEERRPRAJ4SQEJ47D2KT4W4QO37KLTXP24YIDGH3L2MOAVDDXO334T2) |
| Registry    | `CA4ZWH7SRLLY42DCE7DMPMW6BAVJXAJ5E7Q63BZLMIEKVIECIDJSXBI7` | [View](https://stellar.expert/explorer/testnet/contract/CA4ZWH7SRLLY42DCE7DMPMW6BAVJXAJ5E7Q63BZLMIEKVIECIDJSXBI7) |
| Bot NFT     | `CD7BXYZIZZ6AHB6KEXTCBPCAPOETY3HELVZYDAZX5S6OVWEFUE43CI6E` | [View](https://stellar.expert/explorer/testnet/contract/CD7BXYZIZZ6AHB6KEXTCBPCAPOETY3HELVZYDAZX5S6OVWEFUE43CI6E) |
| Accrual     | `CDFUBWJW5QFHNUFGSR4LCDCVNYR3PBF4J4YWEZC56G24ERQGVYBA5BWS` | [View](https://stellar.expert/explorer/testnet/contract/CDFUBWJW5QFHNUFGSR4LCDCVNYR3PBF4J4YWEZC56G24ERQGVYBA5BWS) |
| Marketplace | `CCYTOPEAH322S2XVWWOODYMFUXLHJP4YKLEZ4RXGHDVZNM2BUBBHIRCM` | [View](https://stellar.expert/explorer/testnet/contract/CCYTOPEAH322S2XVWWOODYMFUXLHJP4YKLEZ4RXGHDVZNM2BUBBHIRCM) |

Deployer: `GDQ6QUVINBCLB3ZCA5BHDBI6E7BNJGCIDWX7WPE2F7UYSGD7P5KBPM2F`

---

## How it works

```
Register  ──► registry.register()
          ──► bot_nft.mint_basic()    (free Basic Bot)
          ──► accrual.start_accrual()

Every second (client-side interpolated):
  pending = (now − last_claim_ts) × total_rate / 3600

Claim     ──► accrual.claim()
          ──► registry.add_points()
          ──► token.mint()            if points ≥ 100

Marketplace:
  list    ──► bot_nft.transfer(seller → marketplace)   escrow
  buy     ──► token.transfer(buyer → seller + fee)
          ──► bot_nft.transfer(marketplace → buyer)
```

## Bot Tiers

| Tier    | Price         | Rate       |
|---------|---------------|------------|
| Basic   | Free          | 1 pt/hr    |
| Bronze  | 500 XLM       | 5 pt/hr    |
| Silver  | 2,000 XLM     | 25 pt/hr   |
| Gold    | 7,500 XLM     | 100 pt/hr  |
| Diamond | 25,000 XLM    | 500 pt/hr  |

100 points = 1 `$AMT` on claim. Marketplace fee: 2.5%.

---

## Local Setup

```bash
# 1. Install Rust + Stellar CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none
cargo install --locked stellar-cli --features opt

# 2. Run frontend (already wired to testnet contracts)
cd frontend
npm install
npm run dev   # http://localhost:3000
```

Install [Freighter](https://freighter.app) wallet. Switch it to **Testnet**.

## Deploy contracts yourself

```bash
# Generate + fund a deployer key
stellar keys generate mykey --network testnet
curl "https://friendbot.stellar.org/?addr=$(stellar keys address mykey)"

# Build + deploy all contracts + write .env.local
./scripts/deploy.sh testnet mykey
```

## Tests

```bash
# Contracts (Rust) — 40 tests across 5 contracts
cargo test --workspace

# Frontend (Jest + RTL)
cd frontend && npm test
```

## CI/CD

GitHub Actions on every push:
1. `cargo test --workspace` + WASM build
2. Frontend lint → type-check → Jest → `next build`
3. Vercel production deploy on `main`

Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` in repo secrets.

## Stack

- **Contracts** — Rust, Soroban SDK 21, `wasm32v1-none` target
- **Frontend** — Next.js 14, Tailwind, Zustand, React Query, Framer Motion
- **Wallet** — Freighter (Stellar browser extension), `@stellar/freighter-api` v3
- **Network** — Stellar Testnet, Soroban RPC
