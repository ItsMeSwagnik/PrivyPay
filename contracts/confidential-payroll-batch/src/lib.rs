//! ConfidentialPayrollBatch
//!
//! A thin, permissionless orchestration contract that atomically runs a batch
//! of confidential transfers against an already-deployed OpenZeppelin
//! `ConfidentialToken` contract (see the `stellar-confidential-token-demo`
//! repo's `contracts/token`, or `packages/tokens/src/confidential/mod.rs` in
//! `OpenZeppelin/stellar-contracts` for the trait this calls into).
//!
//! # Why this contract calls the token via `invoke_contract` rather than
//! importing the `ConfidentialToken` trait directly:
//!
//! Every proof-carrying entry point (`confidential_transfer`,
//! `confidential_transfer_from`, `set_spender`, ...) requires a zero-knowledge
//! proof and a `{payload, proof}` XDR `data: Bytes` envelope generated
//! CLIENT-SIDE, in the browser, from the caller's private balance-opening
//! secrets (see `packages/sdk/src/witness/*.ts` and
//! `payload.ts::encodeTransferData`/`encodeSpenderTransferData` in the demo
//! repo). A Soroban contract has no access to those secrets and cannot
//! generate a proof itself. So this contract's job is narrow and honest:
//! given a batch of ALREADY-PROVEN transfer legs (built by a frontend before
//! submission), invoke each one atomically, so the whole payroll run either
//! fully succeeds or fully reverts together.
//!
//! # Two ways to run payroll
//!
//! 1. **`run_payroll`** -- the employer signs every batch themselves, calling
//!    `confidential_transfer` directly from their own spendable balance. Simple,
//!    no prior setup, but requires a fresh employer signature every pay period.
//!
//! 2. **`run_delegated_payroll`** -- the employer calls the token's own
//!    `set_spender(this_contract_address, live_until_ledger, data)` ONE TIME
//!    (off-chain-proven, outside this contract, using the standard SDK flow),
//!    delegating a spending allowance to THIS contract's address as `spender`.
//!    After that, this contract can call `confidential_transfer_from` on the
//!    employer's behalf for every subsequent payroll run, up to the escrowed
//!    allowance and until `live_until_ledger` expires -- no employer signature
//!    needed per run. The token's `confidential_transfer_from` entry point
//!    itself requires `spender.require_auth()`; since the spender here IS this
//!    contract's own address, Soroban's cross-contract auth model treats a
//!    contract's own outgoing calls as self-authorized (no separate signature
//!    hop needed for that principal), which is what makes autopilot payroll
//!    possible at all.
//!
//! Both entry points revert the whole batch if any single leg fails
//! (unregistered recipient, invalid proof, expired/insufficient delegation,
//! frozen account, etc.) -- Soroban's cross-contract call semantics give this
//! atomicity for free.
//!
//! # Permissionless by design
//!
//! There is no stored admin/owner/employer address anywhere in this contract.
//! Any account can call `run_payroll` for itself, and any account that has
//! been separately, directly delegated (via the token's own `set_spender`) can
//! have its allowance spent by whichever `spender` address it named -- which
//! may or may not be this contract, entirely at the delegator's discretion.
//! This contract enforces no policy of its own; it only forwards
//! already-authorized, already-proven operations.
#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, vec, Address, Bytes, Env, Symbol, Val, Vec};

/// One employee's pre-built, already-proven confidential transfer leg, for use
/// with [`ConfidentialPayrollBatch::run_payroll`].
///
/// `data` is the XDR-encoded `{ payload, proof }` envelope produced by the
/// SDK's `encodeTransferData()` in the browser -- this contract treats it as
/// an opaque blob and forwards it byte-for-byte to the token contract's
/// `confidential_transfer`. It never sees, needs, or could decrypt the
/// underlying amount.
#[contracttype]
#[derive(Clone)]
pub struct PayrollLeg {
    pub to: Address,
    pub data: Bytes,
}

/// One employee's pre-built, already-proven SPENDER transfer leg, for use with
/// [`ConfidentialPayrollBatch::run_delegated_payroll`]. `data` is the
/// XDR-encoded `SpenderTransferData` envelope (`{ payload, proof }`) produced
/// by the SDK's `encodeSpenderTransferData()`, proven against the employer's
/// escrowed allowance rather than their live spendable balance.
#[contracttype]
#[derive(Clone)]
pub struct DelegatedPayrollLeg {
    pub to: Address,
    pub data: Bytes,
}

#[contract]
pub struct ConfidentialPayrollBatch;

#[contractimpl]
impl ConfidentialPayrollBatch {
    /// Atomically runs every leg in `legs` as a direct confidential transfer
    /// from `from`'s spendable balance on `confidential_token`. `from` must
    /// sign this transaction themselves (this is the "employer signs every
    /// run" mode).
    pub fn run_payroll(env: Env, confidential_token: Address, from: Address, legs: Vec<PayrollLeg>) {
        from.require_auth();

        let method = Symbol::new(&env, "confidential_transfer");

        for leg in legs.iter() {
            let args: Vec<Val> = vec![&env, from.to_val(), leg.to.to_val(), leg.data.to_val()];
            let _: () = env.invoke_contract(&confidential_token, &method, args);
        }
    }

    /// Atomically runs every leg in `legs` as a `confidential_transfer_from`
    /// call, spending out of `employer`'s allowance previously escrowed to
    /// THIS contract's own address via the token's `set_spender`. No signature
    /// from `employer` is required for this call -- the one-time `set_spender`
    /// approval (done separately, directly against the token contract) is
    /// what authorized every subsequent run, up to the escrowed amount and
    /// `live_until_ledger`.
    ///
    /// Anyone may call this to *execute* a due payroll run (e.g. a scheduler
    /// service, or the employer themselves) -- it is intentionally
    /// permissionless to trigger, since the real authorization already
    /// happened at `set_spender` time and is enforced by the token contract
    /// itself, not by this contract deciding who's allowed to press "run".
    pub fn run_delegated_payroll(
        env: Env,
        confidential_token: Address,
        employer: Address,
        legs: Vec<DelegatedPayrollLeg>,
    ) {
        let method = Symbol::new(&env, "confidential_transfer_from");
        let this_contract = env.current_contract_address();

        for leg in legs.iter() {
            let args: Vec<Val> = vec![
                &env,
                this_contract.to_val(),
                employer.to_val(),
                leg.to.to_val(),
                leg.data.to_val(),
            ];
            let _: () = env.invoke_contract(&confidential_token, &method, args);
        }
    }

    /// Convenience read: how many legs a given direct-mode batch contains,
    /// without executing it. Purely a view -- no auth, no state change.
    pub fn batch_size(_env: Env, legs: Vec<PayrollLeg>) -> u32 {
        legs.len()
    }

    /// Same convenience read for delegated-mode batches.
    pub fn delegated_batch_size(_env: Env, legs: Vec<DelegatedPayrollLeg>) -> u32 {
        legs.len()
    }
}

mod test;
