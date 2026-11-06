# ENS use case and present limit

A portable name could help a character keep the same identity as its Arkiv owner changes. The intended name is `<character>.mitrai.eth`, with an Arkiv entity pointer and public profile records.

The current application only **previews** that name. It performs real reverse ENS lookup for a connected wallet and checks whether the proposed subname resolves. It has no ENSv2 registry, resolver, or registered subname. A standard ENS client cannot resolve character records today. The app JSON gateway is not CCIP Read.

To make ENS central to the product, register a controlled parent namespace on ENSv2, let the character's current owner update bounded records, preserve the name across Arkiv transfers, and verify resolution with an independent client. [Prize requirements](https://ethglobal.com/events/mumbai/prizes#ens).
