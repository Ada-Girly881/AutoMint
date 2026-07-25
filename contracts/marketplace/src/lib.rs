#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

use automint_bot_nft::BotNFTContractClient;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Listing(u64),
    ActiveListings,
    UserListings(Address),
    NextListingId,
    Config,
    Initialized,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Listing {
    pub id: u64,
    pub seller: Address,
    pub bot_id: u64,
    pub price: i128,
    pub currency: Address,
    pub listed_at: u64,
    pub active: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub admin: Address,
    pub bot_nft: Address,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum MarketplaceError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidPrice = 3,
    BotTransferFailed = 4,
    ListingNotFound = 5,
    NotSeller = 6,
    ListingInactive = 7,
    InsufficientFunds = 8,
}

const LEDGER_BUMP: u32 = 120960;
const LEDGER_THRESHOLD: u32 = 103680;

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    /// Set the admin and bot_nft addresses. Fails with `AlreadyInitialized` if
    /// called twice.
    pub fn initialize(
        env: Env,
        admin: Address,
        bot_nft: Address,
    ) -> Result<(), MarketplaceError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(MarketplaceError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Config, &Config { admin, bot_nft });
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::NextListingId, &1u64);
        env.storage()
            .instance()
            .set(&DataKey::ActiveListings, &Vec::<u64>::new(&env));
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    /// Escrow `bot_id` from `seller` into the marketplace contract, record a
    /// `Listing` at `price` in `currency`, and return the new listing ID.
    pub fn list_bot(
        env: Env,
        seller: Address,
        bot_id: u64,
        price: i128,
        currency: Address,
    ) -> Result<u64, MarketplaceError> {
        seller.require_auth();

        // A listing must have a strictly positive price.
        if price <= 0 {
            return Err(MarketplaceError::InvalidPrice);
        }

        let config: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(MarketplaceError::NotInitialized)?;

        // Escrow the bot into the marketplace. The transfer fails (and we
        // surface BotTransferFailed instead of panicking) when the bot does not
        // exist or the seller is not its owner.
        let marketplace = env.current_contract_address();
        let bot_client = BotNFTContractClient::new(&env, &config.bot_nft);
        if bot_client
            .try_transfer(&bot_id, &seller, &marketplace)
            .is_err()
        {
            return Err(MarketplaceError::BotTransferFailed);
        }

        let listing_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextListingId)
            .unwrap_or(1);

        let listing = Listing {
            id: listing_id,
            seller: seller.clone(),
            bot_id,
            price,
            currency,
            listed_at: env.ledger().timestamp(),
            active: true,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.storage().persistent().extend_ttl(
            &DataKey::Listing(listing_id),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );

        let mut active: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ActiveListings)
            .unwrap_or_else(|| Vec::new(&env));
        active.push_back(listing_id);
        env.storage()
            .instance()
            .set(&DataKey::ActiveListings, &active);

        let mut user_listings: Vec<u64> = env
            .storage()
            .persistent()
            .get::<_, Vec<u64>>(&DataKey::UserListings(seller.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_listings.push_back(listing_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserListings(seller.clone()), &user_listings);

        env.storage()
            .instance()
            .set(&DataKey::NextListingId, &(listing_id + 1));
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);

        env.events().publish(
            (symbol_short!("listed"), seller, listing_id),
            (bot_id, price),
        );
        Ok(listing_id)
    }

    pub fn get_listing(env: Env, listing_id: u64) -> Result<Listing, MarketplaceError> {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .ok_or(MarketplaceError::ListingNotFound)
    }

    pub fn get_active_listings(env: Env) -> Vec<Listing> {
        let active_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::ActiveListings)
            .unwrap_or_else(|| Vec::new(&env));
        let mut result: Vec<Listing> = Vec::new(&env);
        for id in active_ids.iter() {
            if let Some(l) = env
                .storage()
                .persistent()
                .get::<_, Listing>(&DataKey::Listing(id))
            {
                if l.active {
                    result.push_back(l);
                }
            }
        }
        result
    }

    pub fn get_user_listings(env: Env, seller: Address) -> Vec<Listing> {
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get::<_, Vec<u64>>(&DataKey::UserListings(seller))
            .unwrap_or_else(|| Vec::new(&env));
        let mut result: Vec<Listing> = Vec::new(&env);
        for id in ids.iter() {
            if let Some(l) = env
                .storage()
                .persistent()
                .get::<_, Listing>(&DataKey::Listing(id))
            {
                result.push_back(l);
            }
        }
        result
    }

    pub fn config(env: Env) -> Result<Config, MarketplaceError> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(MarketplaceError::NotInitialized)
    }

    /// Buy a listed bot. Transfer `price` minus marketplace fee (2.5%) from `buyer`
    /// to `seller`, transfer fee to `admin`, transfer the escrowed bot to `buyer`,
    /// and mark the listing inactive.
    pub fn buy_bot(env: Env, buyer: Address, listing_id: u64) -> Result<(), MarketplaceError> {
        buyer.require_auth();

        let mut listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .ok_or(MarketplaceError::ListingNotFound)?;

        if !listing.active {
            return Err(MarketplaceError::ListingInactive);
        }

        let config: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(MarketplaceError::NotInitialized)?;

        // 2.5% fee calculation: fee = price * 250 / 10000
        let fee = listing
            .price
            .checked_mul(250)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);
        let seller_payment = listing.price.saturating_sub(fee);

        let token_client = token::Client::new(&env, &listing.currency);
        if token_client
            .try_transfer(&buyer, &listing.seller, &seller_payment)
            .is_err()
        {
            return Err(MarketplaceError::InsufficientFunds);
        }

        if fee > 0 {
            if token_client
                .try_transfer(&buyer, &config.admin, &fee)
                .is_err()
            {
                return Err(MarketplaceError::InsufficientFunds);
            }
        }

        let marketplace = env.current_contract_address();
        let bot_client = BotNFTContractClient::new(&env, &config.bot_nft);
        if bot_client
            .try_transfer(&listing.bot_id, &marketplace, &buyer)
            .is_err()
        {
            return Err(MarketplaceError::BotTransferFailed);
        }

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);

        env.events().publish(
            (symbol_short!("bought"), buyer, listing_id),
            (listing.bot_id, listing.price),
        );

        Ok(())
    }
}

#[cfg(test)]
mod test;
