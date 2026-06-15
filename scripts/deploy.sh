#!/usr/bin/env bash
# Usage: ./scripts/deploy.sh [testnet|mainnet] [key-alias]
# Default key alias: deployer  (stellar keys generate deployer --network testnet)
set -euo pipefail

NETWORK="${1:-testnet}"
KEY="${2:-deployer}"

if [[ "$NETWORK" == "testnet" ]]; then
  RPC_URL="https://soroban-testnet.stellar.org"
  PASSPHRASE="Test SDF Network ; September 2015"
else
  RPC_URL="https://soroban-rpc.stellar.org"
  PASSPHRASE="Public Global Stellar Network ; September 2015"
fi

ADMIN=$(stellar keys address "$KEY")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " AutoMint Deploy  |  $NETWORK"
echo " Admin: $ADMIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# build (stellar contract build uses wasm32v1-none which the Soroban VM requires)
echo "Building WASM..."
stellar contract build --quiet 2>/dev/null || stellar contract build
WASM="target/wasm32v1-none/release"

_deploy() {
  stellar contract deploy \
    --wasm "$WASM/$1.wasm" \
    --source "$KEY" \
    --network "$NETWORK"
}

_invoke() {
  local id="$1"; shift
  stellar contract invoke \
    --id "$id" \
    --source "$KEY" \
    --network "$NETWORK" \
    -- "$@"
}

# deploy
echo "Deploying..."
TOKEN_ID=$(_deploy automint_token)
REGISTRY_ID=$(_deploy automint_registry)
BOT_NFT_ID=$(_deploy automint_bot_nft)
ACCRUAL_ID=$(_deploy automint_accrual)
MARKETPLACE_ID=$(_deploy automint_marketplace)

# initialize — order matters: token before accrual, accrual before set_admin
_invoke "$TOKEN_ID" initialize --admin "$ADMIN" --decimal 7 --name "AutoMint Token" --symbol "AMT"
_invoke "$REGISTRY_ID" initialize --admin "$ADMIN"
_invoke "$BOT_NFT_ID" initialize --admin "$ADMIN"
_invoke "$ACCRUAL_ID" initialize --admin "$ADMIN" --registry "$REGISTRY_ID" --bot_nft "$BOT_NFT_ID" --token "$TOKEN_ID"
_invoke "$MARKETPLACE_ID" initialize --admin "$ADMIN" --bot_nft "$BOT_NFT_ID" --fee_recipient "$ADMIN"
# hand token admin to accrual so it can mint $AMT on claim
_invoke "$TOKEN_ID" set_admin --new_admin "$ACCRUAL_ID"

# write frontend env
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_NETWORK=$NETWORK
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_NETWORK_PASSPHRASE=$PASSPHRASE
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$REGISTRY_ID
NEXT_PUBLIC_BOT_NFT_CONTRACT_ID=$BOT_NFT_ID
NEXT_PUBLIC_ACCRUAL_CONTRACT_ID=$ACCRUAL_ID
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID=$MARKETPLACE_ID
NEXT_PUBLIC_TOKEN_CONTRACT_ID=$TOKEN_ID
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Deployed on $NETWORK"
echo " Token      : $TOKEN_ID"
echo " Registry   : $REGISTRY_ID"
echo " Bot NFT    : $BOT_NFT_ID"
echo " Accrual    : $ACCRUAL_ID"
echo " Marketplace: $MARKETPLACE_ID"
echo " .env.local written"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
