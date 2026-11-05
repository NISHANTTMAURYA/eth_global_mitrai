import { createPublicClient, createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { defineSchema, str, bytes } from '@arkiv-network/sdk/schema';
import { eq } from '@arkiv-network/sdk/query';
import { rabdi } from '@arkiv-network/sdk/chains';
import {
  http,
  custom,
  stringToBytes,
  hexToString,
  type Address,
  type EIP1193Provider,
  type Hex,
} from 'viem';
import { publicCharacter, type Character } from './domain';
export const Characters = defineSchema('mitrai.characters.v1', {
  characterId: str().indexed(),
  visibility: str().indexed(),
  name: str(),
  proof: str(),
  verifier: str(),
  snapshot: bytes(),
});
export function arkivPublic() {
  return createPublicClient({
    chain: rabdi({ accessKey: process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY || '' }),
    transport: http(
      process.env.NEXT_PUBLIC_ARKIV_RPC || 'https://rpc.rabdi.db-chain.testnet.arkiv.network',
    ),
  });
}
export async function readArkivCharacter(key: Hex) {
  const entity = await arkivPublic().getEntity(key, Characters);
  return {
    owner: entity.$owner,
    proof: entity.proof.value,
    verifier: entity.verifier.value,
    character: JSON.parse(hexToString(entity.snapshot.value)) as Character,
  };
}
export async function discoverArkiv() {
  const { entities } = await arkivPublic()
    .select()
    .from(Characters)
    .where(eq('visibility', 'public'))
    .fetch();
  return entities.map((e) => ({
    key: e.$key,
    owner: e.$owner,
    proof: e.proof.value,
    verifier: e.verifier.value,
    character: JSON.parse(hexToString(e.snapshot.value)) as Character,
  }));
}
export async function writeArkiv(
  provider: EIP1193Provider,
  owner: Address,
  c: Character,
  proof: string,
  verifier: string,
) {
  const chain = rabdi({ accessKey: process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY || '' });
  await provider
    .request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chain.id.toString(16)}` }],
    })
    .catch(async (error: { code?: number }) => {
      if (error.code !== 4902) throw error;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${chain.id.toString(16)}`,
            chainName: 'Arkiv Rabdi',
            nativeCurrency: { name: 'Test GLM', symbol: 'tGLM', decimals: 18 },
            rpcUrls: [
              process.env.NEXT_PUBLIC_ARKIV_RPC ||
                'https://rpc.rabdi.db-chain.testnet.arkiv.network',
            ],
            blockExplorerUrls: ['https://rabdi.explorer.arkiv.network'],
          },
        ],
      });
    });
  const wallet = createWalletClient({ chain, transport: custom(provider), account: owner });
  const snapshot = stringToBytes(JSON.stringify(publicCharacter(c)));
  const values = {
    characterId: c.id,
    visibility: c.published ? 'public' : 'unlisted',
    name: c.name,
    proof,
    verifier,
    snapshot,
  };
  if (c.entityKey) {
    const { txHash } = await wallet.patchEntity(Characters, c.entityKey as Hex, { set: values });
    return { entityKey: c.entityKey, txHash };
  }
  const result = await wallet.createEntity(Characters, values, {
    expiration: ExpirationTime.fromDays(90),
  });
  return { entityKey: result.entityKey, txHash: result.txHash };
}
export async function transferArkiv(
  provider: EIP1193Provider,
  owner: Address,
  key: Hex,
  recipient: Address,
) {
  const wallet = createWalletClient({
    chain: rabdi({ accessKey: process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY || '' }),
    transport: custom(provider),
    account: owner,
  });
  return wallet.changeOwnership({ entityKey: key, newOwner: recipient });
}
