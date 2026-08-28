use automint_accrual::{AccrualContract, AccrualContractClient};
use automint_bot_nft::{BotNFTContract, BotNFTContractClient};
use automint_marketplace::{MarketplaceContract, MarketplaceContractClient};
use automint_registry::{RegistryContract, RegistryContractClient};
use automint_token::{AMTToken, AMTTokenClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

pub const DEFAULT_DECIMALS: u32 = 7;
pub const DEFAULT_POINTS_PER_AMT: u64 = 100;
pub const DEFAULT_MARKETPLACE_FEE_BPS: u32 = 250;

pub struct Deployment<'a> {
    pub env: Env,
    pub admin: Address,
    pub registry_id: Address,
    pub bot_nft_id: Address,
    pub token_id: Address,
    pub accrual_id: Address,
    pub marketplace_id: Address,
    pub registry: RegistryContractClient<'a>,
    pub bot_nft: BotNFTContractClient<'a>,
    pub token: AMTTokenClient<'a>,
    pub accrual: AccrualContractClient<'a>,
    pub marketplace: MarketplaceContractClient<'a>,
}

#[derive(Clone)]
pub struct DeploymentBuilder {
    admin: Option<Address>,
    token_decimals: u32,
    token_name: &'static str,
    token_symbol: &'static str,
    points_per_amt: u64,
    marketplace_fee_bps: u32,
}

impl Default for DeploymentBuilder {
    fn default() -> Self {
        Self {
            admin: None,
            token_decimals: DEFAULT_DECIMALS,
            token_name: "AutoMint Token",
            token_symbol: "AMT",
            points_per_amt: DEFAULT_POINTS_PER_AMT,
            marketplace_fee_bps: DEFAULT_MARKETPLACE_FEE_BPS,
        }
    }
}

impl DeploymentBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn admin(mut self, admin: Address) -> Self {
        self.admin = Some(admin);
        self
    }

    pub fn token_decimals(mut self, decimals: u32) -> Self {
        self.token_decimals = decimals;
        self
    }

    pub fn token_metadata(mut self, name: &'static str, symbol: &'static str) -> Self {
        self.token_name = name;
        self.token_symbol = symbol;
        self
    }

    pub fn points_per_amt(mut self, points_per_amt: u64) -> Self {
        self.points_per_amt = points_per_amt;
        self
    }

    pub fn marketplace_fee_bps(mut self, fee_bps: u32) -> Self {
        self.marketplace_fee_bps = fee_bps;
        self
    }

    pub fn deploy_all(self, env: Env) -> Deployment<'static> {
        env.mock_all_auths_allowing_non_root_auth();

        let admin = self.admin.unwrap_or_else(|| Address::generate(&env));

        let registry_id = env.register_contract(None, RegistryContract);
        let registry = RegistryContractClient::new(&env, &registry_id);
        registry.initialize(&admin);

        let bot_nft_id = env.register_contract(None, BotNFTContract);
        let bot_nft = BotNFTContractClient::new(&env, &bot_nft_id);
        bot_nft.initialize(&admin, &registry_id);

        let token_id = env.register_contract(None, AMTToken);
        let token = AMTTokenClient::new(&env, &token_id);
        token.initialize(
            &admin,
            &self.token_decimals,
            &String::from_str(&env, self.token_name),
            &String::from_str(&env, self.token_symbol),
        );

        let accrual_id = env.register_contract(None, AccrualContract);
        let accrual = AccrualContractClient::new(&env, &accrual_id);
        accrual.initialize(&admin, &self.points_per_amt);

        let marketplace_id = env.register_contract(None, MarketplaceContract);
        let marketplace = MarketplaceContractClient::new(&env, &marketplace_id);
        marketplace.initialize(&admin, &bot_nft_id, &self.marketplace_fee_bps);

        Deployment {
            env,
            admin,
            registry_id,
            bot_nft_id,
            token_id,
            accrual_id,
            marketplace_id,
            registry,
            bot_nft,
            token,
            accrual,
            marketplace,
        }
    }
}

pub fn deploy_all(env: Env) -> Deployment<'static> {
    DeploymentBuilder::default().deploy_all(env)
}

pub fn register_user(env: &Env, registry: &Address, user: &Address, name: &str) {
    let registry = RegistryContractClient::new(env, registry);
    let _ = registry.register(user, &String::from_str(env, name));
}

pub fn deploy_bot_nft_with_registry(
    env: &Env,
    admin: &Address,
    registry: &Address,
) -> (Address, BotNFTContractClient<'static>) {
    let bot_nft_id = env.register_contract(None, BotNFTContract);
    let bot_nft = BotNFTContractClient::new(env, &bot_nft_id);
    bot_nft.initialize(admin, registry);
    (bot_nft_id, bot_nft)
}
