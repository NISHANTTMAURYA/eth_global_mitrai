# ENS use case and current limit

A portable, human-readable name could make a character easier to find as its Arkiv owner changes. MitrAI could publish only public identity pointers and profile fields to a character subname while keeping chat and personal memories private.

Today, the project previews `<character>.<configured-parent>` and performs reverse ENS lookup for connected wallets. It does not control the current preview parent `mitrai.eth`; it has no deployed ENSv2 registry or resolver, and the JSON endpoint is not an ENS resolver or CCIP Read gateway. A preview is not a registered name.

For the Mumbai Best Use of ENSv2 prize, the next step is a working Sepolia or mainnet ENSv2 flow with a parent namespace the project controls, real onchain records, a user-visible read of those records, and independent resolution. Sepolia is accepted for this prize; buying a mainnet `.eth` name is not required solely for qualification. See [current status and implementation plan](README.md) and the [official requirements](https://ethglobal.com/events/mumbai/prizes#ens).
