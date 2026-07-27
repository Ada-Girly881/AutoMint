#![cfg(test)]
use super::*;
use automint_bot_nft::{BotNFTContract, BotNFTContractClient};
use automint_registry::{RegistryContract, RegistryContractClient};
use automint_token::{AMTToken, AMTTokenClient};
use soroban_sdk::{testutils::Address as _, Env, String};

struct Harness<'a> {
    env: Env,
    admin: Address,
    bot: BotNFTContractClient<'a>,
    token: AMTTokenClient<'a>,
    mkt: MarketplaceContractClient<'a>,
}

fn setup() -> Harness<'static> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);

    let registry_id = env.register_contract(None, RegistryContract);
    let registry = RegistryContractClient::new(&env, &registry_id);
    registry.initialize(&admin);

    let bot_id = env.register_contract(None, BotNFTContract);
    let bot = BotNFTContractClient::new(&env, &bot_id);
    bot.initialize(&admin, &registry_id);

    let token_id = env.register_contract(None, AMTToken);
    let token = AMTTokenClient::new(&env, &token_id);
    token.initialize(
        &admin,
        &7u32,
        &String::from_str(&env, "AutoMint Token"),
        &String::from_str(&env, "AMT"),
    );

    let mkt_id = env.register_contract(None, MarketplaceContract);
    let mkt = MarketplaceContractClient::new(&env, &mkt_id);
    mkt.initialize(&admin, &bot_id, &250u32);

    Harness {
        env,
        admin,
        bot,
        token,
        mkt,
    }
}

#[test]
fn test_list_bot_escrows_and_returns_id() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);

    assert_eq!(h.bot.get_user_bots(&seller).len(), 1);

    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &50_0000000_i128, &h.token.address);
    assert_eq!(listing_id, 1);

    // The bot is escrowed into the marketplace contract.
    let bot = h.bot.get_bot(&bot_id);
    assert_eq!(bot.owner, h.mkt.address);
    assert_eq!(h.bot.get_user_bots(&seller).len(), 0);

    // The listing is recorded with the supplied price and currency.
    let listing = h.mkt.get_listing(&listing_id);
    assert_eq!(listing.seller, seller);
    assert_eq!(listing.bot_id, bot_id);
    assert_eq!(listing.price, 50_0000000_i128);
    assert_eq!(listing.currency, h.token.address);
    assert!(listing.active);
}

#[test]
fn test_list_bot_ids_are_sequential() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let id1 = h.bot.mint_basic(&seller);
    let id2 = h.bot.mint_basic(&seller);

    let l1 = h
        .mkt
        .list_bot(&seller, &id1, &10_0000000_i128, &h.token.address);
    let l2 = h
        .mkt
        .list_bot(&seller, &id2, &20_0000000_i128, &h.token.address);
    assert_eq!(l1, 1);
    assert_eq!(l2, 2);

    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 2);
    assert_eq!(h.mkt.get_user_listings(&seller).len(), 2);
}

#[test]
fn test_list_bot_zero_price_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    assert_eq!(
        h.mkt
            .try_list_bot(&seller, &bot_id, &0_i128, &h.token.address),
        Err(Ok(MarketplaceError::InvalidPrice))
    );
    // The bot is NOT escrowed when listing fails.
    assert_eq!(h.bot.get_user_bots(&seller).len(), 1);
}

#[test]
fn test_list_bot_negative_price_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    assert_eq!(
        h.mkt
            .try_list_bot(&seller, &bot_id, &-1_i128, &h.token.address),
        Err(Ok(MarketplaceError::InvalidPrice))
    );
}

#[test]
fn test_list_nonexistent_bot_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    assert_eq!(
        h.mkt
            .try_list_bot(&seller, &999_u64, &10_0000000_i128, &h.token.address),
        Err(Ok(MarketplaceError::BotTransferFailed))
    );
}

#[test]
fn test_list_bot_not_owned_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let stranger = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);

    // `stranger` does not own the bot, so the escrow transfer must fail.
    assert_eq!(
        h.mkt
            .try_list_bot(&stranger, &bot_id, &10_0000000_i128, &h.token.address),
        Err(Ok(MarketplaceError::BotTransferFailed))
    );
    // Ownership is unchanged.
    assert_eq!(h.bot.get_bot(&bot_id).owner, seller);
}

#[test]
fn test_get_listing_not_found() {
    let h = setup();
    assert_eq!(
        h.mkt.try_get_listing(&404_u64),
        Err(Ok(MarketplaceError::ListingNotFound))
    );
}

#[test]
fn test_double_initialize_fails() {
    let h = setup();
    assert_eq!(
        h.mkt.try_initialize(&h.admin, &h.bot.address, &250u32),
        Err(Ok(MarketplaceError::AlreadyInitialized))
    );
}

#[test]
fn test_config_returns_admin_and_bot_nft() {
    let h = setup();
    let config = h.mkt.config();
    assert_eq!(config.admin, h.admin);
    assert_eq!(config.bot_nft, h.bot.address);
    assert_eq!(config.fee_bps, 250u32);
}

#[test]
fn test_active_listings_empty_initially() {
    let h = setup();
    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 0);
}

#[test]
fn test_buy_bot_pays_seller_minus_fee_and_transfers_bot() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let buyer = Address::generate(&h.env);
    let price = 1000_0000000_i128;

    // Fund buyer
    h.token.mint(&buyer, &price);

    let bot_id = h.bot.mint_basic(&seller);
    let listing_id = h.mkt.list_bot(&seller, &bot_id, &price, &h.token.address);

    let seller_balance_before = h.token.balance(&seller);
    let admin_balance_before = h.token.balance(&h.admin);

    h.mkt.buy_bot(&buyer, &listing_id);

    // 2.5% fee = 25_0000000, seller gets 975_0000000
    let fee = price * 25 / 1000;
    assert_eq!(h.token.balance(&seller), seller_balance_before + price - fee);
    assert_eq!(h.token.balance(&h.admin), admin_balance_before + fee);
    assert_eq!(h.token.balance(&buyer), 0);

    // Bot transferred to buyer
    assert_eq!(h.bot.get_bot(&bot_id).owner, buyer);
    assert_eq!(h.bot.get_user_bots(&buyer).len(), 1);

    // Listing is now inactive
    let listing = h.mkt.get_listing(&listing_id);
    assert!(!listing.active);
    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 0);
}

#[test]
fn test_cancel_listing_returns_bot_to_seller() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &100_0000000_i128, &h.token.address);

    // Bot is escrowed
    assert_eq!(h.bot.get_bot(&bot_id).owner, h.mkt.address);

    h.mkt.cancel_listing(&seller, &listing_id);

    // Bot returned to seller
    assert_eq!(h.bot.get_bot(&bot_id).owner, seller);
    assert_eq!(h.bot.get_user_bots(&seller).len(), 1);

    // Listing is inactive and removed from active list
    let listing = h.mkt.get_listing(&listing_id);
    assert!(!listing.active);
    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 0);
}

#[test]
fn test_buy_inactive_listing_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let buyer = Address::generate(&h.env);
    let price = 100_0000000_i128;

    h.token.mint(&buyer, &(price * 2));
    let bot_id = h.bot.mint_basic(&seller);
    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &price, &h.token.address);

    // Cancel the listing first
    h.mkt.cancel_listing(&seller, &listing_id);

    // Buying a cancelled listing must fail
    assert_eq!(
        h.mkt.try_buy_bot(&buyer, &listing_id),
        Err(Ok(MarketplaceError::ListingNotActive))
    );
}

#[test]
fn test_cancel_already_cancelled_listing_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &50_0000000_i128, &h.token.address);

    h.mkt.cancel_listing(&seller, &listing_id);

    assert_eq!(
        h.mkt.try_cancel_listing(&seller, &listing_id),
        Err(Ok(MarketplaceError::ListingNotActive))
    );
}

#[test]
fn test_cancel_listing_not_found() {
    let h = setup();
    let seller = Address::generate(&h.env);
    assert_eq!(
        h.mkt.try_cancel_listing(&seller, &404_u64),
        Err(Ok(MarketplaceError::ListingNotFound))
    );
}

#[test]
fn test_cancel_listing_by_non_seller_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let stranger = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &50_0000000_i128, &h.token.address);

    assert_eq!(
        h.mkt.try_cancel_listing(&stranger, &listing_id),
        Err(Ok(MarketplaceError::Unauthorized))
    );
    // Listing still active
    assert!(h.mkt.get_listing(&listing_id).active);
}

// ── get_active_listings edge cases (#120) ───────────────────────────────────

// #120: limit == 0 returns an empty vec (a request for zero items), never a panic
#[test]
fn test_get_active_listings_zero_limit_returns_empty() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    h.mkt
        .list_bot(&seller, &bot_id, &10_0000000_i128, &h.token.address);
    // There is one active listing, but a limit of 0 yields nothing.
    assert_eq!(h.mkt.get_active_listings(&0, &0).len(), 0);
}

// #120: start beyond the number of active listings returns an empty vec
#[test]
fn test_get_active_listings_start_beyond_count_returns_empty() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);
    h.mkt
        .list_bot(&seller, &bot_id, &10_0000000_i128, &h.token.address);
    // Only one active listing (index 0); starting at 5 skips everything.
    assert_eq!(h.mkt.get_active_listings(&5, &100).len(), 0);
}

// #120: a stale active-id (index entry present but the Listing record was
// removed) is skipped gracefully rather than causing a panic.
#[test]
fn test_get_active_listings_skips_stale_index_entry() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let id1 = h.bot.mint_basic(&seller);
    let id2 = h.bot.mint_basic(&seller);
    let l1 = h
        .mkt
        .list_bot(&seller, &id1, &10_0000000_i128, &h.token.address);
    h.mkt
        .list_bot(&seller, &id2, &20_0000000_i128, &h.token.address);
    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 2);

    // Remove the persistent Listing record for l1 while leaving it in the
    // ActiveListings index — simulating a stale index entry.
    h.env.as_contract(&h.mkt.address, || {
        h.env
            .storage()
            .persistent()
            .remove(&DataKey::Listing(l1));
    });

    // Only the still-present listing is returned; no panic on the stale id.
    let listings = h.mkt.get_active_listings(&0, &100);
    assert_eq!(listings.len(), 1);
    assert_eq!(listings.get(0).unwrap().id, 2);
}

// #120: an id present in the active-ids index but whose listing is marked
// inactive is filtered out.
#[test]
fn test_get_active_listings_filters_inactive_still_in_index() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let id1 = h.bot.mint_basic(&seller);
    let l1 = h
        .mkt
        .list_bot(&seller, &id1, &10_0000000_i128, &h.token.address);
    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 1);

    // Flip the listing to inactive but leave it in the ActiveListings index.
    h.env.as_contract(&h.mkt.address, || {
        let mut listing: Listing = h
            .env
            .storage()
            .persistent()
            .get(&DataKey::Listing(l1))
            .unwrap();
        listing.active = false;
        h.env
            .storage()
            .persistent()
            .set(&DataKey::Listing(l1), &listing);
    });

    // The inactive listing is filtered out despite remaining in the index.
    assert_eq!(h.mkt.get_active_listings(&0, &100).len(), 0);
}
