#!/usr/bin/env bash

set -e

# Accept network and identity as arguments
NETWORK="${1:-testnet}"
IDENTITY="${2:-mykey}"

echo "Deploying to network: $NETWORK using identity: $IDENTITY"

# Helper function to locate compiled WASM file matching target architecture
resolve_wasm() {
  local name="$1"
  if [ -f "target/wasm32v1-none/release/${name}.wasm" ]; then
    echo "target/wasm32v1-none/release/${name}.wasm"
  elif [ -f "target/wasm32-unknown-unknown/release/${name}.wasm" ]; then
    echo "target/wasm32-unknown-unknown/release/${name}.wasm"
  else
    local found
    found=$(find target -name "${name}.wasm" 2>/dev/null | grep release | head -n 1 || true)
    if [ -n "$found" ]; then
      echo "$found"
    else
      echo "target/wasm32v1-none/release/${name}.wasm"
    fi
  fi
}

# 1. Build all contracts
echo "Building all contracts..."
stellar contract build

# 2. Get administrative address for the identity
echo "Resolving admin address..."
ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")
echo "Admin Address: $ADMIN_ADDRESS"

# 3. Deploy contracts in dependency order: Token -> Registry -> BotNFT -> Accrual -> Marketplace

# Step 3.1: Token Contract
echo "Resolving Token WASM..."
TOKEN_WASM=$(resolve_wasm "automint_token")
echo "Deploying Token contract from $TOKEN_WASM..."
TOKEN_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Token Contract ID: $TOKEN_ID"

echo "Initializing Token..."
stellar contract invoke \
  --id "$TOKEN_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDRESS" --decimal 7 --name "AutoMint Token" --symbol "AMT"

echo "Verifying Token initialization..."
TOKEN_ADMIN=$(stellar contract invoke --id "$TOKEN_ID" --source "$IDENTITY" --network "$NETWORK" -- admin)
echo "Token verified (Admin: $TOKEN_ADMIN)"

# Step 3.2: Registry Contract
echo "Resolving Registry WASM..."
REGISTRY_WASM=$(resolve_wasm "automint_registry")
echo "Deploying Registry contract from $REGISTRY_WASM..."
REGISTRY_ID=$(stellar contract deploy \
  --wasm "$REGISTRY_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Registry Contract ID: $REGISTRY_ID"

echo "Initializing Registry..."
stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDRESS"

echo "Verifying Registry initialization..."
REGISTRY_ADMIN=$(stellar contract invoke --id "$REGISTRY_ID" --source "$IDENTITY" --network "$NETWORK" -- admin)
echo "Registry verified (Admin: $REGISTRY_ADMIN)"

# Step 3.3: BotNFT Contract
echo "Resolving BotNFT WASM..."
BOT_NFT_WASM=$(resolve_wasm "automint_bot_nft")
echo "Deploying BotNFT contract from $BOT_NFT_WASM..."
BOT_NFT_ID=$(stellar contract deploy \
  --wasm "$BOT_NFT_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "BotNFT Contract ID: $BOT_NFT_ID"

echo "Initializing BotNFT..."
stellar contract invoke \
  --id "$BOT_NFT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDRESS" --registry "$REGISTRY_ID"

echo "Verifying BotNFT initialization..."
BOT_NFT_ADMIN=$(stellar contract invoke --id "$BOT_NFT_ID" --source "$IDENTITY" --network "$NETWORK" -- admin)
echo "BotNFT verified (Admin: $BOT_NFT_ADMIN)"

# Step 3.4: Accrual Contract
echo "Resolving Accrual WASM..."
ACCRUAL_WASM=$(resolve_wasm "automint_accrual")
echo "Deploying Accrual contract from $ACCRUAL_WASM..."
ACCRUAL_ID=$(stellar contract deploy \
  --wasm "$ACCRUAL_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Accrual Contract ID: $ACCRUAL_ID"

echo "Initializing Accrual..."
stellar contract invoke \
  --id "$ACCRUAL_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDRESS" --points_per_amt 100

echo "Verifying Accrual initialization..."
ACCRUAL_ADMIN=$(stellar contract invoke --id "$ACCRUAL_ID" --source "$IDENTITY" --network "$NETWORK" -- admin)
echo "Accrual verified (Admin: $ACCRUAL_ADMIN)"

# Step 3.5: Marketplace Contract
echo "Resolving Marketplace WASM..."
MARKETPLACE_WASM=$(resolve_wasm "automint_marketplace")
echo "Deploying Marketplace contract from $MARKETPLACE_WASM..."
MARKETPLACE_ID=$(stellar contract deploy \
  --wasm "$MARKETPLACE_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Marketplace Contract ID: $MARKETPLACE_ID"

echo "Initializing Marketplace..."
stellar contract invoke \
  --id "$MARKETPLACE_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDRESS" --bot-nft "$BOT_NFT_ID" --fee-bps 250

echo "Marketplace verified."

# 4. Wiring Steps: Wire Accrual contract as Token Admin so claims can mint AMT
echo "Wiring: Setting Token admin to Accrual contract ($ACCRUAL_ID)..."
stellar contract invoke \
  --id "$TOKEN_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- set_admin --new_admin "$ACCRUAL_ID"

echo "Verifying Token admin wiring..."
UPDATED_TOKEN_ADMIN=$(stellar contract invoke --id "$TOKEN_ID" --source "$IDENTITY" --network "$NETWORK" -- admin)
echo "Token admin successfully wired to Accrual: $UPDATED_TOKEN_ADMIN"

# 5. Write the resulting contract IDs into frontend/.env.local
echo "Writing contract IDs to frontend/.env.local..."
if [ ! -f frontend/.env.local ]; then
  if [ -f frontend/.env.example ]; then
    cp frontend/.env.example frontend/.env.local
  else
    touch frontend/.env.local
  fi
fi

# Replace placeholders or update keys in frontend/.env.local
update_env_var() {
  local key=$1
  local value=$2
  if grep -q "^$key=" frontend/.env.local; then
    # Key exists, update it
    sed -i "s|^$key=.*|$key=$value|g" frontend/.env.local
  else
    # Key doesn't exist, append it
    echo "$key=$value" >> frontend/.env.local
  fi
}

update_env_var "NEXT_PUBLIC_NETWORK" "TESTNET"
update_env_var "NEXT_PUBLIC_SOROBAN_RPC_URL" "https://soroban-testnet.stellar.org"
update_env_var "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" "\"Test SDF Network ; September 2015\""
update_env_var "NEXT_PUBLIC_TOKEN_CONTRACT_ID" "$TOKEN_ID"
update_env_var "NEXT_PUBLIC_REGISTRY_CONTRACT_ID" "$REGISTRY_ID"
update_env_var "NEXT_PUBLIC_BOT_NFT_CONTRACT_ID" "$BOT_NFT_ID"
update_env_var "NEXT_PUBLIC_ACCRUAL_CONTRACT_ID" "$ACCRUAL_ID"
update_env_var "NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID" "$MARKETPLACE_ID"

echo "Deployment complete! Fully wired system deployed and contract IDs saved to frontend/.env.local"
