# Adding a new chain

In order to support new chains on the SDK, some places new to be updated:

- Coingecko client, so it can fetch tokens from the new chain
- `keyToId` relation, so the IDs for the chain can be found
- Adding the addresses of the contracts for the new chain