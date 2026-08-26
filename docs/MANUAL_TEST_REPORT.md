# AutoMint Testnet Manual Test Report

Target branch: `testnet-implementation`

This report captures the end-to-end manual verification steps for the core AutoMint testnet flows. Record the wallet address, transaction hashes, observed balances, and screenshots in the PR that updates this file.

## Environment

- Network: Stellar testnet
- Frontend URL: `<deployed testnet frontend URL>`
- Wallet: `<wallet name and public key>`
- Registry contract: `<contract ID>`
- Bot NFT contract: `<contract ID>`
- Accrual contract: `<contract ID>`
- Marketplace contract: `<contract ID>`
- AMT token contract: `<contract ID>`

## Registration

Issue: #206

1. Open the testnet frontend and connect the test wallet.
2. Register a unique username.
3. Confirm the registration transaction succeeds.
4. Open the dashboard or profile page.
5. Verify a free Basic Bot appears in the user's bot inventory.
6. Verify the accrual timer or pending-points display starts from the registration timestamp.

Expected result:

- The wallet is marked registered.
- The username is shown for the connected account.
- A Basic Bot is visible in the user's owned bots.
- Accrual begins without requiring a paid bot purchase.

Evidence to attach:

- Registration transaction hash
- Screenshot of registered profile/dashboard
- Screenshot or log showing Basic Bot ownership
- Screenshot or log showing accrual state

## Claim

Issue: #207

1. Use a registered account with active accrual.
2. Wait long enough for points to accrue.
3. Record the current AMT token balance and pending points.
4. Trigger the claim action.
5. Confirm the claim transaction succeeds.
6. Refresh dashboard/account state.
7. Verify the AMT balance increases when the claim crosses the mint threshold.
8. Verify pending points reset or carry only the expected remainder.

Expected result:

- Claim succeeds for a registered user with accrued points.
- Registry points are updated.
- AMT balance increases when claimable points meet the configured conversion threshold.
- Accrual timestamp resets after claim.

Evidence to attach:

- Claim transaction hash
- AMT balance before and after
- Pending points before and after
- Screenshot of success state

## Mint Tier Bot

Issue: #208

1. Open the marketplace page as a registered user.
2. Choose a paid tier: Bronze, Silver, Gold, or Diamond.
3. Record the user's current bot inventory and total accrual rate.
4. Buy the selected tier bot.
5. Confirm the purchase/mint transaction succeeds.
6. Open "My Bots".
7. Verify the purchased bot appears with the correct tier.
8. Verify total accrual rate increases by the selected tier's configured rate.

Expected result:

- Purchase transaction succeeds.
- The selected tier bot appears under "My Bots".
- The user's total rate reflects Basic Bot plus the new tier rate.
- Marketplace purchase state does not leave a duplicate pending item.

Evidence to attach:

- Purchase transaction hash
- Selected tier and price
- Bot inventory before and after
- Total accrual rate before and after

## List Bot For Sale

Issue: #209

1. Open "My Bots" as a registered user who owns a non-basic bot.
2. Select an owned bot and enter a non-zero sale price.
3. Submit the listing.
4. Confirm the list transaction succeeds.
5. Open "My Listings".
6. Verify the listed bot appears with the expected price and active status.
7. Verify the bot is escrowed by checking it can no longer be listed again by the seller while active.
8. Open the marketplace page from another session or refresh and verify the listing is visible.

Expected result:

- Listing transaction succeeds.
- The selected bot is escrowed by the marketplace.
- "My Listings" shows exactly one active listing for the bot.
- Public marketplace inventory includes the listing.

Evidence to attach:

- Listing transaction hash
- Bot ID, tier, and price
- Screenshot of "My Listings"
- Screenshot or contract read proving escrow/active listing state

## Execution Notes

- Local automated execution was not performed in this environment because no funded testnet wallet, deployed frontend URL, or deployed contract IDs were available.
- The checklist above defines the required manual evidence for the PR and should be completed during testnet verification.
