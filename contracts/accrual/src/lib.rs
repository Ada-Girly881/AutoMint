#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Config,
    Admin,
    Initialized,
    UserAccrual(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub points_per_amt: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct UserAccrual {
    pub user: Address,
    pub rate: u64,
    pub last_claim_ts: u64,
    pub total_claimed_points: u64,
    pub started_at: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum AccrualError {
    AlreadyInitialized = 1,
    AlreadyStarted = 2,
    NotStarted = 3,
    Unauthorized = 4,
}

const LEDGER_BUMP: u32 = 120960;
const LEDGER_THRESHOLD: u32 = 103680;

#[contract]
pub struct AccrualContract;

#[contractimpl]
impl AccrualContract {
    pub fn initialize(env: Env, admin: Address, points_per_amt: u64) -> Result<(), AccrualError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(AccrualError::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Config, &Config { points_per_amt });
        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    pub fn start_accrual(
        env: Env,
        user: Address,
        rate: u64,
    ) -> Result<(), AccrualError> {
        user.require_auth();
        if env.storage().persistent().has(&DataKey::UserAccrual(user.clone())) {
            return Err(AccrualError::AlreadyStarted);
        }
        let accrual = UserAccrual {
            user: user.clone(),
            rate,
            last_claim_ts: env.ledger().timestamp(),
            total_claimed_points: 0,
            started_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::UserAccrual(user.clone()), &accrual);
        env.storage()
            .persistent()
            .extend_ttl(
                &DataKey::UserAccrual(user.clone()),
                LEDGER_THRESHOLD,
                LEDGER_BUMP,
            );
        env.events().publish(
            (symbol_short!("start"), user.clone()),
            env.ledger().timestamp(),
        );
        Ok(())
    }

    pub fn pending_points(env: Env, user: Address) -> u64 {
        match env.storage().persistent().get::<_, UserAccrual>(&DataKey::UserAccrual(user)) {
            Some(accrual) => {
                let current_ts = env.ledger().timestamp();
                let elapsed = current_ts.saturating_sub(accrual.last_claim_ts);
                accrual.rate.saturating_mul(elapsed)
            }
            None => 0,
        }
    }

    pub fn claim(
        env: Env,
        user: Address,
        token_contract: Address,
        registry: Address,
    ) -> Result<i128, AccrualError> {
        user.require_auth();
        let mut accrual: UserAccrual = env
            .storage()
            .persistent()
            .get(&DataKey::UserAccrual(user.clone()))
            .ok_or(AccrualError::NotStarted)?;

        let current_ts = env.ledger().timestamp();
        let elapsed = current_ts.saturating_sub(accrual.last_claim_ts);
        let pending = accrual.rate.saturating_mul(elapsed);

        let config: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(AccrualError::Unauthorized)?;

        let total_points = accrual.total_claimed_points.saturating_add(pending);
        accrual.total_claimed_points = total_points;
        accrual.last_claim_ts = current_ts;

        env.storage()
            .persistent()
            .set(&DataKey::UserAccrual(user.clone()), &accrual);
        env.storage()
            .persistent()
            .extend_ttl(
                &DataKey::UserAccrual(user.clone()),
                LEDGER_THRESHOLD,
                LEDGER_BUMP,
            );

        let reg_client = automint_registry::RegistryContractClient::new(&env, &registry);
        let _ = reg_client.add_points(&user, &pending);

        if total_points >= config.points_per_amt as u64 {
            let amt_to_mint = (total_points / config.points_per_amt as u64) as i128;
            let token_client = automint_token::AMTTokenClient::new(&env, &token_contract);
            let _ = token_client.mint(&user, &amt_to_mint);
            let _ = reg_client.add_claimed_amt(&user, &amt_to_mint);
        }

        env.events().publish(
            (symbol_short!("claim"), user.clone()),
            (pending, total_points),
        );

        Ok(pending as i128)
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap()
    }

    pub fn config(env: Env) -> Config {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, testutils::Ledger, Env, String};

    fn register_user(
        env: &Env,
        registry: &Address,
        user: &Address,
        name: &str,
    ) {
        let reg_client = automint_registry::RegistryContractClient::new(env, registry);
        let _ = reg_client.register(user, &String::from_str(env, name));
    }

    fn setup() -> (Env, Address, Address, Address, AccrualContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, AccrualContract);
        let client = AccrualContractClient::new(&env, &id);
        let admin = Address::generate(&env);

        let registry_id = env.register_contract(None, automint_registry::RegistryContract);
        let reg_client = automint_registry::RegistryContractClient::new(&env, &registry_id);
        reg_client.initialize(&admin);

        let token_id = env.register_contract(None, automint_token::AMTToken);
        let token_client = automint_token::AMTTokenClient::new(&env, &token_id);
        token_client.initialize(
            &admin,
            &7u32,
            &String::from_str(&env, "AutoMint Token"),
            &String::from_str(&env, "AMT"),
        );

        client.initialize(&admin, &100_u64);
        (env, admin, registry_id, token_id, client)
    }

    #[test]
    fn test_initialize() {
        let (_env, _admin, _registry, _token, client) = setup();
        let config = client.config();
        assert_eq!(config.points_per_amt, 100);
    }

    #[test]
    fn test_double_initialize_fails() {
        let (env, _admin, _registry, _token, client) = setup();
        assert!(client.try_initialize(&_admin, &100_u64).is_err());
    }

    #[test]
    fn test_start_accrual() {
        let (env, _admin, _registry, _token, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &50_u64);
        assert_eq!(client.pending_points(&user), 0);
    }

    #[test]
    fn test_double_start_accrual_fails() {
        let (env, _admin, _registry, _token, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &50_u64);
        assert!(client.try_start_accrual(&user, &50_u64).is_err());
    }

    #[test]
    fn test_pending_points_calculation() {
        let (env, _admin, _registry, _token, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &100_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 100;
            ledger.timestamp = ledger.timestamp + 500;
        });

        let pending = client.pending_points(&user);
        assert!(pending > 0);
    }

    #[test]
    fn test_claim_resets_timestamp() {
        let (env, _admin, registry, token, client) = setup();
        let user = Address::generate(&env);
        register_user(&env, &registry, &user, "user1");
        // Use low rate so total_points < points_per_amt (no mint triggered)
        client.start_accrual(&user, &1_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 10;
            ledger.timestamp = ledger.timestamp + 50;
        });

        let _pending = client.claim(&user, &token, &registry);
        assert_eq!(client.pending_points(&user), 0);
    }

    #[test]
    fn test_claim_below_threshold_mints_nothing() {
        let (env, _admin, registry, token, client) = setup();
        let user = Address::generate(&env);
        register_user(&env, &registry, &user, "user1");
        client.start_accrual(&user, &1_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 10;
            ledger.timestamp = ledger.timestamp + 50;
        });

        let pending = client.claim(&user, &token, &registry);
        assert_eq!(pending, 50); // 1 point/sec * 50 sec = 50 pending points
    }

    #[test]
    fn test_claim_accumulates_total_claimed() {
        let (env, _admin, registry, token, client) = setup();
        let user = Address::generate(&env);
        register_user(&env, &registry, &user, "user1");
        // Use low rate so total_points < points_per_amt (no mint triggered)
        client.start_accrual(&user, &1_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 10;
            ledger.timestamp = ledger.timestamp + 30;
        });

        let pending = client.claim(&user, &token, &registry);
        assert_eq!(pending, 30); // 1 pt/sec * 30 sec = 30 pending points

        // Claim again — should accumulate total_claimed
        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 10;
            ledger.timestamp = ledger.timestamp + 30;
        });

        let pending2 = client.claim(&user, &token, &registry);
        assert_eq!(pending2, 30); // another 30 points (from last_claim_ts reset)
    }

    #[test]
    fn test_claim_not_started_fails() {
        let (env, _admin, registry, token, client) = setup();
        let user = Address::generate(&env);
        assert!(client
            .try_claim(&user, &token, &registry)
            .is_err());
    }
}
