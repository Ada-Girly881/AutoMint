#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    pub fn initialize(_env: Env, _admin: Address) {
        // Dummy initialize
    }
}
