"use client";

import {
  type ChainClient,
  type Signer,
  type OnChainAccount,
  deriveKeys,
  type KeyPair,
  addressToField,
  toHex32,
  fromHex,
  StateEngine,
  LocalStorageStore,
  type AccountState,
  type CircuitProver,
  proverFromArtifact,
  buildRegisterWitness,
  buildWithdrawWitness,
  buildTransferWitness,
  submitRegister,
  submitDeposit,
  submitMerge,
  submitWithdraw,
  submitTransfer,
  encodeTransferData,
  type IndexerClient,
  hybridFetchEvents,
  proveRecipientDisclosure,
  proveSenderDisclosure,
  deriveEphemeralRE,
  scalarMul,
  H,
  pointCoords,
  ecdh,
  decryptWithDomain,
  DOMAIN,
  type ConfidentialEvent,
  type TransferEvent,
  type DisclosureRequest,
  type DisclosureBundle,
} from "@ctd/sdk";
import registerCircuit from "@ctd/sdk/circuits/register.json";
import withdrawCircuit from "@ctd/sdk/circuits/withdraw.json";
import transferCircuit from "@ctd/sdk/circuits/transfer.json";
import discloseRecipientCircuit from "@ctd/disclosure/artifacts/disclose_recipient.json";
import discloseSenderCircuit from "@ctd/disclosure/artifacts/disclose_sender.json";

import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { Deployment } from "./deployment";
import { connectFreighter } from "./freighter";
import { keyDerivationMessage, skFromSignature } from "./derive-key";
import { ensureBrowserBackend } from "./bb-loader";
import { clientsFor } from "./rpc";
import { stroopsToXlm, truncatePrefix } from "./format";

type Log = (msg: string) => void;
type CircuitName = "register" | "withdraw" | "transfer" | "disclose_recipient" | "disclose_sender";

const CIRCUITS: Record<CircuitName, { bytecode: string } & Record<string, unknown>> = {
  register: registerCircuit as never,
  withdraw: withdrawCircuit as never,
  transfer: transferCircuit as never,
  disclose_recipient: discloseRecipientCircuit as never,
  disclose_sender: discloseSenderCircuit as never,
};

export type TxPhase = "proving" | "submitting";

export interface InvoiceRecord {
  id: bigint;
  buyer: string;
  supplier: string;
  memo: string;
  status: "Created" | "Paid" | "Cancelled";
}

export interface WalletView {
  address: string;
  registered: boolean;
  spendable: bigint;
  receiving: bigint;
  syncedLedger: number;
  matchesChain: boolean | null;
}

export class ConfidentialWallet {
  private provers = new Map<CircuitName, CircuitProver>();
  private inFlightEvents: Promise<ConfidentialEvent[]> | null = null;

  private constructor(
    readonly address: string,
    private deployment: Deployment,
    private signer: Signer,
    private keys: KeyPair,
    private client: ChainClient,
    private engine: StateEngine,
    private indexer: IndexerClient | undefined,
    private log: Log,
  ) {}

  static async connect(deployment: Deployment, log: Log): Promise<ConfidentialWallet> {
    ensureBrowserBackend();
    const signer = await connectFreighter();
    log(`connected ${signer.publicKey}`);

    const { client, indexer } = clientsFor(deployment);
    const tokenId = deployment.contracts.token;
    const addrF = addressToField(tokenId);
    const skKey = `privypay:sk:${tokenId}:${signer.publicKey}`;
    let sk: bigint;
    const stored = localStorage.getItem(skKey);
    if (stored) {
      sk = fromHex(stored);
    } else {
      log("sign the key-derivation message in Freighter…");
      const signature = await signer.signMessage(
        keyDerivationMessage(deployment.networkPassphrase, tokenId),
      );
      sk = await skFromSignature(signature);
      localStorage.setItem(skKey, toHex32(sk));
      log("confidential key derived and cached");
    }
    const keys = deriveKeys(sk, addrF);

    const engine = new StateEngine({
      client,
      store: new LocalStorageStore(`privypay:state:${tokenId}:`),
      keys,
      address: signer.publicKey,
      fromLedger: deployment.deployedAtLedger,
      indexer,
    });

    return new ConfidentialWallet(signer.publicKey, deployment, signer, keys, client, engine, indexer, log);
  }

  private prover(name: CircuitName): CircuitProver {
    let p = this.provers.get(name);
    if (!p) {
      p = proverFromArtifact(CIRCUITS[name]);
      this.provers.set(name, p);
    }
    return p;
  }

  async account(): Promise<OnChainAccount | null> {
    return this.client.confidentialBalance(this.address);
  }

  async register(onPhase?: (p: TxPhase) => void): Promise<void> {
    const w = buildRegisterWitness(this.keys);
    onPhase?.("proving");
    this.log("proving register…");
    const { proof } = await this.prover("register").prove(w.inputs);
    onPhase?.("submitting");
    this.log("submitting register…");
    const r = await submitRegister(this.client, this.signer, this.address, this.deployment.auditorId, w, proof);
    this.log(`registered (tx ${truncatePrefix(r.hash)})`);
  }

  async deposit(amount: bigint): Promise<void> {
    this.log(`depositing ${stroopsToXlm(amount)} XLM…`);
    const r = await submitDeposit(this.client, this.signer, this.address, this.address, amount);
    this.log(`deposited (tx ${truncatePrefix(r.hash)})`);
  }

  async merge(): Promise<void> {
    this.log("merging receiving → spendable…");
    const r = await submitMerge(this.client, this.signer, this.address);
    this.log(`merged (tx ${truncatePrefix(r.hash)})`);
  }

  async transfer(to: string, amount: bigint, onPhase?: (p: TxPhase) => void): Promise<void> {
    const recipient = await this.client.confidentialBalance(to);
    if (!recipient) throw new Error("recipient is not registered");
    const kAudR = await this.client.auditorKey(recipient.auditorId);
    const kAudS = await this.client.auditorKey(this.deployment.auditorId);
    const s = await this.engine.sync();
    if (s.spendable.v < amount) throw new Error(`insufficient balance (${stroopsToXlm(s.spendable.v)} XLM)`);
    const w = buildTransferWitness({ keys: this.keys, v: s.spendable.v, r: s.spendable.r, amount, pvkB: recipient.viewingPublicKey, kAudR, kAudS });
    onPhase?.("proving");
    this.log("proving transfer…");
    const { proof } = await this.prover("transfer").prove(w.inputs);
    onPhase?.("submitting");
    this.log("submitting transfer…");
    const res = await submitTransfer(this.client, this.signer, this.address, to, w, proof);
    await this.engine.setSpendable(w.next);
    this.log(`transferred ${stroopsToXlm(amount)} XLM → ${truncatePrefix(to, 6)} (tx ${truncatePrefix(res.hash)})`);
  }

  async withdraw(amount: bigint, onPhase?: (p: TxPhase) => void): Promise<void> {
    const kAudS = await this.client.auditorKey(this.deployment.auditorId);
    const s = await this.engine.sync();
    if (s.spendable.v < amount) throw new Error(`insufficient balance (${stroopsToXlm(s.spendable.v)} XLM)`);
    const w = buildWithdrawWitness({ keys: this.keys, v: s.spendable.v, r: s.spendable.r, amount, kAudS });
    onPhase?.("proving");
    this.log("proving withdraw…");
    const { proof } = await this.prover("withdraw").prove(w.inputs);
    onPhase?.("submitting");
    this.log("submitting withdraw…");
    const res = await submitWithdraw(this.client, this.signer, this.address, this.address, amount, w, proof);
    await this.engine.setSpendable(w.next);
    this.log(`withdrew ${stroopsToXlm(amount)} XLM → public (tx ${truncatePrefix(res.hash)})`);
  }

  async listEvents(): Promise<ConfidentialEvent[]> {
    const events = await this.fetchAllEvents();
    return events.filter((ev) => this.concernsMe(ev)).reverse();
  }

  async registeredRecipients(): Promise<string[]> {
    const seen = new Set<string>();
    for (const ev of await this.fetchAllEvents()) {
      if (ev.type === "register" && ev.account !== this.address) seen.add(ev.account);
    }
    return [...seen];
  }

  private async fetchAllEvents(): Promise<ConfidentialEvent[]> {
    if (this.inFlightEvents) return this.inFlightEvents;
    const fetch = hybridFetchEvents(this.client, this.indexer, {
      fromLedger: this.deployment.deployedAtLedger,
    }).then((r) => r.events);
    this.inFlightEvents = fetch;
    try {
      return await fetch;
    } finally {
      this.inFlightEvents = null;
    }
  }

  private concernsMe(ev: ConfidentialEvent): boolean {
    switch (ev.type) {
      case "register":
      case "merge":
        return ev.account === this.address;
      case "deposit":
      case "withdraw":
      case "transfer":
        return ev.from === this.address || ev.to === this.address;
      default:
        return false;
    }
  }

  private recoverRE(event: TransferEvent): bigint | null {
    const eventRE = pointCoords(event.rE);
    const derived = deriveEphemeralRE(this.keys.vk, event.sigma);
    const derivedRE = pointCoords(scalarMul(derived, H));
    if (derivedRE.x === eventRE.x && derivedRE.y === eventRE.y) return derived;
    return null;
  }

  canDiscloseSent(event: TransferEvent): boolean {
    return this.recoverRE(event) !== null;
  }

  async transferAmount(event: TransferEvent): Promise<bigint | null> {
    if (event.to === this.address) {
      return this.engine.decryptIncoming(event.rE, event.vTilde, event.sigma).vTx;
    }
    if (event.from === this.address) {
      const rEScalar = this.recoverRE(event);
      if (rEScalar === null) return null;
      const recipient = await this.client.confidentialBalance(event.to);
      if (!recipient) return null;
      const sBx = ecdh(rEScalar, recipient.viewingPublicKey);
      const vTx = decryptWithDomain(event.vTilde, DOMAIN.TX_AMOUNT, sBx, event.sigma);
      if (vTx >= 1n << 127n) return null;
      return vTx;
    }
    return null;
  }

  async discloseReceived(event: TransferEvent, request: DisclosureRequest): Promise<DisclosureBundle> {
    if (event.to !== this.address) throw new Error("D-recipient disclosure only works for inbound transfers");
    this.log("proving disclosure (D-recipient)…");
    return proveRecipientDisclosure({ keys: this.keys, event, request, prover: this.prover("disclose_recipient") });
  }

  async discloseSent(event: TransferEvent, request: DisclosureRequest): Promise<DisclosureBundle> {
    if (event.from !== this.address) throw new Error("D-sender disclosure only works for outbound transfers");
    const rEScalar = this.recoverRE(event);
    if (rEScalar === null) throw new Error("transfer wasn't sent with these keys");
    const recipient = await this.client.confidentialBalance(event.to);
    if (!recipient) throw new Error("transfer recipient has no confidential account record");
    this.log("proving disclosure (D-sender)…");
    return proveSenderDisclosure({ keys: this.keys, rEScalar, event, pvkB: recipient.viewingPublicKey, request, prover: this.prover("disclose_sender") });
  }

  async invoiceCreate(buyer: string, supplier: string, memo: string): Promise<bigint> {
    const vaultId = this.deployment.contracts.invoiceVault;
    const res = await this.client.invoke(
      vaultId,
      "create_invoice",
      [
        new Address(buyer).toScVal(),
        new Address(supplier).toScVal(),
        nativeToScVal(memo, { type: "string" }),
      ],
      this.signer,
    );
    const id = (res.returnValue as xdr.ScVal).u64();
    this.log(`invoice #${id} created on-chain`);
    return BigInt(id.toString());
  }

  async invoicePay(invoiceId: bigint, supplier: string, amount: bigint, onPhase?: (p: TxPhase) => void): Promise<void> {
    const recipient = await this.client.confidentialBalance(supplier);
    if (!recipient) throw new Error("supplier is not registered for confidential transfers");
    const kAudR = await this.client.auditorKey(recipient.auditorId);
    const kAudS = await this.client.auditorKey(this.deployment.auditorId);
    const s = await this.engine.sync();
    if (s.spendable.v < amount) throw new Error(`insufficient balance (${stroopsToXlm(s.spendable.v)} XLM)`);
    const w = buildTransferWitness({ keys: this.keys, v: s.spendable.v, r: s.spendable.r, amount, pvkB: recipient.viewingPublicKey, kAudR, kAudS });
    onPhase?.("proving");
    this.log("proving transfer for invoice payment…");
    const { proof } = await this.prover("transfer").prove(w.inputs);
    const data = encodeTransferData(w, proof);
    onPhase?.("submitting");
    this.log(`submitting pay_invoice #${invoiceId}…`);
    const vaultId = this.deployment.contracts.invoiceVault;
    await this.client.invoke(
      vaultId,
      "pay_invoice",
      [
        new Address(this.deployment.contracts.token).toScVal(),
        nativeToScVal(invoiceId, { type: "u64" }),
        data,
      ],
      this.signer,
    );
    await this.engine.setSpendable(w.next);
    this.log(`invoice #${invoiceId} paid confidentially`);
  }

  async invoiceGet(invoiceId: bigint): Promise<InvoiceRecord> {
    const vaultId = this.deployment.contracts.invoiceVault;
    const res = await this.client.invoke(
      vaultId,
      "get_invoice",
      [nativeToScVal(invoiceId, { type: "u64" })],
      this.signer,
    );
    const val = res.returnValue as xdr.ScVal;
    const fields = Object.fromEntries(val.map().map((e: xdr.ScMapEntry) => [e.key().sym().toString(), e.val()]));
    const statusSym = fields.status.vec()[0].sym().toString();
    const status = statusSym === "Paid" ? "Paid" : statusSym === "Cancelled" ? "Cancelled" : "Created";
    return {
      id: invoiceId,
      buyer: Address.fromScVal(fields.buyer).toString(),
      supplier: Address.fromScVal(fields.supplier).toString(),
      memo: fields.memo.str().toString(),
      status,
    };
  }

  async invoiceCancel(invoiceId: bigint): Promise<void> {
    const vaultId = this.deployment.contracts.invoiceVault;
    await this.client.invoke(
      vaultId,
      "cancel_invoice",
      [
        nativeToScVal(invoiceId, { type: "u64" }),
        new Address(this.address).toScVal(),
      ],
      this.signer,
    );
    this.log(`invoice #${invoiceId} cancelled`);
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.provers.values()].map((p) => p.destroy()));
    this.provers.clear();
  }

  async refresh(): Promise<WalletView> {
    const state: AccountState = await this.engine.sync();
    const onchain = await this.account();
    let matchesChain: boolean | null = null;
    if (onchain) matchesChain = (await this.engine.verifyAgainstChain()).ok;
    return {
      address: this.address,
      registered: onchain !== null,
      spendable: state.spendable.v,
      receiving: state.receiving.v,
      syncedLedger: state.syncedLedger,
      matchesChain,
    };
  }
}
