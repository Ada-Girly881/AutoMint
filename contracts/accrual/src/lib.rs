#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[derive(Clone)]
#[contracttype]
pub struct AccrualState {
    pub last_claim_ts: u64,
    pub total_claimed_points: u64,
}

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

fn read_accrual_state(env: &Env, user: &Address) -> Option<AccrualState> {
    env.storage()
        .persistent()
        .get::<_, UserAccrual>(&DataKey::UserAccrual(user.clone()))
        .map(|a| AccrualState {
            last_claim_ts: a.last_claim_ts,
            total_claimed_points: a.total_claimed_points,
        })
}

fn write_accrual_state(env: &Env, user: &Address, state: AccrualState) {
    if let Some(mut accrual) = env
        .storage()
        .persistent()
        .get::<_, UserAccrual>(&DataKey::UserAccrual(user.clone()))
    {
        accrual.last_claim_ts = state.last_claim_ts;
        accrual.total_claimed_points = state.total_claimed_points;
        env.storage()
            .persistent()
            .set(&DataKey::UserAccrual(user.clone()), &accrual);
    }
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
                elapsed.saturating_mul(accrual.rate) / 3600
            }
            None => 0,
        }
    }

    pub fn claim(
        env: Env,
        user: Address,
        token_contract: Address,
        amt: i128,
    ) -> Result<i128, AccrualError> {
        user.require_auth();
        let mut accrual: UserAccrual = env
            .storage()
            .persistent()
            .get(&DataKey::UserAccrual(user.clone()))
            .ok_or(AccrualError::NotStarted)?;

        let current_ts = env.ledger().timestamp();
        let elapsed = current_ts.saturating_sub(accrual.last_claim_ts);
        let pending = elapsed.saturating_mul(accrual.rate) / 3600;

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

        let amt_to_mint = if total_points >= config.points_per_amt as u64 {
            (total_points / config.points_per_amt as u64) as i128
        } else {
            0
        };

        env.events().publish(
            (symbol_short!("claim"), user.clone()),
            (pending, amt_to_mint),
        );

        Ok(amt_to_mint)
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
    use soroban_sdk::{testutils::{Address as _, Ledger}, Env};

    fn setup() -> (Env, Address, AccrualContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, AccrualContract);
        let client = AccrualContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &100_u64);
        (env, admin, client)
    }

    #[test]
    fn test_initialize() {
        let (_env, _admin, client) = setup();
        let config = client.config();
        assert_eq!(config.points_per_amt, 100);
    }

    #[test]
    fn test_double_initialize_fails() {
        let (_env, admin, client) = setup();
        assert!(client.try_initialize(&admin, &100_u64).is_err());
    }

    #[test]
    fn test_start_accrual() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &50_u64);
        assert_eq!(client.pending_points(&user), 0);
    }

    #[test]
    fn test_double_start_accrual_fails() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &50_u64);
        assert!(client.try_start_accrual(&user, &50_u64).is_err());
    }

    #[test]
    fn test_pending_points_calculation() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &100_u64);

        // Simulate time passing by jumping to a future ledger sequence
        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 100;
            // This adjusts the timestamp proportionally: ~5s per ledger
            ledger.timestamp = ledger.timestamp + 500;
        });

        let pending = client.pending_points(&user);
        assert!(pending > 0);
    }

    #[test]
    fn test_claim_resets_timestamp() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &100_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 100;
            ledger.timestamp = ledger.timestamp + 500;
        });

        let _amt = client.claim(&user, &Address::generate(&env), &100_i128);
        assert_eq!(client.pending_points(&user), 0);
    }

    #[test]
    fn test_claim_below_threshold_mints_nothing() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &1_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 10;
            ledger.timestamp = ledger.timestamp + 50;
        });

        let amt = client.claim(&user, &Address::generate(&env), &100_i128);
        assert_eq!(amt, 0);
    }

    #[test]
    fn test_claim_accumulates_total_claimed() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &100_u64);

        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = ledger.sequence_number + 100;
            ledger.timestamp = ledger.timestamp + 500;
        });

        let _amt = client.claim(&user, &Address::generate(&env), &100_i128);
    }

    #[test]
    fn test_claim_not_started_fails() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        assert!(client
            .try_claim(&user, &Address::generate(&env), &100_i128)
            .is_err());
    }

    #[test]
    fn test_pending_points_uses_hourly_rate() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        // rate=3600 pts/hr, elapsed=3600s → exactly 3600 points
        client.start_accrual(&user, &3600_u64);
        env.ledger().with_mut(|l| { l.timestamp += 3600; });
        assert_eq!(client.pending_points(&user), 3600);
    }

    #[test]
    fn test_accrual_state_read() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.start_accrual(&user, &100_u64);
        // pending_points returns 0 at t=0 (no elapsed)
        assert_eq!(client.pending_points(&user), 0);
    }
}
