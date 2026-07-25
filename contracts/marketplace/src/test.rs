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
    mkt.initialize(&admin, &bot_id);

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

    assert_eq!(h.mkt.get_active_listings().len(), 2);
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
        h.mkt.try_initialize(&h.admin, &h.bot.address),
        Err(Ok(MarketplaceError::AlreadyInitialized))
    );
}

#[test]
fn test_config_returns_admin_and_bot_nft() {
    let h = setup();
    let config = h.mkt.config();
    assert_eq!(config.admin, h.admin);
    assert_eq!(config.bot_nft, h.bot.address);
}

#[test]
fn test_active_listings_empty_initially() {
    let h = setup();
    assert_eq!(h.mkt.get_active_listings().len(), 0);
}

#[test]
fn test_buy_bot_success() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let buyer = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);

    h.token.mint(&buyer, &100_0000000_i128);

    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &100_0000000_i128, &h.token.address);
    assert_eq!(listing_id, 1);

    h.mkt.buy_bot(&buyer, &listing_id);

    let listing = h.mkt.get_listing(&listing_id);
    assert!(!listing.active);

    let bot = h.bot.get_bot(&bot_id);
    assert_eq!(bot.owner, buyer);

    // 2.5% fee to admin (2_5000000), 97.5% to seller (97_5000000)
    assert_eq!(h.token.balance(&seller), 97_5000000_i128);
    assert_eq!(h.token.balance(&h.admin), 2_5000000_i128);
    assert_eq!(h.token.balance(&buyer), 0_i128);
}

#[test]
fn test_buy_bot_listing_not_found() {
    let h = setup();
    let buyer = Address::generate(&h.env);
    assert_eq!(
        h.mkt.try_buy_bot(&buyer, &999_u64),
        Err(Ok(MarketplaceError::ListingNotFound))
    );
}

#[test]
fn test_buy_bot_inactive_listing_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let buyer1 = Address::generate(&h.env);
    let buyer2 = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);

    h.token.mint(&buyer1, &100_0000000_i128);
    h.token.mint(&buyer2, &100_0000000_i128);

    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &100_0000000_i128, &h.token.address);

    h.mkt.buy_bot(&buyer1, &listing_id);

    // Second purchase attempt must fail with ListingInactive
    assert_eq!(
        h.mkt.try_buy_bot(&buyer2, &listing_id),
        Err(Ok(MarketplaceError::ListingInactive))
    );
}

#[test]
fn test_buy_bot_insufficient_funds_fails() {
    let h = setup();
    let seller = Address::generate(&h.env);
    let buyer = Address::generate(&h.env);
    let bot_id = h.bot.mint_basic(&seller);

    // Buyer has insufficient balance (10 tokens vs 100 price)
    h.token.mint(&buyer, &10_0000000_i128);

    let listing_id = h
        .mkt
        .list_bot(&seller, &bot_id, &100_0000000_i128, &h.token.address);

    assert_eq!(
        h.mkt.try_buy_bot(&buyer, &listing_id),
        Err(Ok(MarketplaceError::InsufficientFunds))
    );
}
