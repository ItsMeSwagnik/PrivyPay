import { ChainClient, IndexerClient } from "@ctd/sdk";
import type { Deployment } from "./deployment";

export function clientsFor(deployment: Deployment): { client: ChainClient; indexer?: IndexerClient } {
  const client = new ChainClient({
    rpcUrl: deployment.rpcUrl,
    networkPassphrase: deployment.networkPassphrase,
    contracts: deployment.contracts,
  });
  const indexer = deployment.indexerUrl
    ? new IndexerClient({ baseUrl: deployment.indexerUrl })
    : undefined;
  return { client, indexer };
}
