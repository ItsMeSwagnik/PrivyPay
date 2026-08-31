# 🔐 PrivyPay — Private B2B Payroll & Invoicing on Stellar (Soroban)

[![CI](https://github.com/ItsMeSwagnik/PrivyPay/actions/workflows/ci.yml/badge.svg)](https://github.com/ItsMeSwagnik/PrivyPay/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-7B2FBE?logo=stellar)](https://stellar.expert/explorer/testnet)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://stellar-privypay.vercel.app)

<img width="1896" height="1023" alt="image" src="https://github.com/user-attachments/assets/3a70039e-35f2-4440-a158-83549ef38261" />

**Confidential payroll and B2B invoicing powered by UltraHonk ZK proofs on Stellar Soroban.**

PrivyPay brings financial privacy to on-chain payroll and invoicing. Transaction amounts are shielded using Pedersen commitments — only the named sender, recipient, and a designated auditor can ever see them. Everything else (the fact a payment happened, who the parties are) is public by design.

---

## 📌 What It Does

- Anyone can **register** a confidential account by deriving a Grumpkin keypair from a Freighter signature and binding it on-chain with a ZK proof
- **Deposit** public XLM into a shielded balance — no proof needed, just a standard transfer
- **Merge** the receiving balance into the spendable balance before sending
- **Transfer privately** — amount is a Pedersen commitment on-chain; only sender, recipient, and auditor can see it
- **Payroll** — employer runs an atomic batch of confidential transfers to all employees; either fully succeeds or fully reverts
- **Delegated Payroll** — employer approves once via `set_spender`, payroll runs on schedule without a fresh signature every cycle
- **B2B Invoicing** — create invoices on-chain (public metadata, private amount), pay via confidential transfer, cancel if needed
- **Auditor Console** — compliance auditor decrypts every transfer amount using a designated Grumpkin key, without any account cooperation
- **Selective Disclosure** — prove a single payment amount to a third party via a one-time ZK proof, without revealing anything else
- **Withdraw** — convert confidential balance back to public XLM at any time

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
| 🔗 Cross-Contract Calls | Payroll and invoice contracts call the confidential token via `env.invoke_contract` |

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
├── .gitignore
└── README.md
```

---

## 🔌 Wallet & Key Integration

**[`frontend/lib/freighter.ts`](frontend/lib/freighter.ts)** — wraps `@stellar/freighter-api`, exposes a `MessageSigner` that handles both transaction signing and message signing for key derivation:

```ts
// Connect Freighter — returns a signer with publicKey, sign(), signMessage()
export async function connectFreighter(): Promise<MessageSigner>
```

**[`frontend/lib/derive-key.ts`](frontend/lib/derive-key.ts)** — deterministic Grumpkin key derivation from a Freighter signature:

```ts
// Returns the message the user must sign to derive their confidential key
export function keyDerivationMessage(networkPassphrase: string, tokenContract: string): string

// SHA-512 hashes the signature, reduces mod the Grumpkin scalar field
export async function skFromSignature(signature: Uint8Array): Promise<bigint>
```

**[`frontend/lib/rpc.ts`](frontend/lib/rpc.ts)** — wires the SDK's `ChainClient` to the deployment config:

```ts
// Returns a ChainClient (always) and optional IndexerClient (if NEXT_PUBLIC_INDEXER_URL is set)
export function clientsFor(deployment: Deployment): { client: ChainClient; indexer?: IndexerClient }
```

---

## 🔁 Frontend ↔ Contract Flow

```
Browser (Freighter)
  │
  ├─ derive Grumpkin keypair from wallet signature      (derive-key.ts)
  ├─ generate UltraHonk proof client-side (bb.js)       (bb-loader.ts)
  │
  ├─ wallet/     → confidential_transfer                (token contract)
  ├─ payroll/    → run_payroll / run_delegated_payroll  (payroll batch contract)
  │                  └─ cross-contract → confidential_transfer (token contract)
  ├─ invoices/   → create_invoice / pay_invoice         (invoice vault contract)
  │                  └─ cross-contract → confidential_transfer (token contract)
  ├─ auditor/    → decrypt transfer amounts via auditor Grumpkin key (client-side)
  └─ verify/     → prove single payment via disclosure ZK circuit   (client-side)
```

### ConfidentialWallet method → contract call mapping

| [`wallet.ts`](frontend/lib/wallet.ts) method | Contract call |
|---|---|
| `register()` | `confidential_token::register` |
| `deposit(amount)` | `confidential_token::deposit` |
| `merge()` | `confidential_token::merge` |
| `transfer(to, amount)` | `confidential_token::confidential_transfer` |
| `withdraw(amount)` | `confidential_token::withdraw` |

### Data Types

```rust
// ConfidentialPayrollBatch
struct PayrollLeg {
    to: Address,
    data: Bytes,   // XDR-encoded { payload, proof } — opaque, forwarded verbatim
}

struct DelegatedPayrollLeg {
    to: Address,
    data: Bytes,   // XDR-encoded SpenderTransferData envelope
}

// InvoiceVault
struct Invoice {
    buyer: Address,
    supplier: Address,
    memo: String,          // PO number / description — public, never put amounts here
    status: InvoiceStatus,
}

enum InvoiceStatus { Created, Paid, Cancelled }
```

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

---

## 🔗 Cross-Contract Communication

Both `ConfidentialPayrollBatch` and `InvoiceVault` call the confidential token via `env.invoke_contract` — they never import the token trait directly because the proof envelope is built client-side and forwarded opaquely:

```
Employer → ConfidentialPayrollBatch::run_payroll()
                │
                │  env.invoke_contract (for each leg)
                ▼
         ConfidentialToken::confidential_transfer()
                │
                └─ verifies UltraHonk proof on-chain
                └─ updates Pedersen commitments in storage
                └─ emits transfer event (encrypted ciphertext for auditor)

Buyer → InvoiceVault::pay_invoice()
                │
                │  env.invoke_contract
                ▼
         ConfidentialToken::confidential_transfer()
                │
                └─ marks invoice Paid only if transfer succeeds
```

Both contracts are independently deployed and stateless with respect to each other — the token address is passed at call time, making the system fully composable.

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

### 1. Clone & install

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

### 3. Auditor Key Setup (Optional)

The auditor console requires a secret key to decrypt transaction amounts. By default, the testnet auditor key is included in `.env.local` for testing.

**For production deployments:**

1. Generate a new auditor keypair:
```typescript
import { keygen } from "@ctd/sdk";
const { secretKey, publicKey } = keygen();
console.log("Auditor Secret:", toHex(secretKey));
console.log("Auditor Public:", pointCoords(publicKey));
```

2. Add to `.env.local` (DO NOT commit):
```bash
NEXT_PUBLIC_AUDITOR_SECRET_HEX=0x...
NEXT_PUBLIC_AUDITOR_ID=0
```

3. Share the key ONLY with the designated compliance auditor

**Privacy Model:**
- ✅ **Deposits/Withdrawals**: Always visible (public amounts)
- ✅ **Confidential Transfers (no key)**: Amounts encrypted 🔒
- ✅ **Confidential Transfers (with key)**: Amounts decrypted
- ❌ **Hardcoded in repo**: Anyone can decrypt (localhost only for testing - not for production)

### 4. Run the frontend

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

### CLI Invoke Example

```bash
# Create an invoice
stellar contract invoke \
  --id CAYIM5I7JVP2NGA5Z3KEBYCCVTNKWQQ2TODCHDNESZTTP7QH3BSH5O5P \
  --source-account admin \
  --network testnet \
  -- \
  create_invoice \
  --buyer <BUYER_ADDRESS> \
  --supplier <SUPPLIER_ADDRESS> \
  --memo "INV-2026-001"

# Check invoice status
stellar contract invoke \
  --id CAYIM5I7JVP2NGA5Z3KEBYCCVTNKWQQ2TODCHDNESZTTP7QH3BSH5O5P \
  --source-account admin \
  --network testnet \
  -- \
  get_invoice \
  --invoice_id 0
```

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

<img width="1917" height="1020" alt="image" src="https://github.com/user-attachments/assets/a028b993-cbf8-4374-9ff7-ea9b92bd9479" />
<img width="1917" height="1021" alt="image" src="https://github.com/user-attachments/assets/63574f6f-07c8-4ac4-8e85-47cabdbd50c7" />

---

## 🔗 Deployment Transactions

| Contract | Deploy Transaction |
|---|---|
| Payroll Batch | [`b9142c8801943fcf49d20df85695e3e2c094e167b83fcfb756f0531bdf32d9e9`](https://stellar.expert/explorer/testnet/tx/b9142c8801943fcf49d20df85695e3e2c094e167b83fcfb756f0531bdf32d9e9) |
| Invoice Vault | [`d3b3debbcb9be78043415c8b1b5d6f02b5fd1001647c91b764ff388ad31647c2`](https://stellar.expert/explorer/testnet/tx/d3b3debbcb9be78043415c8b1b5d6f02b5fd1001647c91b764ff388ad31647c2) |

<img width="1917" height="1022" alt="image" src="https://github.com/user-attachments/assets/f89c310c-c914-4c80-93ba-674317151b5c" />
<img width="1917" height="1022" alt="image" src="https://github.com/user-attachments/assets/a0edd5f3-c7d5-4cfb-9a48-19ccd0161b34" />

Verify any transaction at: `https://stellar.expert/explorer/testnet/tx/<hash>`

---

## 🌐 Live Demo

| Environment | URL |
|---|---|
| Production | https://stellar-privypay.vercel.app |

---

## 🎬 Demo Video

https://drive.google.com/file/d/19OQ5fmuznDx1snVNXYooGDf9RX4Em3ot/view?usp=sharing

---

## 📸 Screenshots

### Confidential Wallet

<img width="1897" height="1018" alt="image" src="https://github.com/user-attachments/assets/a33e157a-2fbe-40af-82a6-524c33fb20ea" />

### Payroll Dashboard

<img width="1917" height="1023" alt="image" src="https://github.com/user-attachments/assets/eee6d7e3-c6d4-4e9d-8f66-b8fa04fc9db5" />

### B2B Invoicing

<img width="1897" height="1017" alt="image" src="https://github.com/user-attachments/assets/bf982e73-e9e2-4f66-a3ce-78e8dd8a1a35" />

### Auditor Console

<img width="1901" height="1022" alt="image" src="https://github.com/user-attachments/assets/2b7896a8-832d-4b26-8067-a3263c9686a8" />

### Verify Page

<img width="1897" height="1020" alt="image" src="https://github.com/user-attachments/assets/8f517150-44ec-4573-ab65-6f6d51d48634" />

### Mobile Responsive UI

<img width="358" height="832" alt="image" src="https://github.com/user-attachments/assets/585012a0-2bbb-44c1-9a29-143af933e920" /> <img width="362" height="842" alt="image" src="https://github.com/user-attachments/assets/15cdd09e-67bd-4df9-abdc-1a1a9f6fc903" /> <img width="361" height="826" alt="image" src="https://github.com/user-attachments/assets/42c405b6-0cff-4bde-a0b1-208b2a7397e1" /> <img width="362" height="838" alt="image" src="https://github.com/user-attachments/assets/66bb6ba3-7855-452a-9160-9aecc2b2df33" />

### Vercel Analytics

<img width="1897" height="968" alt="image" src="https://github.com/user-attachments/assets/c99b833b-e7d3-4f93-ba31-c63623e3afe1" />
<img width="1892" height="968" alt="image" src="https://github.com/user-attachments/assets/1f7555c3-f340-44a6-8a33-a109ce05c4f6" />

### CI/CD Pipeline

<img width="1917" height="1027" alt="image" src="https://github.com/user-attachments/assets/3b900b5c-4e77-4348-a7ba-3d166f274691" />

### Contract Tests Passing

<img width="932" height="616" alt="Screenshot 2026-08-28 002709" src="https://github.com/user-attachments/assets/52eb2811-e918-4bcd-aa05-6903f3a605ed" />

---

## 💬 User Feedback

We collect feedback from real users to improve PrivyPay.

👉 **[Leave feedback here](https://forms.gle/jtaNivDd1WBPC1TbA)**

📊 **[View feedback responses](https://docs.google.com/spreadsheets/d/1PvRRcRhl-dCawtsZBotP8CK-QEezmRRi1QUPAbpaIm4/edit?usp=sharing)**

Feedback is also linked in the app navigation and landing page footer.

## 🗣️ User Feedback Summary

* **UI/UX Refinements:** While the interface is generally considered clean and easy to navigate, users suggest improvements such as adding skeleton loaders for better loading feedback, implementing pagination for transaction history, and providing visual confirmation when using "copy" features.
  * **Functional Enhancements:** Technical suggestions include fixing the auto-update for transaction history after payroll batches, formatting large balance numbers for readability, and simplifying the Verify tab with a sample data button.
  * **Feature Clarification:** There is a need for better documentation or UI cues regarding the platform's core privacy value proposition, the logic behind balance displays (spendable vs. actual), and the workflow for invoice payments.

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
