# ENS status and submission plan

## What the app does today

- It looks up a connected wallet’s reverse ENS name on Ethereum mainnet when an RPC is available.
- Character subnames shown in the app are **local previews only**. The preview parent `mitrai.eth` is not controlled by this project, and the names do not resolve as registered character records.
- The MitrAI `/api/ens/[name]` endpoint is an application JSON preview, not an ENS resolver or CCIP Read gateway.
- No ENSv2 registry, resolver, subname token, text record, or live ENS name-write flow is deployed. Do not present this integration as complete or claim prize qualification yet.

## What ENS requires for the Mumbai main prize

The [ETHGlobal Mumbai ENS prize page](https://ethglobal.com/events/mumbai/prizes#ens) says the Best Use of ENSv2 project must use ENSv2 on Ethereum mainnet or Sepolia, make ENSv2 central to the product, demonstrate a functional non-hardcoded app, link a live demo, and provide publicly accessible open-source code. A reverse-name lookup or generated name preview alone is not enough. The separate existing-project prize requires mainnet and Continuity Track eligibility; do not select it unless ETHGlobal confirms eligibility.

The project does **not** need to buy a mainnet `.eth` name just to use the main Best Use track, because Sepolia is explicitly accepted. But real subnames require a parent namespace that the app/team controls on the chosen ENSv2 network. ENS docs support either wildcard subname records in a parent’s Permissioned Resolver (no individual subname tokens) or individually owned subnames through a UserRegistry. We have no controlled parent yet, so neither flow is live.

## Smallest honest implementation path

1. Pick Sepolia for the demo and get a parent namespace the team can actually control there (or deploy a controlled ENSv2 registry/namespace using the documented ENSv2 stack). No mainnet purchase is implied.
2. Implement one real user-visible action: connect wallet, create a character subname under that parent, and write a small public profile record bundle, such as character URL, Arkiv entity key, and current owner. Do not publish private chats or private memories.
3. Use the parent-controlled wildcard resolver for the simplest managed-subname design, or a UserRegistry if each character needs separately transferable token ownership. Do not invent a custom “ENS-compatible” endpoint and call it ENS resolution.
4. Resolve the name through ENS’s Universal Resolver or another independent ENSv2 client and show the transaction and result in the demo.
5. Make the app read the actual resolver records in discovery, with visible loading/error states. Keep the proposed name UI labeled “preview” until the onchain lookup succeeds.
6. Add deployment/network/parent/resolver addresses, reproducible setup, and a short demo link to this folder and the root README.

The project should not ask users to manually sync Arkiv or ENS just to chat. The owner’s wallet should approve the specific public registration/record transaction when a user-visible identity action is requested. Background updates require a delegated key/role and must be narrowly scoped and clearly disclosed.
