# 🔐 PrivyPay — Private B2B Payroll & Invoicing on Stellar

**Confidential payroll and B2B invoicing powered by UltraHonk ZK proofs on Stellar Soroban.**

PrivyPay brings financial privacy to on-chain payroll and invoicing. Transaction amounts are shielded using Pedersen commitments — only the named sender, recipient, and a designated auditor can ever see them. Everything else (the fact a payment happened, who the parties are) is public by design.

---

## 📌 What It Does

- **Confidential Wallet** — deposit XLM into a shielded balance, merge, transfer privately, withdraw back to public
- **Payroll** — employer runs an atomic batch of confidential transfers to all employees in one transaction; either fully succeeds or fully reverts
- **Delegated Payroll** — employer approves once via `set_spender`, payroll runs on schedule without a fresh signature every cycle
- **B2B Invoicing** — create invoices on-chain (public metadata, private amount), pay via confidential transfer, cancel if needed
- **Auditor Console** — compliance auditor decrypts every transfer amount using a designated Grumpkin key, without any account cooperation
- **Selective Disclosure** — prove a single payment amount to a third party via a one-time ZK proof, without revealing anything else

---

## ⚙️ How It Works

1. **Register** — derives Grumpkin keypair from a Freighter signature, binds it to the token contract with a UltraHonk ZK proof
2. **Deposit** — moves public XLM into a confidential receiving balance (no proof needed)
3. **Merge** — folds receiving → spendable balance
4. **Transfer / Payroll** — generates a client-side UltraHonk proof, submits `confidential_transfer`; amount is a Pedersen commitment on-chain
5. **Auditor** — designated auditor key decrypts every transfer's dual ECDH ciphertext without account cooperation
6. **Selective Disclosure** — holder proves a single payment to a third party via ZK, without revealing anything else
7. **Withdraw** — converts confidential balance back to public XLM

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔒 Shielded Amounts | Pedersen commitments on-chain — amounts invisible to everyone except sender, recipient, auditor |
| ⚡ Atomic Payroll Batch | All employee transfers succeed or all revert — no partial payroll runs |
| 🤖 Delegated Payroll | One-time `set_spender` approval enables scheduled payroll without repeated employer signatures |
| 🧾 B2B Invoicing | On-chain invoice registry with public metadata, private payment amount |
| 🕵️ Auditor Console | Compliance decryption of all transfers via dual ECDH — no account cooperation needed |
| 🔍 Selective Disclosure | Prove a specific payment to a third party via ZK without revealing anything else |
| 🔑 Freighter Integration | Deterministic Grumpkin key derivation from a Freighter wallet signature |
| 🌐 Permissionless | No admin, no owner, no allowlist — any account can register, pay, invoice |

---

## 📂 Project Structure

```
PrivyPay/
├── contracts/
│   ├── confidential-payroll-batch/       # Soroban: atomic batch of confidential transfers
│   │   ├── src/
│   │   │   ├── lib.rs                    # ConfidentialPayrollBatch contract
│   │   │   └── test.rs                   # Unit tests
│   │   └── Cargo.toml
│   └── invoice-vault/                    # Soroban: B2B invoice registry + confidential payment
│       ├── src/
│       │   ├── lib.rs                    # InvoiceVault contract
│       │   └── test.rs                   # Unit tests
│       └── Cargo.toml
├── frontend/                             # Next.js 16 app
│   ├── app/
│   │   ├── page.tsx                      # Landing page
│   │   ├── layout.tsx                    # Root layout
│   │   └── (app)/
│   │       ├── wallet/page.tsx           # Confidential wallet — deposit, merge, transfer, withdraw
│   │       ├── payroll/page.tsx          # Employer payroll dashboard
│   │       ├── invoices/page.tsx         # B2B invoice create / pay / lookup
│   │       ├── auditor/page.tsx          # Compliance auditor console
│   │       └── verify/page.tsx           # Selective disclosure verifier
│   ├── components/
│   │   ├── waitlist-hero.tsx             # Landing page hero
│   │   ├── liquid-background.tsx         # Canvas particle background
│   │   ├── app-nav.tsx                   # App navigation
│   │   ├── page-shell.tsx                # Shared page wrapper
│   │   ├── log-panel.tsx                 # Transaction log panel
│   │   └── ui/                           # shadcn/ui components
│   ├── lib/
│   │   ├── wallet.ts                     # ConfidentialWallet class (ZK prove + submit)
│   │   ├── deployment.ts                 # Contract addresses + network config
│   │   ├── rpc.ts                        # ChainClient + IndexerClient factory
│   │   ├── freighter.ts                  # Freighter wallet adapter + message signer
│   │   ├── bb-loader.ts                  # bb.js UltraHonk backend loader
│   │   ├── derive-key.ts                 # Deterministic Grumpkin key derivation
│   │   └── format.ts                     # XLM formatting helpers
│   └── vendor/
│       ├── sdk/                          # @ctd/sdk — Grumpkin/Poseidon2 crypto + chain client
│       └── disclosure/                   # Selective disclosure circuit artifacts
├── Cargo.toml                            # Workspace root
└── README.md
```

---

## 🔗 Deployed Contracts (Stellar Testnet)

| Contract | Address |
|---|---|
| Confidential Token | [`CCTNP6DDSR54WIVXXBWYDGZR2K5IBPKHPDDTSBYBHOGI4EOQRKB6AUXS`](https://stellar.expert/explorer/testnet/contract/CCTNP6DDSR54WIVXXBWYDGZR2K5IBPKHPDDTSBYBHOGI4EOQRKB6AUXS) |
| Verifier | [`CDVAOCM6KFFCNFRK2ZREHVJ3T2S2OSQFD4CZUYKMJHHZ5TBC6BEQBF3E`](https://stellar.expert/explorer/testnet/contract/CDVAOCM6KFFCNFRK2ZREHVJ3T2S2OSQFD4CZUYKMJHHZ5TBC6BEQBF3E) |
| Auditor | [`CBPY4UGGVBFK7YKSET4NSSJDY4JU6RCOXJZNGUBVEBOBNTYZCJGELF2X`](https://stellar.expert/explorer/testnet/contract/CBPY4UGGVBFK7YKSET4NSSJDY4JU6RCOXJZNGUBVEBOBNTYZCJGELF2X) |
| Underlying (XLM SAC) | [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| Factory | [`CA7KMB4NMCZ3EA34RKA4VTJ6W7MLRURW62NK3FOWBKSZETS2D4P2DIS5`](https://stellar.expert/explorer/testnet/contract/CA7KMB4NMCZ3EA34RKA4VTJ6W7MLRURW62NK3FOWBKSZETS2D4P2DIS5) |
| Payroll Batch | [`CDLI6RUL6EQJEHYJBGSOG5DIMKIMNTWNTUKRK4GVHVDCZFWYQCWVW3L5`](https://stellar.expert/explorer/testnet/contract/CDLI6RUL6EQJEHYJBGSOG5DIMKIMNTWNTUKRK4GVHVDCZFWYQCWVW3L5) |
| Invoice Vault | [`CAYIM5I7JVP2NGA5Z3KEBYCCVTNKWQQ2TODCHDNESZTTP7QH3BSH5O5P`](https://stellar.expert/explorer/testnet/contract/CAYIM5I7JVP2NGA5Z3KEBYCCVTNKWQQ2TODCHDNESZTTP7QH3BSH5O5P) |

---

## 📋 Contract Functions

### ConfidentialPayrollBatch

#### `run_payroll(confidential_token, from, legs)`
Atomically runs every leg as a direct `confidential_transfer` from `from`'s spendable balance. `from` must sign. All legs succeed or all revert.

#### `run_delegated_payroll(confidential_token, employer, legs)`
Runs every leg as `confidential_transfer_from`, spending out of `employer`'s allowance previously escrowed via `set_spender`. No employer signature needed per run.

#### `batch_size(legs) → u32`
View-only. Returns the number of legs in a direct-mode batch.

#### `delegated_batch_size(legs) → u32`
View-only. Returns the number of legs in a delegated-mode batch.

```rust
struct PayrollLeg {
    to: Address,
    data: Bytes,   // XDR-encoded { payload, proof } envelope — opaque to this contract
}

struct DelegatedPayrollLeg {
    to: Address,
    data: Bytes,   // XDR-encoded SpenderTransferData envelope
}
```

---

### InvoiceVault

#### `create_invoice(buyer, supplier, memo) → u64`
Creates a new invoice, stores public metadata, returns invoice ID. Amount is never an argument.

#### `pay_invoice(confidential_token, invoice_id, data)`
Pays an invoice via an already-proven confidential transfer, then marks it Paid. Reverts if invoice doesn't exist, is already paid/cancelled, or the proof fails.

#### `cancel_invoice(invoice_id, caller)`
Cancels an unpaid invoice. Only the named buyer or supplier can cancel.

#### `get_invoice(invoice_id) → Invoice`
Returns public invoice metadata and status. No auth required.

```rust
struct Invoice {
    buyer: Address,
    supplier: Address,
    memo: String,       // PO number, description — public, never put amounts here
    status: InvoiceStatus,
}

enum InvoiceStatus { Created, Paid, Cancelled }
```

---

## 🔁 Frontend ↔ Contract Flow

```
Browser (Freighter)
  │
  ├─ derive Grumpkin keypair from wallet signature
  ├─ generate UltraHonk proof client-side (bb.js)
  │
  ├─ wallet/     → confidential_transfer (token contract)
  ├─ payroll/    → run_payroll / run_delegated_payroll (payroll batch contract)
  │                  └─ cross-contract → confidential_transfer (token contract)
  ├─ invoices/   → create_invoice / pay_invoice (invoice vault contract)
  │                  └─ cross-contract → confidential_transfer (token contract)
  ├─ auditor/    → decrypt all transfer amounts via auditor Grumpkin key (client-side)
  └─ verify/     → prove single payment via disclosure ZK circuit (client-side)
```

---

## 🔐 Permission Model

| Action | Permission |
|---|---|
| Register confidential account | ✅ Anyone |
| Deposit / Withdraw | ✅ Account owner |
| Transfer | ✅ Account owner (with ZK proof) |
| Run payroll batch | ✅ Employer (signs batch) |
| Run delegated payroll | ✅ Anyone (employer approved via `set_spender`) |
| Create invoice | ✅ Anyone |
| Pay invoice | ✅ Named buyer only |
| Cancel invoice | ✅ Named buyer or supplier only |
| Audit all transfers | ✅ Designated auditor key only |
| See transfer amounts | ❌ Not possible without sender/recipient/auditor key |

---

## 🚀 Setup & Local Development

### Prerequisites

```bash
# Rust + wasm target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# Stellar CLI >= 25.2.0
stellar --version

# Node >= 20, pnpm 10
npm i -g pnpm@10

# Freighter browser extension — switch to Testnet
# https://freighter.app/
```

### 1. Clone & install frontend dependencies

```bash
git clone <repo-url>
cd PrivyPay/frontend
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

`.env.local` already has all deployed contract addresses — no changes needed for testnet.

### 3. Run the frontend

```bash
pnpm dev
```

Open `http://localhost:3000`. Connect Freighter (set to Testnet).

---

### Build & test the Soroban contracts

```bash
# From repo root
stellar contract build
cargo test
```

Outputs:
- `target/wasm32v1-none/release/confidential_payroll_batch.wasm`
- `target/wasm32v1-none/release/invoice_vault.wasm`

### Deploy your own contracts to testnet

```bash
stellar keys generate admin --network testnet --fund

stellar contract deploy \
  --wasm target/wasm32v1-none/release/confidential_payroll_batch.wasm \
  --source-account admin \
  --network testnet

stellar contract deploy \
  --wasm target/wasm32v1-none/release/invoice_vault.wasm \
  --source-account admin \
  --network testnet
```

Update `frontend/lib/deployment.ts` with the printed contract IDs.

---

## 🌐 App Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/wallet` | Confidential wallet — deposit, merge, transfer, withdraw |
| `/payroll` | Employer payroll dashboard — run confidential batch payments |
| `/invoices` | B2B invoicing — create, pay, and look up invoices |
| `/auditor` | Compliance auditor console — decrypt all transfer amounts |
| `/verify` | Selective disclosure verifier — prove a single payment |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust + Soroban SDK v26 |
| ZK Proofs | UltraHonk (bb.js), Grumpkin curve, Poseidon2 hash |
| Blockchain | Stellar Testnet |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Crypto SDK | `@ctd/sdk` (Grumpkin, Poseidon2, ChainClient, StateEngine) |

---

## 📄 License

MIT
