import { Networks } from "@stellar/stellar-sdk";

export interface DeploymentContracts {
  token: string;
  verifier: string;
  auditor: string;
  underlying: string;
  payrollBatch: string;
  invoiceVault: string;
}

export interface Deployment {
  id: string;
  label: string;
  rpcUrl: string;
  networkPassphrase: string;
  indexerUrl?: string;
  deployedAtLedger: number;
  auditorId: number;
  auditorSecretHex: string;
  contracts: DeploymentContracts;
}

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || undefined;

export const DEFAULT_DEPLOYMENT: Deployment = {
  id: "default",
  label: "PrivyPay Testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: Networks.TESTNET,
  indexerUrl: INDEXER_URL,
  deployedAtLedger: 4307129,
  auditorId: parseInt(process.env.NEXT_PUBLIC_AUDITOR_ID || "0", 10),
  auditorSecretHex: process.env.NEXT_PUBLIC_AUDITOR_SECRET_HEX || "",
  contracts: {
    token: "CCTNP6DDSR54WIVXXBWYDGZR2K5IBPKHPDDTSBYBHOGI4EOQRKB6AUXS",
    verifier: "CDVAOCM6KFFCNFRK2ZREHVJ3T2S2OSQFD4CZUYKMJHHZ5TBC6BEQBF3E",
    auditor: "CBPY4UGGVBFK7YKSET4NSSJDY4JU6RCOXJZNGUBVEBOBNTYZCJGELF2X",
    underlying: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    factory: "CA7KMB4NMCZ3EA34RKA4VTJ6W7MLRURW62NK3FOWBKSZETS2D4P2DIS5",
    payrollBatch: process.env.NEXT_PUBLIC_PAYROLL_BATCH_CONTRACT ?? "CDLI6RUL6EQJEHYJBGSOG5DIMKIMNTWNTUKRK4GVHVDCZFWYQCWVW3L5",
    invoiceVault: process.env.NEXT_PUBLIC_INVOICE_VAULT_CONTRACT ?? "CAYIM5I7JVP2NGA5Z3KEBYCCVTNKWQQ2TODCHDNESZTTP7QH3BSH5O5P",
  },
};
