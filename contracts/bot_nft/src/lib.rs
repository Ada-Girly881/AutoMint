#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum Tier {
    Basic = 0,
    Advanced = 1,
    Premium = 2,
}

#[derive(Clone)]
#[contracttype]
pub struct BotNFT {
    pub id: u64,
    pub owner: Address,
    pub tier: Tier,
    pub rate: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    NextId,
    Bot(u64),
    UserBots(Address),
    Admin,
    Initialized,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum BotNFTError {
    AlreadyInitialized = 1,
    NotFound = 2,
    Unauthorized = 3,
    InvalidTier = 4,
}

const LEDGER_BUMP: u32 = 120960;
const LEDGER_THRESHOLD: u32 = 103680;

#[contract]
pub struct BotNFTContract;

#[contractimpl]
impl BotNFTContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), BotNFTError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(BotNFTError::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &1u64);
        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    pub fn mint_basic(env: Env, owner: Address) -> Result<u64, BotNFTError> {
        owner.require_auth();
        let bot_id = Self::get_next_id(&env);
        let rate = 10_u64;
        let bot = BotNFT {
            id: bot_id,
            owner: owner.clone(),
            tier: Tier::Basic,
            rate,
        };
        env.storage().persistent().set(&DataKey::Bot(bot_id), &bot);
        env.storage().persistent().extend_ttl(
            &DataKey::Bot(bot_id),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        Self::add_bot_to_user(&env, &owner, bot_id);
        env.events().publish(
            (symbol_short!("mint"), owner.clone()),
            (bot_id, Tier::Basic),
        );
        Ok(bot_id)
    }

    pub fn mint_tier(env: Env, owner: Address, tier: Tier) -> Result<u64, BotNFTError> {
        owner.require_auth();
        let bot_id = Self::get_next_id(&env);
        let rate = match tier {
            Tier::Basic => 10_u64,
            Tier::Advanced => 25_u64,
            Tier::Premium => 50_u64,
        };
        let bot = BotNFT {
            id: bot_id,
            owner: owner.clone(),
            tier,
            rate,
        };
        env.storage().persistent().set(&DataKey::Bot(bot_id), &bot);
        env.storage().persistent().extend_ttl(
            &DataKey::Bot(bot_id),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        Self::add_bot_to_user(&env, &owner, bot_id);
        env.events().publish(
            (symbol_short!("mint"), owner.clone()),
            (bot_id, tier),
        );
        Ok(bot_id)
    }

    pub fn transfer(env: Env, bot_id: u64, from: Address, to: Address) -> Result<(), BotNFTError> {
        from.require_auth();
        let mut bot: BotNFT = env
            .storage()
            .persistent()
            .get(&DataKey::Bot(bot_id))
            .ok_or(BotNFTError::NotFound)?;

        if bot.owner != from {
            return Err(BotNFTError::Unauthorized);
        }

        bot.owner = to.clone();
        env.storage().persistent().set(&DataKey::Bot(bot_id), &bot);
        Self::remove_bot_from_user(&env, &from, bot_id);
        Self::add_bot_to_user(&env, &to, bot_id);

        env.events().publish(
            (symbol_short!("transfer"), from, to.clone()),
            bot_id,
        );
        Ok(())
    }

    pub fn get_bot(env: Env, bot_id: u64) -> Result<BotNFT, BotNFTError> {
        env.storage()
            .persistent()
            .get(&DataKey::Bot(bot_id))
            .ok_or(BotNFTError::NotFound)
    }

    pub fn get_user_bots(env: Env, user: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get::<_, Vec<u64>>(&DataKey::UserBots(user))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_user_total_rate(env: Env, user: Address) -> u64 {
        let bot_ids = Self::get_user_bots(env.clone(), user);
        let mut total = 0_u64;
        for id in bot_ids.iter() {
            if let Ok(bot) = Self::get_bot(env.clone(), id) {
                total = total.saturating_add(bot.rate);
            }
        }
        total
    }

    fn get_next_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(id + 1));
        id
    }

    fn add_bot_to_user(env: &Env, user: &Address, bot_id: u64) {
        let mut bots = env
            .storage()
            .persistent()
            .get::<_, Vec<u64>>(&DataKey::UserBots(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        bots.push_back(bot_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserBots(user.clone()), &bots);
    }

    fn remove_bot_from_user(env: &Env, user: &Address, bot_id: u64) {
        let mut bots = env
            .storage()
            .persistent()
            .get::<_, Vec<u64>>(&DataKey::UserBots(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        let mut new_bots = Vec::new(&env);
        for id in bots.iter() {
            if id != bot_id {
                new_bots.push_back(id);
            }
        }
        env.storage()
            .persistent()
            .set(&DataKey::UserBots(user.clone()), &new_bots);
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, Address, BotNFTContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, BotNFTContract);
        let client = BotNFTContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    #[test]
    fn test_mint_basic_assigns_sequential_ids() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let id1 = client.mint_basic(&user);
        let id2 = client.mint_basic(&user);
        let id3 = client.mint_basic(&user);
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
    }

    #[test]
    fn test_mint_tier_charges_correct_price() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let basic_id = client.mint_tier(&user, &Tier::Basic);
        let advanced_id = client.mint_tier(&user, &Tier::Advanced);
        let premium_id = client.mint_tier(&user, &Tier::Premium);

        let basic_bot = client.get_bot(&basic_id);
        let advanced_bot = client.get_bot(&advanced_id);
        let premium_bot = client.get_bot(&premium_id);

        assert_eq!(basic_bot.rate, 10);
        assert_eq!(advanced_bot.rate, 25);
        assert_eq!(premium_bot.rate, 50);
    }

    #[test]
    fn test_transfer_changes_both_owners_bot_lists() {
        let (env, _admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let bot_id = client.mint_basic(&alice);
        assert_eq!(client.get_user_bots(&alice).len(), 1);
        assert_eq!(client.get_user_bots(&bob).len(), 0);

        client.transfer(&bot_id, &alice, &bob);
        assert_eq!(client.get_user_bots(&alice).len(), 0);
        assert_eq!(client.get_user_bots(&bob).len(), 1);
    }

    #[test]
    fn test_get_user_total_rate_sums_correctly() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.mint_tier(&user, &Tier::Basic);
        client.mint_tier(&user, &Tier::Advanced);
        client.mint_tier(&user, &Tier::Premium);

        let total_rate = client.get_user_total_rate(&user);
        assert_eq!(total_rate, 85);
    }

    #[test]
    fn test_transfer_updates_bot_owner() {
        let (env, _admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let bot_id = client.mint_basic(&alice);
        client.transfer(&bot_id, &alice, &bob);

        let bot = client.get_bot(&bot_id);
        assert_eq!(bot.owner, bob);
    }

    #[test]
    fn test_get_user_bots_multiple() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let id1 = client.mint_basic(&user);
        let id2 = client.mint_basic(&user);
        let id3 = client.mint_basic(&user);

        let bots = client.get_user_bots(&user);
        assert_eq!(bots.len(), 3);
        assert_eq!(bots.get(0), Some(id1));
        assert_eq!(bots.get(1), Some(id2));
        assert_eq!(bots.get(2), Some(id3));
    }

    #[test]
    fn test_double_initialize_fails() {
        let (_env, admin, client) = setup();
        assert!(client.try_initialize(&admin).is_err());
    }

    #[test]
    fn test_transfer_unauthorized() {
        let (env, _admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        let bot_id = client.mint_basic(&alice);
        let result = client.try_transfer(&bot_id, &bob, &charlie);
        assert!(result.is_err());
    }
}
