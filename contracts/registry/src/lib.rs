#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

// TODO: implement the rest of this contract.
// See the project's GitHub Issues for the specific task assigned to this file.

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    UserProfile(Address),
    UserList,
    TotalUsers,
    Admin,
    Initialized,
}

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

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum RegistryError {
    AlreadyInitialized = 1,
    AlreadyRegistered = 2,
    UserNotFound = 3,
    Unauthorized = 4,
    InvalidUsername = 5,
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
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    pub fn is_registered(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&DataKey::UserProfile(user))
    }

    pub fn increment_bot_count(env: Env, user: Address) -> Result<(), RegistryError> {
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .ok_or(RegistryError::UserNotFound)?;
        profile.bot_count = profile.bot_count.saturating_add(1);
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user), &profile);
        Ok(())
    }

    pub fn decrement_bot_count(env: Env, user: Address) -> Result<(), RegistryError> {
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .ok_or(RegistryError::UserNotFound)?;
        profile.bot_count = profile.bot_count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(user), &profile);
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, Address, Address, RegistryContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, id, admin, client)
    }

    fn seed_user(env: &Env, contract_id: &Address) -> Address {
        let user = Address::generate(env);
        let profile = UserProfile {
            address: user.clone(),
            username: String::from_str(env, "TestUser"),
            total_points: 0,
            claimed_amt: 0,
            registered_at: env.ledger().timestamp(),
            bot_count: 0,
        };
        env.as_contract(contract_id, || {
            env.storage()
                .persistent()
                .set(&DataKey::UserProfile(user.clone()), &profile);
        });
        user
    }

    #[test]
    fn test_initialize_sets_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        let stored_admin: Address = env.as_contract(&id, || {
            env.storage().instance().get(&DataKey::Admin).unwrap()
        });
        assert_eq!(stored_admin, admin);
    }

    #[test]
    fn test_initialize_twice_fails() {
        let (_env, _id, admin, client) = setup();
        assert_eq!(
            client.try_initialize(&admin).unwrap_err().unwrap(),
            RegistryError::AlreadyInitialized
        );
    }

    #[test]
    fn test_is_registered_false_for_unknown_user() {
        let (env, _id, _admin, client) = setup();
        let user = Address::generate(&env);
        assert!(!client.is_registered(&user));
    }

    #[test]
    fn test_is_registered_true_for_seeded_user() {
        let (env, id, _admin, client) = setup();
        let user = seed_user(&env, &id);
        assert!(client.is_registered(&user));
    }

    #[test]
    fn test_increment_bot_count_user_not_found() {
        let (env, _id, _admin, client) = setup();
        let user = Address::generate(&env);
        assert_eq!(
            client.try_increment_bot_count(&user).unwrap_err().unwrap(),
            RegistryError::UserNotFound
        );
    }

    #[test]
    fn test_increment_bot_count() {
        let (env, id, _admin, client) = setup();
        let user = seed_user(&env, &id);
        client.increment_bot_count(&user);
        client.increment_bot_count(&user);
        let profile: UserProfile = env.as_contract(&id, || {
            env.storage()
                .persistent()
                .get(&DataKey::UserProfile(user.clone()))
                .unwrap()
        });
        assert_eq!(profile.bot_count, 2);
    }

    #[test]
    fn test_decrement_bot_count_user_not_found() {
        let (env, _id, _admin, client) = setup();
        let user = Address::generate(&env);
        assert_eq!(
            client.try_decrement_bot_count(&user).unwrap_err().unwrap(),
            RegistryError::UserNotFound
        );
    }

    #[test]
    fn test_decrement_bot_count_floors_at_zero() {
        let (env, id, _admin, client) = setup();
        let user = seed_user(&env, &id);
        client.decrement_bot_count(&user);
        let profile: UserProfile = env.as_contract(&id, || {
            env.storage()
                .persistent()
                .get(&DataKey::UserProfile(user.clone()))
                .unwrap()
        });
        assert_eq!(profile.bot_count, 0);
    }

    #[test]
    fn test_increment_then_decrement_bot_count() {
        let (env, id, _admin, client) = setup();
        let user = seed_user(&env, &id);
        client.increment_bot_count(&user);
        client.decrement_bot_count(&user);
        let profile: UserProfile = env.as_contract(&id, || {
            env.storage()
                .persistent()
                .get(&DataKey::UserProfile(user.clone()))
                .unwrap()
        });
        assert_eq!(profile.bot_count, 0);
    }
}
