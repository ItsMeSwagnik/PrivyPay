#![cfg(test)]
//! Same mocking approach as `ConfidentialPayrollBatch`'s tests: a lightweight
//! mock confidential token, since generating real ZK proofs isn't feasible in
//! a `cargo test` unit test. See that crate's test.rs for the rationale.

use crate::{InvoiceStatus, InvoiceVault, InvoiceVaultClient};
use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, vec, Address, Bytes, Env, String, Vec,
};

#[contract]
struct MockConfidentialToken;

#[contractimpl]
impl MockConfidentialToken {
    pub fn confidential_transfer(env: Env, from: Address, to: Address, data: Bytes) {
        from.require_auth();
        if data.len() > 0 && data.get(0) == Some(0xFF) {
            panic!("simulated invalid proof");
        }
        let mut calls: Vec<(Address, Address)> =
            env.storage().instance().get(&"calls").unwrap_or(vec![&env]);
        calls.push_back((from, to));
        env.storage().instance().set(&"calls", &calls);
    }
}

fn setup(env: &Env) -> (Address, InvoiceVaultClient<'_>, Address, Address) {
    let token_id = env.register(MockConfidentialToken, ());
    let vault_id = env.register(InvoiceVault, ());
    let vault = InvoiceVaultClient::new(env, &vault_id);
    let buyer = Address::generate(env);
    let supplier = Address::generate(env);
    (token_id, vault, buyer, supplier)
}

#[test]
fn create_invoice_returns_sequential_ids() {
    let env = Env::default();
    let (_token, vault, buyer, supplier) = setup(&env);

    let id1 = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-001"));
    let id2 = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-002"));
    assert_eq!(id1, 0);
    assert_eq!(id2, 1);

    let inv = vault.get_invoice(&id1);
    assert_eq!(inv.buyer, buyer);
    assert_eq!(inv.supplier, supplier);
    assert_eq!(inv.status, InvoiceStatus::Created);
}

#[test]
fn pay_invoice_forwards_to_token_and_marks_paid() {
    let env = Env::default();
    env.mock_all_auths();
    let (token_id, vault, buyer, supplier) = setup(&env);

    let id = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-100"));
    let data = Bytes::from_array(&env, &[1, 2, 3]);
    vault.pay_invoice(&token_id, &id, &data);

    let inv = vault.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Paid);

    let env2 = env.clone();
    let calls: Vec<(Address, Address)> = env2
        .as_contract(&token_id, || env2.storage().instance().get(&"calls").unwrap());
    assert_eq!(calls.len(), 1);
    assert_eq!(calls.get(0).unwrap(), (buyer, supplier));
}

#[test]
#[should_panic]
fn pay_invoice_fails_if_not_the_buyer() {
    let env = Env::default();
    // Deliberately no mock_all_auths() -- proves buyer.require_auth() gates
    // this, so a caller who isn't the invoice's buyer can't pay it.
    let (token_id, vault, buyer, supplier) = setup(&env);
    let id = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-1"));
    let data = Bytes::from_array(&env, &[1]);
    vault.pay_invoice(&token_id, &id, &data);
}

#[test]
#[should_panic]
fn pay_invoice_fails_if_already_paid() {
    let env = Env::default();
    env.mock_all_auths();
    let (token_id, vault, buyer, supplier) = setup(&env);
    let id = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-1"));
    let data = Bytes::from_array(&env, &[1]);
    vault.pay_invoice(&token_id, &id, &data);
    vault.pay_invoice(&token_id, &id, &data); // second pay should panic
}

#[test]
fn cancel_invoice_by_supplier() {
    let env = Env::default();
    env.mock_all_auths();
    let (_token, vault, buyer, supplier) = setup(&env);
    let id = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-1"));
    vault.cancel_invoice(&id, &supplier);
    assert_eq!(vault.get_invoice(&id).status, InvoiceStatus::Cancelled);
}

#[test]
#[should_panic]
fn cancel_invoice_fails_for_unrelated_caller() {
    let env = Env::default();
    env.mock_all_auths();
    let (_token, vault, buyer, supplier) = setup(&env);
    let id = vault.create_invoice(&buyer, &supplier, &String::from_str(&env, "PO-1"));
    let stranger = Address::generate(&env);
    vault.cancel_invoice(&id, &stranger);
}

#[test]
#[should_panic]
fn get_invoice_fails_for_unknown_id() {
    let env = Env::default();
    let (_token, vault, _buyer, _supplier) = setup(&env);
    vault.get_invoice(&999);
}
