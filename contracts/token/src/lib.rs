#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Allowance(AllowanceKey),
    Balance(Address),
    State,
    Admin,
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[derive(Clone)]
#[contracttype]
pub struct TokenState {
    pub decimal: u32,
    pub name: String,
    pub symbol: String,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum TokenError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InsufficientAllowance = 5,
    NegativeAmount = 6,
    AllowanceExpired = 7,
    Overflow = 8,
}

// ~7 days at 5s/ledger
const LEDGER_BUMP: u32 = 120960;
const LEDGER_THRESHOLD: u32 = 103680;

#[contract]
pub struct AMTToken;

#[contractimpl]
impl AMTToken {
    pub fn initialize(
        env: Env,
        admin: Address,
        decimal: u32,
        name: String,
        symbol: String,
    ) -> Result<(), TokenError> {
        if env.storage().instance().has(&DataKey::State) {
            return Err(TokenError::AlreadyInitialized);
        }
        let state = TokenState {
            decimal,
            name,
            symbol,
        };
        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
        Ok(())
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(AllowanceKey { from, spender });
        if let Some(a) = env.storage().temporary().get::<_, AllowanceValue>(&key) {
            if a.expiration_ledger >= env.ledger().sequence() {
                return a.amount;
            }
        }
        0
    }

    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: u32,
    ) -> Result<(), TokenError> {
        from.require_auth();
        if amount < 0 {
            return Err(TokenError::NegativeAmount);
        }
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        let value = AllowanceValue {
            amount,
            expiration_ledger,
        };
        env.storage().temporary().set(&key, &value);
        let current = env.ledger().sequence();
        if expiration_ledger > current {
            let ttl = expiration_ledger - current;
            env.storage().temporary().extend_ttl(&key, ttl, ttl);
        }
        env.events().publish(
            (symbol_short!("approve"), from, spender),
            (amount, expiration_ledger),
        );
        Ok(())
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get::<_, i128>(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), TokenError> {
        from.require_auth();
        Self::do_transfer(&env, &from, &to, amount)
    }

    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        spender.require_auth();
        Self::spend_allowance(&env, &from, &spender, amount)?;
        Self::do_transfer(&env, &from, &to, amount)
    }

    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), TokenError> {
        from.require_auth();
        if amount < 0 {
            return Err(TokenError::NegativeAmount);
        }
        let balance = Self::balance(env.clone(), from.clone());
        if balance < amount {
            return Err(TokenError::InsufficientBalance);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(balance - amount));
        env.events().publish((symbol_short!("burn"), from), amount);
        Ok(())
    }

    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), TokenError> {
        Self::require_admin(&env)?;
        if amount < 0 {
            return Err(TokenError::NegativeAmount);
        }
        let balance = Self::balance(env.clone(), to.clone());
        let new_balance = balance.checked_add(amount).ok_or(TokenError::Overflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &new_balance);
        env.storage().persistent().extend_ttl(
            &DataKey::Balance(to.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        env.events().publish((symbol_short!("mint"), to), amount);
        Ok(())
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), TokenError> {
        Self::require_admin(&env)?;
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events()
            .publish((symbol_short!("set_admin"),), new_admin);
        Ok(())
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
            .unwrap()
    }

    pub fn decimals(env: Env) -> u32 {
        let s: TokenState = env.storage().instance().get(&DataKey::State).unwrap();
        s.decimal
    }

    pub fn name(env: Env) -> String {
        let s: TokenState = env.storage().instance().get(&DataKey::State).unwrap();
        s.name
    }

    pub fn symbol(env: Env) -> String {
        let s: TokenState = env.storage().instance().get(&DataKey::State).unwrap();
        s.symbol
    }

    fn require_admin(env: &Env) -> Result<(), TokenError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn do_transfer(
        env: &Env,
        from: &Address,
        to: &Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        if amount < 0 {
            return Err(TokenError::NegativeAmount);
        }
        let from_bal = env
            .storage()
            .persistent()
            .get::<_, i128>(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if from_bal < amount {
            return Err(TokenError::InsufficientBalance);
        }
        let to_bal = env
            .storage()
            .persistent()
            .get::<_, i128>(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        let new_to = to_bal.checked_add(amount).ok_or(TokenError::Overflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_bal - amount));
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &new_to);
        env.storage().persistent().extend_ttl(
            &DataKey::Balance(to.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );
        env.events().publish(
            (symbol_short!("transfer"), from.clone(), to.clone()),
            amount,
        );
        Ok(())
    }

    fn spend_allowance(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
    ) -> Result<(), TokenError> {
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        let a = env
            .storage()
            .temporary()
            .get::<_, AllowanceValue>(&key)
            .unwrap_or(AllowanceValue {
                amount: 0,
                expiration_ledger: 0,
            });
        if a.expiration_ledger < env.ledger().sequence() {
            return Err(TokenError::AllowanceExpired);
        }
        if a.amount < amount {
            return Err(TokenError::InsufficientAllowance);
        }
        env.storage().temporary().set(
            &key,
            &AllowanceValue {
                amount: a.amount - amount,
                expiration_ledger: a.expiration_ledger,
            },
        );
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    fn setup() -> (Env, Address, AMTTokenClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, AMTToken);
        let client = AMTTokenClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(
            &admin,
            &7u32,
            &String::from_str(&env, "AutoMint Token"),
            &String::from_str(&env, "AMT"),
        );
        (env, admin, client)
    }

    #[test]
    fn test_mint_and_balance() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &10_000_000_000_i128);
        assert_eq!(client.balance(&user), 10_000_000_000_i128);
    }

    #[test]
    fn test_transfer() {
        let (env, _admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        client.mint(&alice, &500_i128);
        client.transfer(&alice, &bob, &200_i128);
        assert_eq!(client.balance(&alice), 300_i128);
        assert_eq!(client.balance(&bob), 200_i128);
    }

    #[test]
    fn test_burn() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &1000_i128);
        client.burn(&user, &300_i128);
        assert_eq!(client.balance(&user), 700_i128);
    }

    #[test]
    fn test_transfer_insufficient_balance() {
        let (env, _admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        client.mint(&alice, &100_i128);
        let result = client.try_transfer(&alice, &bob, &200_i128);
        assert!(result.is_err());
    }

    #[test]
    fn test_double_initialize_fails() {
        let (env, admin, client) = setup();
        let result = client.try_initialize(
            &admin,
            &7u32,
            &String::from_str(&env, "AutoMint Token"),
            &String::from_str(&env, "AMT"),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_burn_more_than_balance_fails() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &100_i128);
        assert!(client.try_burn(&user, &200_i128).is_err());
    }

    #[test]
    fn test_set_admin_and_mint_from_new_admin() {
        let (env, _admin, client) = setup();
        let new_admin = Address::generate(&env);
        client.set_admin(&new_admin);
        let user = Address::generate(&env);
        client.mint(&user, &50_i128);
        assert_eq!(client.balance(&user), 50_i128);
    }

    #[test]
    fn test_approve_and_transfer_from() {
        let (env, _admin, client) = setup();
        let alice = Address::generate(&env);
        let spender = Address::generate(&env);
        let bob = Address::generate(&env);
        client.mint(&alice, &1000_i128);
        client.approve(
            &alice,
            &spender,
            &300_i128,
            &(env.ledger().sequence() + 1000),
        );
        assert_eq!(client.allowance(&alice, &spender), 300_i128);
        client.transfer_from(&spender, &alice, &bob, &150_i128);
        assert_eq!(client.balance(&bob), 150_i128);
        assert_eq!(client.allowance(&alice, &spender), 150_i128);
    }
}
