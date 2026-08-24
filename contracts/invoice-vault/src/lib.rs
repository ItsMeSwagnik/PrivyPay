//! InvoiceVault
//!
//! A minimal, permissionless B2B invoicing registry layered on top of an
//! already-deployed OpenZeppelin `ConfidentialToken` contract. It stores only
//! PUBLIC invoice metadata (who owes whom, a free-text memo/reference, and a
//! status) on-chain -- the actual amount is never stored or passed to this
//! contract in the clear. Payment itself moves through the underlying
//! confidential token's `confidential_transfer`, exactly as in
//! `ConfidentialPayrollBatch`, so the invoice amount stays shielded end to
//! end; only the fact that an invoice exists, who its two named parties are,
//! and whether it's been paid are public.
//!
//! # Why amounts are never an argument here
//!
//! Same reason as `ConfidentialPayrollBatch`: a valid confidential transfer
//! requires a zero-knowledge proof generated CLIENT-SIDE from the payer's
//! private balance-opening secrets. This contract cannot generate that proof,
//! so `pay_invoice` takes an already-proven `data: Bytes` envelope (built by
//! the payer's frontend via the SDK's `encodeTransferData()`) and forwards it
//! verbatim to the token contract.
//!
//! # Permissionless by design
//!
//! There is no admin, no owner, no allowlist of who may create an invoice.
//! Any account can call `create_invoice` naming any `buyer`/`supplier` pair --
//! this mirrors how an invoice works in the real world (anyone can send
//! anyone else a bill; whether it ever gets paid is a separate question).
//! The only access restrictions in this contract are inherent to what an
//! invoice IS, not arbitrary gates:
//!   - only the named `buyer` can pay it (`pay_invoice` requires
//!     `buyer.require_auth()` and checks the caller matches the invoice's
//!     stored buyer -- the same way an escrow is allowed to be restricted to
//!     its two named counterparties)
//!   - only the named `buyer` or `supplier` can cancel an unpaid invoice
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, vec, Address, Bytes,
    Env, String, Symbol, Val, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Created,
    Paid,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub buyer: Address,
    pub supplier: Address,
    /// Free-text reference (PO number, description, etc). Public -- do not
    /// put anything here that should stay confidential.
    pub memo: String,
    pub status: InvoiceStatus,
}

#[contracttype]
pub enum DataKey {
    /// Monotonic counter, next invoice id to hand out.
    NextId,
    Invoice(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum InvoiceVaultError {
    InvoiceNotFound = 1,
    InvoiceNotPayable = 2,
    NotTheBuyer = 3,
    NotAParty = 4,
}

#[contract]
pub struct InvoiceVault;

#[contractimpl]
impl InvoiceVault {
    /// Creates a new invoice from `supplier`'s perspective (or on `supplier`'s
    /// behalf -- the caller can be anyone, e.g. a shared billing tool both
    /// parties use). Returns the new invoice's id. No amount is recorded.
    pub fn create_invoice(env: Env, buyer: Address, supplier: Address, memo: String) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        let invoice = Invoice { buyer, supplier, memo, status: InvoiceStatus::Created };
        env.storage().persistent().set(&DataKey::Invoice(id), &invoice);
        id
    }

    /// Pays `invoice_id` via an already-proven confidential transfer leg from
    /// the invoice's `buyer` to its `supplier`, then marks the invoice Paid.
    /// `data` is the XDR-encoded `{payload, proof}` envelope produced
    /// client-side by the buyer's frontend, exactly as in
    /// `ConfidentialPayrollBatch::run_payroll`.
    ///
    /// Reverts (and leaves the invoice untouched, since Soroban only commits
    /// state on full transaction success) if: the invoice doesn't exist, is
    /// already Paid or Cancelled, the caller isn't the invoice's named buyer,
    /// or the underlying `confidential_transfer` call itself fails (bad
    /// proof, unregistered supplier, insufficient balance, etc).
    pub fn pay_invoice(env: Env, confidential_token: Address, invoice_id: u64, data: Bytes) {
        let mut invoice = Self::require_invoice(&env, invoice_id);

        if invoice.status != InvoiceStatus::Created {
            panic_with_error!(&env, InvoiceVaultError::InvoiceNotPayable);
        }

        invoice.buyer.require_auth();

        let method = Symbol::new(&env, "confidential_transfer");
        let args: Vec<Val> = vec![
            &env,
            invoice.buyer.to_val(),
            invoice.supplier.to_val(),
            data.to_val(),
        ];
        let _: () = env.invoke_contract(&confidential_token, &method, args);

        invoice.status = InvoiceStatus::Paid;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);
    }

    /// Cancels an unpaid invoice. Callable only by the invoice's buyer or
    /// supplier -- restricted to the two named parties, not an admin gate.
    pub fn cancel_invoice(env: Env, invoice_id: u64, caller: Address) {
        caller.require_auth();
        let mut invoice = Self::require_invoice(&env, invoice_id);

        if caller != invoice.buyer && caller != invoice.supplier {
            panic_with_error!(&env, InvoiceVaultError::NotAParty);
        }
        if invoice.status != InvoiceStatus::Created {
            panic_with_error!(&env, InvoiceVaultError::InvoiceNotPayable);
        }

        invoice.status = InvoiceStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);
    }

    /// Reads an invoice's public metadata and status. No auth required --
    /// this is public information by design (same as any on-chain balance or
    /// address is public; only the confidential AMOUNT stays hidden).
    pub fn get_invoice(env: Env, invoice_id: u64) -> Invoice {
        Self::require_invoice(&env, invoice_id)
    }

    fn require_invoice(env: &Env, invoice_id: u64) -> Invoice {
        env.storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .unwrap_or_else(|| panic_with_error!(env, InvoiceVaultError::InvoiceNotFound))
    }
}

mod test;
