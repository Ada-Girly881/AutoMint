//! Shared test-only helpers for exercising ledger/TTL behaviour across the
//! AutoMint contracts (registry, bot_nft, token, accrual, marketplace).
//!
//! Every contract in this workspace stores state in *persistent* or
//! *temporary* Soroban storage with an explicit TTL (`extend_ttl`, bumped by
//! a `LEDGER_BUMP` constant once the remaining TTL drops below
//! `LEDGER_THRESHOLD`). Three prior incidents (AM-028, AM-048, AM-080)
//! caused data loss because an entry's TTL expired — and the ledger
//! sequence advanced past its `live_until_ledger_seq` — without any test
//! coverage catching it. This crate gives every contract's test suite a
//! single, consistent way to simulate that.
//!
//! This is a dev-only crate: it depends unconditionally on
//! `soroban-sdk`'s `testutils` feature and is only ever pulled in via
//! `[dev-dependencies]` in each contract's `Cargo.toml`.

#![no_std]

use soroban_sdk::{testutils::Ledger, Env};

/// Advances the simulated ledger by `ledgers` sequence numbers, and by a
/// proportional amount of wall-clock time (assuming ~5s per ledger, which
/// matches the `LEDGER_BUMP`/`LEDGER_THRESHOLD` constants used throughout
/// this workspace's contracts, e.g. `contracts/registry/src/lib.rs`).
///
/// Soroban's storage TTL model is sequence-number based: a persistent or
/// temporary entry becomes inaccessible (archived, in Soroban terminology)
/// once `env.ledger().sequence()` exceeds the entry's `live_until_ledger_seq`
/// (set when the entry was written or last had its TTL bumped via
/// `extend_ttl`). This helper is the single place that advances the
/// sequence number so every contract's TTL tests do it the same way.
pub fn advance_ledger(env: &Env, ledgers: u32) {
    env.ledger().with_mut(|li| {
        li.sequence_number = li.sequence_number.saturating_add(ledgers);
        li.timestamp = li.timestamp.saturating_add((ledgers as u64).saturating_mul(5));
    });
}

/// Convenience wrapper: advances the ledger just past the given TTL bump
/// amount (as used by a contract's `LEDGER_BUMP` constant), guaranteeing
/// any entry written with that TTL and not since refreshed is now expired.
pub fn advance_past_ttl(env: &Env, ledger_bump: u32) {
    advance_ledger(env, ledger_bump + 1);
}
