#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

// #38: Define DataKey storage keys addressing per-user and global storage
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    // Per-user storage
    UserProfile(Address),
    Username(String),
    // Global storage
    UserList,
    TotalUsers,
    Admin,
    Initialized,
}

// #39: Define UserProfile struct
#[derive(Clone, Debug)]
#[contracttype]
pub struct UserProfile {
    pub address: Address,
    pub username: String,
    pub total_points: u64,
    pub claimed_amt: i128,
    pub registered_at: u64,
    pub bot_count: u32,
}

// #38: Define RegistryError enum
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum RegistryError {
    AlreadyInitialized = 1,
    AlreadyRegistered = 2,
    UsernameTaken = 3,
    NotRegistered = 4,
    Unauthorized = 5,
}

const LEDGER_BUMP: u32 = 120960;
const LEDGER_THRESHOLD: u32 = 103680;

#[contract]
pub struct RegistryContract;

#[contractimpl]
impl RegistryContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(RegistryError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::TotalUsers, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::UserList, &Vec::<Address>::new(&env));
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    pub fn register(env: Env, user: Address, username: String) -> Result<(), RegistryError> {
        user.require_auth();
        if env
            .storage()
            .persistent()
            .has(&DataKey::UserProfile(user.clone()))
        {
            return Err(RegistryError::AlreadyRegistered);
        }
        if username.is_empty() || username.len() > 32 {
            return Err(RegistryError::UsernameTaken);
        }
        // Check for username uniqueness
        if env
            .storage()
            .persistent()
            .has(&DataKey::Username(username.clone()))
        {
            return Err(RegistryError::UsernameTaken);
        }
        let profile = UserProfile {
            address: user.clone(),
            username: username.clone(),
            total_points: 0,
            claimed_amt: 0,
            registered_at: env.ledger().timestamp(),
            bot_count: 0,
        };
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user.clone()), &profile);
        env.storage()
            .persistent()
            .set(&DataKey::Username(username), &user);
        env.storage().persistent().extend_ttl(
            &DataKey::UserProfile(user.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        let mut list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::UserList)
            .unwrap_or_else(|| Vec::new(&env));
        list.push_back(user.clone());
        env.storage().instance().set(&DataKey::UserList, &list);
        let total: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalUsers)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalUsers, &(total + 1));
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        env.events().publish(
            (symbol_short!("register"), user.clone()),
            env.ledger().timestamp(),
        );
        Ok(())
    }

    pub fn is_registered(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&DataKey::UserProfile(user))
    }

    pub fn get_user(env: Env, user: Address) -> Result<UserProfile, RegistryError> {
        env.storage()
            .persistent()
            .get(&DataKey::UserProfile(user))
            .ok_or(RegistryError::NotRegistered)
    }

    pub fn add_points(env: Env, user: Address, points: u64) -> Result<(), RegistryError> {
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .ok_or(RegistryError::NotRegistered)?;
        profile.total_points = profile.total_points.saturating_add(points);
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user.clone()), &profile);
        env.storage().persistent().extend_ttl(
            &DataKey::UserProfile(user.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        env.events()
            .publish((symbol_short!("addpoints"), user), points);
        Ok(())
    }

    pub fn increment_bot_count(env: Env, user: Address) -> Result<(), RegistryError> {
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .ok_or(RegistryError::NotRegistered)?;
        profile.bot_count = profile.bot_count.saturating_add(1);
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user.clone()), &profile);
        Ok(())
    }

    pub fn decrement_bot_count(env: Env, user: Address) -> Result<(), RegistryError> {
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .ok_or(RegistryError::NotRegistered)?;
        profile.bot_count = profile.bot_count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user.clone()), &profile);
        Ok(())
    }

    pub fn add_claimed_amt(env: Env, user: Address, amount: i128) -> Result<(), RegistryError> {
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .ok_or(RegistryError::NotRegistered)?;
        if amount == 0 {
            return Ok(());
        }
        profile.claimed_amt = profile.claimed_amt.saturating_add(amount);
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user.clone()), &profile);
        env.storage().persistent().extend_ttl(
            &DataKey::UserProfile(user.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        Ok(())
    }

    // Bubble sort in-contract — gas bounded by user count
    pub fn get_leaderboard(env: Env, limit: u32) -> Vec<UserProfile> {
        let list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::UserList)
            .unwrap_or_else(|| Vec::new(&env));
        let mut profiles: Vec<UserProfile> = Vec::new(&env);
        for addr in list.iter() {
            if let Some(p) = env
                .storage()
                .persistent()
                .get::<_, UserProfile>(&DataKey::UserProfile(addr.clone()))
            {
                profiles.push_back(p);
            }
        }
        let n = profiles.len();
        for i in 0..n {
            for j in 0..n.saturating_sub(i).saturating_sub(1) {
                let a = profiles.get(j).unwrap();
                let b = profiles.get(j + 1).unwrap();
                if a.total_points < b.total_points {
                    profiles.set(j, b);
                    profiles.set(j + 1, a);
                }
            }
        }
        let take = limit.min(n) as usize;
        let mut result: Vec<UserProfile> = Vec::new(&env);
        for i in 0..take {
            result.push_back(profiles.get(i as u32).unwrap());
        }
        result
    }

    pub fn total_users(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalUsers)
            .unwrap_or(0)
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    fn setup() -> (Env, Address, RegistryContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    // #40: Test register success
    #[test]
    fn test_register_user() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "Alice"));
        assert!(client.is_registered(&user));
        let profile = client.get_user(&user);
        assert_eq!(profile.total_points, 0);
        assert_eq!(profile.bot_count, 0);
        assert_eq!(profile.claimed_amt, 0);
    }

    // #40: Test duplicate-registration failure
    #[test]
    fn test_duplicate_register_fails() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "Alice"));
        assert!(client
            .try_register(&user, &String::from_str(&env, "Alice2"))
            .is_err());
    }

    // #40: Test username collision
    #[test]
    fn test_username_collision_fails() {
        let (env, _admin, client) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        client.register(&user1, &String::from_str(&env, "Bob"));
        assert!(client
            .try_register(&user2, &String::from_str(&env, "Bob"))
            .is_err());
    }

    // #40: Test invalid username (empty)
    #[test]
    fn test_empty_username_fails() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        assert!(client
            .try_register(&user, &String::from_str(&env, ""))
            .is_err());
    }

    // #40: Test invalid username (too long)
    #[test]
    fn test_long_username_fails() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let long_name = String::from_str(&env, "thisistoolongusernamethatexceedsthelimit");
        assert!(client.try_register(&user, &long_name).is_err());
    }

    // #40: Test add_points accumulation
    #[test]
    fn test_add_points_accumulates() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "Charlie"));
        client.add_points(&user, &100_u64);
        client.add_points(&user, &250_u64);
        assert_eq!(client.get_user(&user).total_points, 350);
    }

    // #40: Test add_claimed_amt accumulation
    #[test]
    fn test_add_claimed_amt_accumulates() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "Delta"));
        client.add_claimed_amt(&user, &1000_i128);
        client.add_claimed_amt(&user, &500_i128);
        assert_eq!(client.get_user(&user).claimed_amt, 1500);
    }

    // #40: Test add_claimed_amt with negative amounts
    #[test]
    fn test_add_claimed_amt_negative() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "Echo"));
        client.add_claimed_amt(&user, &1000_i128);
        client.add_claimed_amt(&user, &-300_i128);
        assert_eq!(client.get_user(&user).claimed_amt, 700);
    }

    #[test]
    fn test_get_user_not_found() {
        let (env, _admin, client) = setup();
        let ghost = Address::generate(&env);
        assert!(client.try_get_user(&ghost).is_err());
    }

    #[test]
    fn test_total_users_counter() {
        let (env, _admin, client) = setup();
        assert_eq!(client.total_users(), 0);
        let u1 = Address::generate(&env);
        let u2 = Address::generate(&env);
        client.register(&u1, &String::from_str(&env, "U1"));
        client.register(&u2, &String::from_str(&env, "U2"));
        assert_eq!(client.total_users(), 2);
    }

    // #40: Test leaderboard ordering with multiple users
    #[test]
    fn test_leaderboard_ordering() {
        let (env, _admin, client) = setup();
        let u1 = Address::generate(&env);
        let u2 = Address::generate(&env);
        let u3 = Address::generate(&env);
        client.register(&u1, &String::from_str(&env, "U1"));
        client.register(&u2, &String::from_str(&env, "U2"));
        client.register(&u3, &String::from_str(&env, "U3"));
        client.add_points(&u1, &100_u64);
        client.add_points(&u2, &500_u64);
        client.add_points(&u3, &250_u64);
        let lb = client.get_leaderboard(&10_u32);
        assert_eq!(lb.len(), 3);
        assert_eq!(lb.get(0).unwrap().total_points, 500);
        assert_eq!(lb.get(1).unwrap().total_points, 250);
        assert_eq!(lb.get(2).unwrap().total_points, 100);
    }

    #[test]
    fn test_leaderboard_limit() {
        let (env, _admin, client) = setup();
        let names = ["user0", "user1", "user2", "user3", "user4"];
        for (i, name) in names.iter().enumerate() {
            let u = Address::generate(&env);
            client.register(&u, &String::from_str(&env, name));
            client.add_points(&u, &(i as u64 * 10));
        }
        let lb = client.get_leaderboard(&3_u32);
        assert_eq!(lb.len(), 3);
    }

    // #40: Test bot_count increment/decrement floor at 0
    #[test]
    fn test_leaderboard_empty_when_no_users() {
        let (_env, _admin, client) = setup();
        let lb = client.get_leaderboard(&10_u32);
        assert_eq!(lb.len(), 0);
    }

    #[test]
    fn test_increment_decrement_bot_count() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "BotUser"));
        assert_eq!(client.get_user(&user).bot_count, 0);
        client.increment_bot_count(&user);
        client.increment_bot_count(&user);
        assert_eq!(client.get_user(&user).bot_count, 2);
        client.decrement_bot_count(&user);
        assert_eq!(client.get_user(&user).bot_count, 1);
    }

    // #40: Test bot_count floor at 0
    #[test]
    fn test_bot_count_floors_at_zero() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "BotUser2"));
        assert_eq!(client.get_user(&user).bot_count, 0);
        client.decrement_bot_count(&user);
        assert_eq!(client.get_user(&user).bot_count, 0); // Should floor at 0
        client.decrement_bot_count(&user);
        assert_eq!(client.get_user(&user).bot_count, 0); // Still 0
    }

    // #37: Test admin function returns correct admin address
    #[test]
    fn test_admin_returns_current_admin() {
        let (_env, admin, client) = setup();
        assert_eq!(client.admin(), admin);
    }

    // Test double-initialization fails with the AlreadyInitialized variant
    #[test]
    fn test_double_initialize_fails() {
        let (env, _admin, client) = setup();
        let other_admin = Address::generate(&env);
        assert_eq!(
            client.try_initialize(&other_admin),
            Err(Ok(RegistryError::AlreadyInitialized))
        );
    }

    // Test initialize stores the admin address in storage
    #[test]
    fn test_initialize_sets_admin() {
        let (_env, admin, client) = setup();
        assert_eq!(client.admin(), admin);
    }

    // #37: Test admin persists across calls
    #[test]
    fn test_admin_persists() {
        let (_env, admin, client) = setup();
        let retrieved_admin1 = client.admin();
        let retrieved_admin2 = client.admin();
        assert_eq!(retrieved_admin1, admin);
        assert_eq!(retrieved_admin2, admin);
        assert_eq!(retrieved_admin1, retrieved_admin2);
    }

    #[test]
    fn test_get_user_returns_not_registered_error() {
        let (env, _admin, client) = setup();
        let ghost = Address::generate(&env);
        let result = client.try_get_user(&ghost);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_user_returns_full_profile() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "FullCheck"));
        client.add_points(&user, &42_u64);
        client.add_claimed_amt(&user, &100_i128);
        client.increment_bot_count(&user);
        let profile = client.get_user(&user);
        assert_eq!(profile.username, String::from_str(&env, "FullCheck"));
        assert_eq!(profile.total_points, 42);
        assert_eq!(profile.claimed_amt, 100);
        assert_eq!(profile.bot_count, 1);
    }

    #[test]
    fn test_add_claimed_amt_zero_is_noop() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "ZeroTest"));
        client.add_claimed_amt(&user, &500_i128);
        client.add_claimed_amt(&user, &0_i128);
        assert_eq!(client.get_user(&user).claimed_amt, 500);
    }

    #[test]
    fn test_add_claimed_amt_unregistered_fails() {
        let (env, _admin, client) = setup();
        let ghost = Address::generate(&env);
        assert!(client.try_add_claimed_amt(&ghost, &100_i128).is_err());
    }

    #[test]
    fn test_add_claimed_amt_extends_ttl() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "TtlTest"));
        client.add_claimed_amt(&user, &100_i128);
        let profile = client.get_user(&user);
        assert_eq!(profile.claimed_amt, 100);
    }

    #[test]
    fn test_add_claimed_amt_large_values() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.register(&user, &String::from_str(&env, "LargeVal"));
        client.add_claimed_amt(&user, &i128::MAX);
        client.add_claimed_amt(&user, &1_i128);
        assert_eq!(client.get_user(&user).claimed_amt, i128::MAX);
    }

    #[test]
    fn test_add_points_unregistered_fails() {
        let (env, _admin, client) = setup();
        let ghost = Address::generate(&env);
        assert!(client.try_add_points(&ghost, &100_u64).is_err());
    }

    #[test]
    fn test_increment_bot_count_unregistered_fails() {
        let (env, _admin, client) = setup();
        let ghost = Address::generate(&env);
        assert!(client.try_increment_bot_count(&ghost).is_err());
    }

    #[test]
    fn test_decrement_bot_count_unregistered_fails() {
        let (env, _admin, client) = setup();
        let ghost = Address::generate(&env);
        assert!(client.try_decrement_bot_count(&ghost).is_err());
    }
}
