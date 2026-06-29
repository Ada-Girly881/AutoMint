#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Config,
    Admin,
    Initialized,
}

#[derive(Clone)]
#[contracttype]
pub struct MarketplaceConfig {
    pub fee_percentage: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum MarketplaceError {
    AlreadyInitialized = 1,
    Unauthorized = 2,
}

const LEDGER_BUMP: u32 = 120960;
const LEDGER_THRESHOLD: u32 = 103680;

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_percentage: u64,
    ) -> Result<(), MarketplaceError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(MarketplaceError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(
                &DataKey::Config,
                &MarketplaceConfig { fee_percentage },
            );
        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap()
    }

    pub fn config(env: Env) -> MarketplaceConfig {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, Address, MarketplaceContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, MarketplaceContract);
        let client = MarketplaceContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &50_u64);
        (env, admin, client)
    }

    #[test]
    fn test_initialize_sets_admin() {
        let (_env, admin, client) = setup();
        assert_eq!(client.admin(), admin);
    }

    #[test]
    fn test_initialize_sets_config() {
        let (_env, _admin, client) = setup();
        let config = client.config();
        assert_eq!(config.fee_percentage, 50);
    }

    #[test]
    fn test_double_initialize_fails() {
        let (_env, admin, client) = setup();
        let result = client.try_initialize(&admin, &50_u64);
        assert!(result.is_err());
    }

    #[test]
    fn test_initialize_with_zero_fee() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, MarketplaceContract);
        let client = MarketplaceContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &0_u64);
        let config = client.config();
        assert_eq!(config.fee_percentage, 0);
    }

    #[test]
    fn test_initialize_with_max_fee() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, MarketplaceContract);
        let client = MarketplaceContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &u64::MAX);
        let config = client.config();
        assert_eq!(config.fee_percentage, u64::MAX);
    }

    #[test]
    fn test_admin_persists_across_calls() {
        let (_env, admin, client) = setup();
        assert_eq!(client.admin(), admin);
        assert_eq!(client.admin(), admin);
    }

    #[test]
    fn test_config_persists_across_calls() {
        let (_env, _admin, client) = setup();
        let c1 = client.config();
        let c2 = client.config();
        assert_eq!(c1.fee_percentage, c2.fee_percentage);
    }

    #[test]
    fn test_initialize_requires_auth() {
        let env = Env::default();
        let id = env.register_contract(None, MarketplaceContract);
        let client = MarketplaceContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        let result = client.try_initialize(&admin, &50_u64);
        assert!(result.is_err());
    }
}
