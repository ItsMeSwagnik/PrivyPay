#![cfg(test)]
//! Unit tests using a lightweight MOCK confidential-token contract, not the
//! real OpenZeppelin one. Testing against the real ConfidentialToken would
//! require generating real ZK proofs (bb.js, browser-side, ~1s each) which
//! isn't feasible inside a `cargo test` Rust unit test. Instead, this mock
//! verifies the ONE thing this contract is actually responsible for: that it
//! forwards each leg's `(from, to, data)` to `confidential_transfer` on the
//! target contract, in order, and that the whole batch reverts if any single
//! leg's call panics -- exactly the atomicity guarantee described in lib.rs.
//!
//! Real proof-carrying integration testing belongs in the demo repo's own
//! `pnpm e2e`-style scripts (TypeScript, against a real deployed token on
//! testnet), not here.

use crate::{
    ConfidentialPayrollBatch, ConfidentialPayrollBatchClient, DelegatedPayrollLeg, PayrollLeg,
};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, vec, Address, Bytes, Env, Vec};

/// Records each `confidential_transfer` / `confidential_transfer_from` call it
/// receives so tests can assert on call order/count. Panics if `data` starts
/// with the byte 0xFF, to simulate an invalid-proof leg failing mid-batch.
#[contract]
struct MockConfidentialToken;

#[contractimpl]
impl MockConfidentialToken {
    pub fn confidential_transfer(env: Env, from: Address, to: Address, data: Bytes) {
        from.require_auth();
        Self::record_and_maybe_panic(&env, "direct", &from, &to, &data);
    }

    pub fn confidential_transfer_from(env: Env, spender: Address, from: Address, to: Address, data: Bytes) {
        spender.require_auth();
        Self::record_and_maybe_panic(&env, "delegated", &from, &to, &data);
    }

    fn record_and_maybe_panic(env: &Env, mode: &'static str, from: &Address, to: &Address, data: &Bytes) {
        if data.len() > 0 && data.get(0) == Some(0xFF) {
            panic!("simulated invalid proof");
        }
        // Two fixed, distinct instance-storage keys -- avoids pulling in
        // soroban_sdk::String / alloc just to build a dynamic key.
        let key = if mode == "direct" { "direct_calls" } else { "delegated_calls" };
        let mut calls: Vec<(Address, Address)> =
            env.storage().instance().get(&key).unwrap_or(vec![env]);
        calls.push_back((from.clone(), to.clone()));
        env.storage().instance().set(&key, &calls);
    }
}

fn leg(env: &Env, to: &Address, marker: u8) -> PayrollLeg {
    PayrollLeg {
        to: to.clone(),
        data: Bytes::from_array(env, &[marker, 1, 2, 3]),
    }
}

fn delegated_leg(env: &Env, to: &Address, marker: u8) -> DelegatedPayrollLeg {
    DelegatedPayrollLeg {
        to: to.clone(),
        data: Bytes::from_array(env, &[marker, 1, 2, 3]),
    }
}

#[test]
fn runs_all_legs_in_order() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(MockConfidentialToken, ());
    let batch_id = env.register(ConfidentialPayrollBatch, ());
    let batch = ConfidentialPayrollBatchClient::new(&env, &batch_id);

    let employer = Address::generate(&env);
    let emp_a = Address::generate(&env);
    let emp_b = Address::generate(&env);
    let emp_c = Address::generate(&env);

    let legs = vec![
        &env,
        leg(&env, &emp_a, 1),
        leg(&env, &emp_b, 2),
        leg(&env, &emp_c, 3),
    ];

    assert_eq!(batch.batch_size(&legs), 3);

    batch.run_payroll(&token_id, &employer, &legs);

    let env2 = env.clone();
    let calls: Vec<(Address, Address)> = env2
        .as_contract(&token_id, || env2.storage().instance().get(&"direct_calls").unwrap());
    assert_eq!(calls.len(), 3);
    assert_eq!(calls.get(0).unwrap(), (employer.clone(), emp_a));
    assert_eq!(calls.get(1).unwrap(), (employer.clone(), emp_b));
    assert_eq!(calls.get(2).unwrap(), (employer, emp_c));
}

#[test]
#[should_panic(expected = "simulated invalid proof")]
fn reverts_whole_batch_if_one_leg_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(MockConfidentialToken, ());
    let batch_id = env.register(ConfidentialPayrollBatch, ());
    let batch = ConfidentialPayrollBatchClient::new(&env, &batch_id);

    let employer = Address::generate(&env);
    let emp_a = Address::generate(&env);
    let emp_bad = Address::generate(&env);

    let legs = vec![
        &env,
        leg(&env, &emp_a, 1),
        leg(&env, &emp_bad, 0xFF), // this one panics inside the mock
    ];

    // Should panic -- and because Soroban cross-contract calls only commit on
    // successful transaction completion, emp_a's leg (which ran first) is
    // rolled back too. We can't directly assert "no storage was written"
    // after a panic unwinds the test, but the #[should_panic] here is the
    // load-bearing assertion: the batch does not silently partially succeed.
    batch.run_payroll(&token_id, &employer, &legs);
}

#[test]
#[should_panic]
fn requires_auth_from_the_sender() {
    let env = Env::default();
    // Deliberately NOT calling mock_all_auths() here -- we want real auth
    // enforcement so this test proves `from.require_auth()` actually gates
    // the call.

    let token_id = env.register(MockConfidentialToken, ());
    let batch_id = env.register(ConfidentialPayrollBatch, ());
    let batch = ConfidentialPayrollBatchClient::new(&env, &batch_id);

    let employer = Address::generate(&env);
    let emp_a = Address::generate(&env);

    let legs = vec![&env, leg(&env, &emp_a, 1)];

    batch.run_payroll(&token_id, &employer, &legs);
}

// ----- delegated ("autopilot") mode -----------------------------------

#[test]
fn delegated_payroll_runs_all_legs_without_employer_signature() {
    let env = Env::default();
    // No mock_all_auths(): this test's whole point is that
    // run_delegated_payroll succeeds WITHOUT the employer signing anything.
    // The mock's confidential_transfer_from still calls
    // spender.require_auth() -- satisfied here because the caller (this
    // contract, invoking cross-contract) is the batch contract's own
    // address, which Soroban treats as self-authorized for its own outgoing
    // calls.

    let token_id = env.register(MockConfidentialToken, ());
    let batch_id = env.register(ConfidentialPayrollBatch, ());
    let batch = ConfidentialPayrollBatchClient::new(&env, &batch_id);

    let employer = Address::generate(&env);
    let emp_a = Address::generate(&env);
    let emp_b = Address::generate(&env);

    let legs = vec![
        &env,
        delegated_leg(&env, &emp_a, 1),
        delegated_leg(&env, &emp_b, 2),
    ];

    assert_eq!(batch.delegated_batch_size(&legs), 2);

    batch.run_delegated_payroll(&token_id, &employer, &legs);

    let env2 = env.clone();
    let calls: Vec<(Address, Address)> = env2.as_contract(&token_id, || {
        env2.storage().instance().get(&"delegated_calls").unwrap()
    });
    assert_eq!(calls.len(), 2);
    assert_eq!(calls.get(0).unwrap(), (employer.clone(), emp_a));
    assert_eq!(calls.get(1).unwrap(), (employer, emp_b));
}

#[test]
#[should_panic(expected = "simulated invalid proof")]
fn delegated_payroll_reverts_whole_batch_if_one_leg_fails() {
    let env = Env::default();

    let token_id = env.register(MockConfidentialToken, ());
    let batch_id = env.register(ConfidentialPayrollBatch, ());
    let batch = ConfidentialPayrollBatchClient::new(&env, &batch_id);

    let employer = Address::generate(&env);
    let emp_a = Address::generate(&env);
    let emp_bad = Address::generate(&env);

    let legs = vec![
        &env,
        delegated_leg(&env, &emp_a, 1),
        delegated_leg(&env, &emp_bad, 0xFF),
    ];

    batch.run_delegated_payroll(&token_id, &employer, &legs);
}
