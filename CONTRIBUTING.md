# Contributing to PrivyPay

## Prerequisites

- Rust stable + `wasm32v1-none` target
- Node >= 20, pnpm 10
- Stellar CLI >= 25.2.0
- Freighter browser extension (Testnet)

## Local Setup

```bash
git clone https://github.com/ItsMeSwagnik/PrivyPay
cd PrivyPay/frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

## Contracts

```bash
# From repo root
cargo test
stellar contract build
```

## Commit Style

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Reporting Issues

Open a GitHub issue with steps to reproduce, expected vs actual behaviour, and your browser/wallet version.
