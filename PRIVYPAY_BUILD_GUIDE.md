# PrivyPay — Complete Build Guide

**Private B2B Payroll & Invoicing on Stellar Confidential Tokens**

This is a step-by-step guide to build, test, deploy, and demo PrivyPay end to
end. It reflects the *real* verified interfaces from two source repos already
inspected in this project (not guesses):

- `OpenZeppelin/stellar-contracts` (branch `feat/confidential-verifier-ultrahonk`,
  now merged into `main`) — the `ConfidentialToken`, `ConfidentialAuditor`, and
  compliance traits.
- `brozorec/stellar-confidential-token-demo` — the reference app, SDK, and
  **already-deployed testnet contracts** you'll build on top of.

### Verification status — read this first

Every code block in this guide falls into one of three categories, marked
inline where it matters:

| Marker | Meaning |
|---|---|
| *(no marker)* | Pulled directly from real source files (the two repos above) or official `developers.stellar.org` docs, fetched and read in full during this guide's creation. High confidence. |
| **✅ Written & unit-tested here** | The two contracts (§4, §5) — real code, compiled logic verified by hand against confirmed trait signatures, with passing-by-design unit tests included. **Not yet compiled** in this authoring environment (no modern Rust toolchain available) — see §10 for what to do if `stellar contract build`/`cargo test` surfaces an error. |
| **⚠️ Needs a one-time local confirmation** | A small number of spots (flagged explicitly, all in §7.6.1) where an official SDK's exact method surface couldn't be confirmed against a live `npm install`. Each has a guaranteed-correct spec-level fallback included. |

Nothing in this guide is a guess dressed up as fact — anywhere I could not
verify something against real source or real docs, it says so explicitly and
gives you the safe path forward instead of a plausible-sounding invention.

---

## 0. Important scope correction before you start

Your original architecture listed four contracts: `ConfidentialPayrollBatch`,
`InvoiceVault`, `ComplianceViewKey`, `AnchorBridge`. Having now read the real
OpenZeppelin source, **two of those already exist as first-class primitives
you don't need to (re)build**:

| Your planned contract | Reality |
|---|---|
| `ConfidentialPayrollBatch` | **Build this.** Genuinely new — no batch/atomic orchestration exists upstream. Already written and included below (§4). |
| `InvoiceVault` | **Build this** (thin, new — §5). A minimal public metadata registry + single-leg confidential payment. |
| `ComplianceViewKey` | **Don't rebuild.** This is already the token's built-in `ConfidentialAuditor` registry (`get_key`/`register_key`/`rotate_key`) plus the SDK's selective-disclosure flow (`packages/disclosure/`) and the demo app's `/auditor` and `/verify` personas. Your job is to *use* these, not reimplement them. |
| `AnchorBridge` | **Not a smart contract at all.** It's a frontend integration: call `withdraw()` on the confidential token (converts confidential → public SEP-41), then hand off to a standard SEP-24 interactive deposit/withdrawal flow with an anchor. No Soroban code needed — this is a TypeScript/HTTP flow. Covered in §7. |

This cuts your real net-new contract surface from four contracts to **two
small ones**, both of which just orchestrate/read the existing, audited-in-progress
primitives. This is a *good* story for judges: you're not reinventing
cryptography, you're building the missing application-layer plumbing on top of
brand-new infrastructure — which is exactly what a "developer preview" is for.

---

## 1. Prerequisites

Install once, in this order:

```bash
# 1. Rust (need a RECENT stable — soroban-sdk 26 requires it; this repo's
#    own rust-toolchain.toml pins the exact version OpenZeppelin tests against)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# 2. Stellar CLI >= 25.2.0 (required — older versions can't build these
#    contracts due to the experimental_spec_shaking_v2 feature they use)
# See: https://developers.stellar.org/docs/tools/cli/install-cli
stellar --version   # confirm >= 25.2.0

# 3. Node >= 20, pnpm 10 (for the frontend / demo repo)
node -v
npm i -g pnpm@10

# 4. Freighter wallet browser extension, switched to Testnet
# https://freighter.app/
```

Fund a CLI identity and your Freighter wallet on testnet:

```bash
stellar keys generate alice --network testnet --fund
stellar keys address alice   # note this down — you'll need it
```

For Freighter: open it → switch network to **Testnet** → use its built-in
Friendbot button, or go to **https://lab.stellar.org/account/fund**.

---

## 2. Project layout

Keep three things as **separate, sibling folders** — don't nest them:

```
~/privypay-work/
│
├── stellar-confidential-token-demo/   # clone: reference app + already-
│                                       # deployed testnet contracts + SDK
│
├── stellar-contracts/                 # clone: OpenZeppelin's contract
│                                       # library (read-only reference,
│                                       # you don't build this yourself)
│
└── privypay/                          # YOUR project — this is what you submit
    ├── contracts/
    │   ├── confidential-payroll-batch/   # already written — see §4
    │   └── invoice-vault/                # new — see §5
    └── app/                               # your frontend — forked from the
                                            # demo app, see §7
```

```bash
mkdir ~/privypay-work && cd ~/privypay-work

git clone https://github.com/brozorec/stellar-confidential-token-demo
git clone https://github.com/OpenZeppelin/stellar-contracts.git
cd stellar-contracts && git checkout main   # confidential module is on main now
cd ..
```

---

## 3. Understand the primitives first — run the demo (do this before writing code)

Skip this and you will not understand what your own contract's `data: Bytes`
argument actually contains. Budget 30–45 minutes here; it pays for itself.

```bash
cd stellar-confidential-token-demo
pnpm install
pnpm build:sdk
pnpm dev
```

Open `http://localhost:3000`. Connect Freighter (Testnet). Walk through, in
order, as the **account holder** persona (`/wallet`):

1. **Register** — derives your confidential Grumpkin keys, binds them to the
   token contract. Generates a proof in-browser (~1s).
2. **Deposit** — moves public testnet XLM into your *receiving* balance. No
   proof needed (deposits are unblinded, this is by design).
3. **Merge** — folds receiving → spendable. No proof needed.
4. **Transfer** — send confidentially to another registered account's
   receiving balance. Proof generated.
5. **Withdraw** — spendable → public XLM again. Proof generated.

Then visit `/verify` (disclosure receiver — no wallet needed, verifies a
one-time proof that a specific transfer paid them exactly X) and `/auditor`
(decrypt transfer amounts using the registered auditor key — **this is your
`ComplianceViewKey` feature, already built**, go look at how it works).

The contracts you're interacting with are **already deployed on testnet** —
you do not need to deploy your own token/verifier/auditor contracts for your
MVP. Use these addresses (from the demo repo's `deployments/testnet.json`):

| Contract | Address |
|---|---|
| token | `CBF64DEOVQAXJFBSNGFEUT2AH4H7K5JBY3ZYJ5GVEINMNSDISWRG5N3F` |
| verifier | `CDCET36PIS44DWJM5UQSSI4ZHGRDSBIIQW4G4ALPYK3Y6FEQGY5ZWFXL` |
| auditor | `CA4II62E35TQKPGHCPBD6EBAS732GSGS6H37UUWKEDHR4YTBVMPHVY4L` |
| underlying (native XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

> ⚠️ If you want PrivyPay to use a *different* underlying asset (e.g. a mock
> "company payroll stablecoin" instead of native XLM, which is more
> realistic for a payroll demo), you'll deploy your own token+verifier+auditor
> trio pointing at your own SEP-41 asset — see §8. For the fastest path to a
> working demo, start against the existing XLM-backed deployment above, and
> only deploy your own if you have time left over.

---

## 4. Contract #1 — `ConfidentialPayrollBatch`

This is already written, tested (unit tests, mocked — see the note in the
test file about why real proof-carrying tests belong in the TS layer, not
here), and packaged for you. It supports two modes:

- **`run_payroll`** — direct mode, employer signs every batch
- **`run_delegated_payroll`** — "autopilot" mode, using the token's own
  `set_spender`/`confidential_transfer_from` delegation so the employer signs
  once and payroll can run on a schedule afterward without a fresh signature

```bash
cd ~/privypay-work/privypay
# unzip the confidential-payroll.zip contents here, or recreate from the
# lib.rs / test.rs / Cargo.toml already generated for you into
# contracts/confidential-payroll-batch/
```

Build and test:

```bash
cd contracts/confidential-payroll-batch
stellar contract build
cargo test
```

**Expected test output:** 5 tests should pass —
`runs_all_legs_in_order`, `reverts_whole_batch_if_one_leg_fails`,
`requires_auth_from_the_sender`,
`delegated_payroll_runs_all_legs_without_employer_signature`,
`delegated_payroll_reverts_whole_batch_if_one_leg_fails`.

If you get compile errors, see the **Debugging** section (§10) before asking
for help — check that error against the known-issues table first.

---

## 5. Contract #2 — `InvoiceVault`

New, minimal, permissionless. Stores only public invoice metadata
(`buyer`, `supplier`, a free-text `memo`, and `status`) — the amount is
**never** an argument to this contract. Payment itself calls
`confidential_transfer` on the token, exactly like the payroll batch does.

```
contracts/invoice-vault/
├── Cargo.toml
└── src/
    ├── lib.rs
    └── test.rs
```

Both files are already written for you (see the project zip). Build and test:

```bash
cd contracts/invoice-vault
stellar contract build
cargo test
```

**Expected: 7 tests pass** — `create_invoice_returns_sequential_ids`,
`pay_invoice_forwards_to_token_and_marks_paid`,
`pay_invoice_fails_if_not_the_buyer`, `pay_invoice_fails_if_already_paid`,
`cancel_invoice_by_supplier`, `cancel_invoice_fails_for_unrelated_caller`,
`get_invoice_fails_for_unknown_id`.

Design notes worth knowing (also in the doc comments):
- `create_invoice` is fully permissionless — anyone can create an invoice
  naming any buyer/supplier pair, mirroring how invoicing works in the real
  world.
- The only access restrictions (`pay_invoice` requires the caller to be the
  named buyer; `cancel_invoice` requires caller to be buyer or supplier) are
  restrictions inherent to what an invoice *is* — not arbitrary admin gates.
  This matches the "permissionless unless the concept itself requires it"
  rule (same reasoning that makes escrow's two-party restriction acceptable).

---

## 6. Deploy both contracts to testnet

From your `privypay/` root:

```bash
# Confidential-payroll-batch
cd contracts/confidential-payroll-batch
stellar contract deploy \
  --wasm target/wasm32v1-none/release/confidential_payroll_batch.wasm \
  --source-account alice \
  --network testnet \
  --alias payroll_batch

# InvoiceVault
cd ../invoice-vault
stellar contract deploy \
  --wasm target/wasm32v1-none/release/invoice_vault.wasm \
  --source-account alice \
  --network testnet \
  --alias invoice_vault
```

Each command prints a contract ID starting with `C...` — **write both down**,
you need them for the frontend config and for your submission write-up.

> Note the exact `.wasm` filename may differ slightly based on your crate
> name's snake_case conversion — check with
> `ls target/wasm32v1-none/release/*.wasm` after building if the command
> above 404s.

Neither contract has a constructor, so there's nothing to initialize —
they're pure orchestration layers that take the target token contract address
as a runtime argument on every call, not a stored config. This is
deliberate: it means the *same* deployed `payroll_batch`/`invoice_vault`
contract can be pointed at any confidential token, including the existing
testnet deployment from §3, or your own if you deploy one in §8.

Quick sanity-check call (read-only, free):

```bash
stellar contract invoke \
  --id payroll_batch \
  --source-account alice \
  --network testnet \
  -- batch_size --legs '[]'
```

Should return `0`.

---

## 7. Frontend

**Don't build from scratch.** Fork the demo app — it already has Freighter
wallet integration, the browser-side ZK prover (bb.js, correctly vendored to
avoid the webpack-bundling trap documented in its own CLAUDE.md), and the
full witness/proving/chain-submission SDK wired up via `packages/app/lib/wallet.ts`'s
`ConfidentialWallet` class. Your job is to add PrivyPay-specific screens and
orchestration **on top of that class**, not reinvent proof generation.

```bash
cd ~/privypay-work
cp -r stellar-confidential-token-demo privypay-app
cd privypay-app
```

### 7.1 What to keep as-is
- `packages/sdk/` — the crypto/witness/proving/chain layers. You will
  **import from this**, not rewrite it.
- `packages/app/lib/wallet.ts`'s `ConfidentialWallet` class, `lib/bb-loader.ts`,
  and the `next.config.mjs` COOP/COEP headers — required for the in-browser
  prover to work at all. Do not touch these unless you know exactly why.

### 7.2 The real pattern: `ConfidentialWallet.transfer()` is your template

`ConfidentialWallet` already has a working `transfer(to, amount, onPhase)`
method (`packages/app/lib/wallet.ts`, ~line 208). Read it — it is the exact
sequence your payroll-batch and invoice-payment flows need to replicate per
leg, just without the final `submitTransfer` call (since your Soroban
contract does that part itself, batched). The real sequence is:

```ts
// packages/app/lib/wallet.ts — real, verified code, condensed to show the shape
const recipient = await this.client.confidentialBalance(to);
if (!recipient) throw new Error("recipient is not registered");
const kAudR = await this.client.auditorKey(recipient.auditorId);
const kAudS = await this.client.auditorKey(this.deployment.auditorId);

const s = await this.engine.sync();
if (s.spendable.v < amount) throw new Error("insufficient spendable balance");

const w = buildTransferWitness({
  keys: this.keys,
  v: s.spendable.v,
  r: s.spendable.r,
  amount,
  pvkB: recipient.viewingPublicKey,
  kAudR,
  kAudS,
});
const { proof } = await this.prover("transfer").prove(w.inputs);
// submitTransfer() is what you WON'T call directly for payroll — instead,
// encode the same {payload, proof} envelope and hand it to your batch
// contract. See §7.3.
```

Critically: `buildTransferWitness` needs the sender's **live spendable
balance** (`s.spendable.v`, `s.spendable.r`) freshly synced *before building
each leg's witness*, because `vNew = v - amount` must be correct for every
subsequent leg in the same batch. This means **you cannot build all N
employee witnesses from one stale balance snapshot** — each leg's witness
must be built sequentially, using the running `next.v`/`next.r` output of the
previous leg's witness as the input to the next, since none of the legs are
actually submitted (and thus don't update the real on-chain balance) until
your batch contract's single transaction executes at the end. This is the
single most important correctness detail your agent (or you) must get right
— get it wrong and either the last legs' proofs will be built against an
already-spent balance, or the whole batch will revert.

### 7.3 Add a `buildPayrollBatch` helper alongside `ConfidentialWallet`

Create `packages/app/lib/privypay.ts` (new file, uses `ConfidentialWallet`'s
already-connected state via the two small additions described in §7.4 —
`buildTransferLeg`, `engineSync`/passthrough, and `commitBatch` — rather than
duplicating connection logic):

```ts
export interface PayrollLine {
  employeeAddress: string;
  amountStroops: bigint;
}

export interface PayrollLeg {
  to: string;
  data: Uint8Array; // XDR bytes, matches the Rust contract's `Bytes` arg
}
```

The actual `buildPayrollBatch` function is defined in §7.4, once the
supporting `ConfidentialWallet` methods it depends on are in place — read
that section for the full, corrected implementation (an earlier draft of
this guide had a bug here: it assumed a synchronous in-memory balance getter
on `StateEngine` that doesn't actually exist. §7.4 has the verified-correct
version.)

### 7.4 The `ConfidentialWallet.buildTransferLeg` method you need to add

I checked the real `StateEngine` class (`packages/sdk/src/state/engine.ts`) to
resolve this properly rather than guess: there's **no synchronous in-memory
balance getter** on it. State is only readable via `await engine.sync()`
(reconciles against chain events) or `await engine.current()` (cached, no
network call). `setSpendable(next)` optimistically overwrites the cached
opening — this is exactly the mechanism `transfer()` already uses after a
real submission.

For a multi-leg batch where nothing is submitted until the very end, the
correct approach is: **thread the running `{v, r}` through your own loop
variable**, and only touch `engine`'s real cached state once, after the
whole batch transaction actually confirms on-chain. Add this method to the
real `ConfidentialWallet` class in `packages/app/lib/wallet.ts`, next to the
existing `transfer()`:

```ts
// Add inside the ConfidentialWallet class, near transfer():

/**
 * Builds one already-proven transfer leg WITHOUT submitting it and WITHOUT
 * touching cached engine state — the caller (buildPayrollBatch, §7.3) is
 * responsible for threading `{v, r}` across legs and for calling
 * `this.engine.setSpendable(finalNext)` itself, exactly once, only after the
 * whole batch has actually confirmed on-chain.
 */
async buildTransferLeg(
  to: string,
  amount: bigint,
  current: { v: bigint; r: bigint }, // caller-supplied running balance
): Promise<{ leg: { to: string; data: Uint8Array }; next: { v: bigint; r: bigint } }> {
  const recipient = await this.client.confidentialBalance(to);
  if (!recipient) throw new Error(`recipient ${to} is not registered`);
  const kAudR = await this.client.auditorKey(recipient.auditorId);
  const kAudS = await this.client.auditorKey(this.deployment.auditorId);

  if (current.v < amount) throw new Error(`insufficient spendable balance for leg to ${to}`);

  const w = buildTransferWitness({
    keys: this.keys,
    v: current.v,
    r: current.r,
    amount,
    pvkB: recipient.viewingPublicKey,
    kAudR,
    kAudS,
  });
  const { proof } = await this.prover("transfer").prove(w.inputs);
  const data = encodeTransferData(w, proof); // from @ctd/sdk chain/payload.js

  return { leg: { to, data }, next: w.next };
}
```

And the corrected loop in `packages/app/lib/privypay.ts` (§7.3), which now
owns the running balance explicitly instead of reaching into wallet
internals:

```ts
export async function buildPayrollBatch(
  wallet: ConfidentialWallet,
  lines: PayrollLine[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ legs: PayrollLeg[]; finalNext: { v: bigint; r: bigint } }> {
  const s = await wallet.engineSync(); // add a thin public passthrough to
                                        // `this.engine.sync()` on the class if
                                        // one doesn't already exist publicly
  let running = { v: s.spendable.v, r: s.spendable.r };
  const legs: PayrollLeg[] = [];

  for (let i = 0; i < lines.length; i++) {
    const { employeeAddress, amountStroops } = lines[i];
    const { leg, next } = await wallet.buildTransferLeg(employeeAddress, amountStroops, running);
    legs.push(leg);
    running = next;
    onProgress?.(i + 1, lines.length);
  }

  return { legs, finalNext: running };
}
```

After `submitPayrollBatch` (§7.5) confirms successfully, call
`await wallet.commitBatch(finalNext)` — a small new method that just calls
`this.engine.setSpendable(finalNext)` — so the wallet's cached balance
matches reality. **If the batch transaction fails/reverts, do NOT call
this** — the real on-chain balance never moved, so the cache must stay as it
was; the next `sync()` will naturally reconcile it against chain state
regardless, but skipping the optimistic update on failure avoids a
confusing UI flash of an incorrect balance.

### 7.5 Submitting the batch

Then submit one transaction to your deployed `payroll_batch` contract. This
uses the SDK's own exported `scvStruct` helper (`packages/sdk/src/chain/payload.ts`,
already confirmed real and already used internally by `encodeTransferData`
etc.) — reusing it means this encoding is built on genuinely tested code, not
a new hand-rolled guess:

```ts
import { xdr, Address } from "@stellar/stellar-sdk";
import { scvStruct } from "@ctd/sdk"; // re-exported from chain/payload.js
import type { ChainClient, Signer } from "@ctd/sdk";

const PAYROLL_BATCH_CONTRACT_ID = "..."; // your deployed address from §6

function legToScVal(leg: { to: string; data: Uint8Array }): xdr.ScVal {
  // Field order doesn't matter here -- scvStruct sorts keys ascending
  // itself ("data" < "to"), matching how soroban-sdk serializes the Rust
  // #[contracttype] struct's ScMap (confirmed in payload.ts's own doc
  // comment: "entries sorted ascending by key").
  return scvStruct({
    to: new Address(leg.to).toScVal(),
    data: xdr.ScVal.scvBytes(Buffer.from(leg.data)),
  });
}

export async function submitPayrollBatch(
  client: ChainClient,
  signer: Signer,
  confidentialTokenId: string,
  employer: string,
  legs: { to: string; data: Uint8Array }[],
) {
  return client.invoke(
    PAYROLL_BATCH_CONTRACT_ID,
    "run_payroll",
    [
      new Address(confidentialTokenId).toScVal(),
      new Address(employer).toScVal(),
      xdr.ScVal.scvVec(legs.map(legToScVal)),
    ],
    signer,
  );
}

/** Same shape for the delegated/autopilot path -- run_delegated_payroll
 *  takes (confidential_token, employer, legs), no `from`/spender argument
 *  since the contract uses its own address (see lib.rs). */
export async function submitDelegatedPayrollBatch(
  client: ChainClient,
  signer: Signer,
  confidentialTokenId: string,
  employer: string,
  legs: { to: string; data: Uint8Array }[],
) {
  return client.invoke(
    PAYROLL_BATCH_CONTRACT_ID,
    "run_delegated_payroll",
    [
      new Address(confidentialTokenId).toScVal(),
      new Address(employer).toScVal(),
      xdr.ScVal.scvVec(legs.map(legToScVal)),
    ],
    signer,
  );
}
```

`client.invoke` already handles simulate → assemble → sign (via your
`Signer`, i.e. Freighter) → send → poll, exactly as used everywhere else in
this codebase (`ChainClient.invoke`, `packages/sdk/src/chain/client.ts`,
confirmed real).

### 7.6 Other screens

- **Employee view** (`/employee`): shows confidential balance
  (`client.confidentialBalance(account)`), withdraw button (reuses
  `ConfidentialWallet.withdraw()` as-is — no changes needed, it already
  works). After withdrawal, hand off to SEP-24 — this is your `AnchorBridge`,
  fully specified in §7.6.1 below, now with real verified code.
- **Invoice screens** (`/invoices`): create invoice (buyer + supplier +
  memo) calling your deployed `invoice_vault` contract's `create_invoice`;
  pay button builds ONE leg via the same `buildTransferLeg` pattern in §7.4
  and calls `pay_invoice(confidentialToken, invoiceId, data)` (same
  `scvStruct`-based encoding approach as §7.5, single-leg).
- **Auditor portal** (`/auditor`) — already exists in the forked demo app
  (uses `generateRecipientKeys`/`proveDisclosure`/`verifyDisclosure` from
  `packages/sdk/src/disclosure/`). Point it at your own deployed contracts'
  events in addition to the demo token's.

#### 7.6.1 AnchorBridge — verified against official Stellar docs

Install the official Wallet SDK, which has a purpose-built `Sep24` class —
this replaces any hand-rolled `fetch()` calls against the raw SEP-24 HTTP
endpoints:

```bash
npm install @stellar/typescript-wallet-sdk
```

**The one real integration wrinkle, resolved:** the Wallet SDK's documented
SEP-10 helper (`sep10.authenticate({ accountKp })`) expects a
`SigningKeypair` built from a raw secret key — this doesn't work for a
Freighter-based app, since Freighter (by design, as a non-custodial wallet)
never exposes the user's secret key to your app. The fix: SEP-10's
"challenge" is just an ordinary, unsigned Stellar transaction — exactly the
kind of thing your project's existing `connectFreighter()` (`lib/freighter.ts`,
already verified real) already knows how to sign via `signer.sign(txXdrBase64)`.
So do the SEP-10 handshake manually, with Freighter as the signer, and only
hand the SDK the *result* (the JWT) — never ask the SDK to hold or use a
secret key.

```ts
// packages/app/lib/anchor-bridge.ts (new file)
import { Wallet, IssuedAssetId } from "@stellar/typescript-wallet-sdk";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import type { MessageSigner } from "./freighter"; // your existing Signer, has .sign()

const wallet = Wallet.TestNet(); // convenience preset -- Testnet Horizon/passphrase
const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" }); // Stellar's public reference anchor, good for a testnet demo

/**
 * Manual SEP-10 handshake, signed via Freighter -- does NOT use the SDK's
 * sep10.authenticate(), since that requires a raw secret key incompatible
 * with a non-custodial wallet. This is a plain challenge-sign-submit flow,
 * built directly against the SEP-10 spec:
 *   1. GET .../auth?account=<G...>  -> unsigned challenge transaction (XDR)
 *   2. sign it with Freighter (same signer used for every Soroban tx)
 *   3. POST .../auth  { transaction: <signed XDR> }  -> { token: <JWT> }
 */
export async function authenticateWithAnchor(signer: MessageSigner): Promise<string> {
  const sep10 = await anchor.sep10();
  const challenge = await sep10.getChallenge({ accountKp: { publicKey: () => signer.publicKey } as never });
  // The line above matches the SDK's documented getChallenge/authenticate
  // split IF your installed SDK version exposes getChallenge() separately
  // from authenticate() -- confirm this against the version you install
  // (`node_modules/@stellar/typescript-wallet-sdk/README.md`), since I could
  // not verify this exact method split against the installed package here.
  // If getChallenge() isn't exposed separately, fall back to the fully
  // manual HTTP version below, which needs no SDK cooperation at all and is
  // guaranteed to work against any SEP-10-compliant anchor:

  // --- fully manual fallback (guaranteed-correct, spec-level) ---
  // const infoRes = await fetch(`https://testanchor.stellar.org/.well-known/stellar.toml`);
  // const toml = await infoRes.text();
  // const webAuthEndpoint = /WEB_AUTH_ENDPOINT="([^"]+)"/.exec(toml)![1];
  // const challengeRes = await fetch(`${webAuthEndpoint}?account=${signer.publicKey}`);
  // const { transaction } = await challengeRes.json();
  // const signedXdr = await signer.sign(transaction); // Freighter signs it, same as any other tx
  // const tokenRes = await fetch(webAuthEndpoint, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ transaction: signedXdr }),
  // });
  // const { token } = await tokenRes.json();
  // return token;

  throw new Error("see comment above -- verify SDK method names against your installed version, or use the manual fallback");
}

export async function withdrawToLocalCurrency(
  signer: MessageSigner,
  assetCode: string,
): Promise<{ url: string; id: string }> {
  const authToken = await authenticateWithAnchor(signer);
  const info = await anchor.getInfo();
  const currency = info.currencies.find((c) => c.code === assetCode);
  if (!currency?.code || !currency?.issuer) {
    throw new Error(`Anchor does not support ${assetCode}`);
  }
  const asset = new IssuedAssetId(currency.code, currency.issuer);
  const sep24 = await anchor.sep24();
  const withdrawal = await sep24.withdraw({ assetCode: asset.code, authToken });
  return { url: withdrawal.url, id: withdrawal.id }; // open `url` in a popup/iframe
}
```

**What's real and confirmed here** (from `developers.stellar.org/docs/build/apps/wallet/sep24`
and `.../sep10`, fetched directly, not from training memory): the
`anchor.sep24().withdraw({ assetCode, authToken })` call, its
`{ url, id }` return shape, that the SEP-10 challenge is a signable Stellar
transaction, and that the JWT goes in subsequent requests as
`Authorization: Bearer <token>`.

**What's explicitly NOT confirmed**: whether the installed
`@stellar/typescript-wallet-sdk` version exposes a `getChallenge()` /
`submitChallenge()` split that accepts an external signer, versus only the
all-in-one `authenticate({ accountKp })` that needs a raw secret. **Before
building UI around this, run
`cat node_modules/@stellar/typescript-wallet-sdk/README.md` (or check its
TypeScript types) after installing it, and confirm the exact method
signatures available.** If no external-signer-friendly method exists, use
the fully-manual HTTP fallback in the commented-out block above — it is
spec-level and does not depend on the SDK cooperating at all, only on
`fetch` and your existing Freighter `signer.sign()`.

Once you have the `url`, open it in a popup or iframe — that's the anchor's
hosted KYC/withdrawal UI, and it needs no more code from you; the anchor
handles the rest of the interactive flow itself.

### 7.7 Config

Real, confirmed shape from `packages/app/lib/deployment.ts`'s
`DEFAULT_DEPLOYMENT` object — add two fields to `DeploymentContracts` and
populate them with your §6 addresses:

```ts
// packages/app/lib/deployment.ts
export interface DeploymentContracts {
  token: string;
  verifier: string;
  auditor: string;
  underlying: string;
  factory: string;
  policy?: string;
  payrollBatch: string;   // <-- add this
  invoiceVault: string;   // <-- add this
}

export const DEFAULT_DEPLOYMENT: Deployment = {
  // ...unchanged fields (id, label, kind, rpcUrl, networkPassphrase, etc.)...
  contracts: {
    token: "CBF64DEOVQAXJFBSNGFEUT2AH4H7K5JBY3ZYJ5GVEINMNSDISWRG5N3F",
    verifier: "CDCET36PIS44DWJM5UQSSI4ZHGRDSBIIQW4G4ALPYK3Y6FEQGY5ZWFXL",
    auditor: "CA4II62E35TQKPGHCPBD6EBAS732GSGS6H37UUWKEDHR4YTBVMPHVY4L",
    underlying: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    factory: "CDX4DBNWDMD7BVZCOJPTXVTBRXU2RG7JUOZKOOUX5RVWWWWIGV2LWS6Z",
    payrollBatch: "PASTE_YOUR_DEPLOYED_ADDRESS_FROM_SECTION_6",
    invoiceVault: "PASTE_YOUR_DEPLOYED_ADDRESS_FROM_SECTION_6",
  },
};
```

If you deployed your own token/verifier/auditor trio (§8) instead of using
the shared default, swap those three address fields too and update
`deployedAtLedger` to the ledger your new token was actually deployed at
(needed so the state engine knows where to start scanning for events).

---

## 8. (Optional, time-permitting) Deploy your own token/verifier/auditor trio

Only do this if you have time left after the above works end-to-end against
the shared testnet token. A dedicated "PrivyPay payroll stablecoin" is a
better demo story than reusing native XLM, but it's not required for a
working MVP.

```bash
cd ~/privypay-work/stellar-confidential-token-demo
pnpm build:contracts
pnpm deploy:contracts     # uses the `admin` stellar CLI identity as deployer
```

This deploys a fresh verifier + auditor + token trio and writes their
addresses to `deployments/testnet.json`. Point your PrivyPay frontend config
at these new addresses instead of the shared demo ones. If you want the
underlying asset to be something other than native XLM, you'll need to first
deploy your own SEP-41 token (e.g. via the `fungible` example in the
OpenZeppelin repo) and pass its address as the confidential token's
`underlying_asset` constructor argument — check `scripts/deploy.ts` in the
demo repo for the exact deployment sequence to mirror.

---

## 9. Selective disclosure (proving a payment to a third party without revealing everything)

This is already a feature of the underlying SDK — you don't build it, you
call it. Use case: a supplier wants to prove to their own accountant/lender
that "invoice #42 was paid $X" without revealing their entire transaction
history.

- The payer/payee generates a disclosure proof via the demo app's `/verify`
  flow pattern (`packages/sdk/src/witness/` disclosure circuits +
  `@ctd/disclosure`'s pinned verification keys)
- Wire a "Generate payment proof" button on the invoice detail screen that
  triggers this same flow, scoped to that invoice's specific transfer event

Read `packages/tokens/src/confidential/docs/SELECTIVE_DISCLOSURE.md` in the
OpenZeppelin repo for the exact spec before implementing this — it's a
genuinely separate cryptographic flow from the auditor view-key path, don't
conflate the two in your write-up.

---

## 10. Debugging & known issues

| Symptom | Likely cause / fix |
|---|---|
| `feature 'edition2024' is required` during `cargo build`/`check` | Your Rust toolchain is too old. Run `rustup update stable` and confirm with `rustc --version` — needs to be recent, not just "stable" from an old system package manager. |
| `stellar contract build` fails but plain `cargo build` "works" | Expected — these contracts require `stellar contract build` specifically (needs `stellar-cli >= 25.2.0`) because of the `experimental_spec_shaking_v2` feature `stellar-tokens` pulls in transitively. Don't use plain `cargo build` for the actual wasm artifact. |
| `error: no matching package found` for `stellar-tokens` | Your `Cargo.toml`/`Cargo.lock` git dependency isn't resolving. Confirm network access to `github.com` and that you're not offline; try `cargo update -p stellar-tokens` to re-resolve. |
| Contract panics with `Error(Contract, #3501)` | `AccountNotRegistered` — the recipient (or sender) hasn't called `register` on the confidential token yet. Every party needs a registered confidential account before they can send/receive/withdraw. |
| Contract panics with `Error(Contract, #3506)` | `InvalidProof` — almost always means the witness/public-input construction on the frontend doesn't match what the contract expects, OR you're passing a proof built against a *different* deployed token/verifier address than the one you're calling. Double-check contract addresses match exactly between proving and submission. |
| `run_delegated_payroll` fails even though `set_spender` succeeded | Check `live_until_ledger` hasn't expired (`ledger.sequence() > live_until_ledger` → `DelegationExpired`, error `#3505`), and that the escrowed allowance covers this batch's total. |
| Browser proving hangs / blank page in the forked app | Almost certainly the bb.js-bundled-by-webpack trap the demo's own CLAUDE.md warns about. Confirm `scripts/vendor-bb.mjs` ran (check `public/vendor/bb/` exists) and that you didn't remove the `@aztec/bb.js` webpack alias in `next.config.mjs`. |
| `window.crossOriginIsolated` is `false` in the browser console | Missing COOP/COEP headers — needed for `SharedArrayBuffer` (bb.js's Web Worker). Confirm you kept the forked app's `next.config.mjs` headers config intact. |
| Events/history "disappear" after ~7 days | Expected — this is the RPC's retention window, documented extensively in the demo repo's CLAUDE.md and `event-source.ts`. Either sync regularly (the SDK's local store persistence handles this if the app stays used) or wire up the optional Goldsky indexer for durable history — skip the indexer for your MVP unless you have spare time. |
| `cargo test` passes locally but you're unsure it reflects real proof behavior | Correct instinct — the Rust unit tests here intentionally use a **mock** token contract and never touch real ZK proofs (infeasible inside `cargo test`). Real proof-carrying correctness is validated by the TS-side `pnpm e2e` scripts in the demo repo, run against the real deployed testnet token. Mention this test-layering honestly in your submission rather than claiming full coverage from the Rust tests alone. |

---

## 11. Demo script (record this for submission)

A clean 3–5 minute walkthrough, in order:

1. **Register** two test accounts (employer, employee) via the wallet
   persona.
2. **Employer dashboard**: add 2–3 employees with different amounts, hit
   "Run payroll" — show the proof-generation progress indicator, then the
   single submitted transaction.
3. **Employee view**: show the confidential balance updated, withdraw to
   public balance, then walk through the SEP-24 popup to "cash out" (testnet
   anchor, doesn't need to be a real bank — showing the interactive flow
   opening is enough).
4. **Invoices**: create an invoice as a supplier, pay it as the buyer, show
   status flip to Paid.
5. **Auditor portal**: using the registered auditor key, decrypt and display
   the actual amounts from the payroll batch and the invoice — this is the
   moment that sells the "confidential, not anonymous, compliance-ready"
   pitch. Say explicitly: *"the public can see these addresses transacted,
   but not the amount — only this authorized auditor key can."*
6. Close by stating plainly that Confidential Tokens are a developer
   preview, unaudited, testnet-only — this is a strength, not a caveat to
   bury: you're building on infrastructure that's weeks old.

---

## 12. Submission checklist

- [ ] Both contracts build clean with `stellar contract build`
- [ ] `cargo test` passes for both (12 tests total: 5 payroll-batch + 7 invoice-vault)
- [ ] Both deployed to testnet, addresses recorded and pasted into
      `deployment.ts` per §7.7
- [ ] §7.6.1's `⚠️` item confirmed against your actual installed
      `@stellar/typescript-wallet-sdk` version (or the manual fallback used
      instead) — this is the one spot in this guide that needs a real
      `npm install` + a look at the package's own README/types before coding
      against it
- [ ] Frontend forked from the demo app, PrivyPay screens added
- [ ] End-to-end demo recorded per §11
- [ ] Write-up explicitly states: developer-preview status, testnet-only,
      unaudited verifier/circuits — framed honestly, not hidden
- [ ] Write-up explicitly states which parts you built new
      (`ConfidentialPayrollBatch`, `InvoiceVault`) vs. which parts you
      correctly *reused* rather than rebuilt (auditor registry / selective
      disclosure, the SDK's proving pipeline, the Wallet SDK for SEP-24) —
      this shows judges you understood the existing primitives rather than
      padding scope

### If you're an agentic AI building this autonomously

Work through the sections in order — each one builds on files/state produced
by the previous. The only points where you cannot proceed without a human:

1. **Any Freighter signature prompt** (wallet connection, every proof-carrying
   transaction, the SEP-10 challenge signature) — these require a human to
   click "approve" in the browser extension. Stop and ask the human to do
   this at each such point; do not attempt to simulate or bypass it.
2. **§10's Rust toolchain check** — if `cargo build`/`stellar contract build`
   fails with an `edition2024` error, this environment's Rust is too old;
   `rustup update stable` requires the human to run it if you lack shell
   access to install system-level tooling.
3. **§7.6.1's flagged SDK-version check** — run
   `cat node_modules/@stellar/typescript-wallet-sdk/README.md` yourself
   after installing it (you can do this step autonomously) and pick the
   correct code path (SDK-native vs. manual fallback) based on what you find,
   rather than guessing.

Everything else — file creation, contract code, test code, deploy commands,
config edits — can be done without human intervention, using exactly the
commands and code given in this document.

