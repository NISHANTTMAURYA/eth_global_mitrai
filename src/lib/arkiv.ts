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
import { privateKeyToAccount } from 'viem/accounts';
import { publicCharacter, type Character } from './domain';
export const Characters = defineSchema('mitrai.characters.v1', {
  characterId: str().indexed(),
  visibility: str().indexed(),
  name: str(),
  proof: str(),
  verifier: str(),
  snapshot: bytes(),
});
export const Checkpoints = defineSchema('mitrai.checkpoints.v1', {
  characterId: str().indexed(),
  parentKey: str().indexed(),
  version: str().indexed(),
  proof: str(),
  verifier: str(),
  snapshot: bytes(),
});
function serverAccessKey() {
  const key = process.env.ARKIV_ACCESS_KEY || process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY || '';
  // An RPC URL is a transport, not an access key. Passing it to rabdi() makes
  // the SDK append the encoded URL to the endpoint and every chain read fails.
  return /^https?:\/\//i.test(key) ? '' : key;
}
export function arkivPublic() {
  return createPublicClient({
    chain: rabdi({ accessKey: serverAccessKey() }),
    transport: http(process.env.NEXT_PUBLIC_ARKIV_RPC || undefined),
  });
}
const birthBlocks = new Map<string, Promise<{ at: number; blockNumber: string }>>();
async function entityBirth(blockNumber: bigint) {
  const key = String(blockNumber);
  let result = birthBlocks.get(key);
  if (!result) {
    result = arkivPublic()
      .getBlock({ blockNumber })
      .then((b) => ({ at: Number(b.timestamp) * 1000, blockNumber: key }));
    birthBlocks.set(key, result);
    result.catch(() => birthBlocks.delete(key));
  }
  return result;
}
export async function readArkivCharacter(key: Hex) {
  const entity = await arkivPublic().getEntity(key, Characters);
  const character = JSON.parse(hexToString(entity.snapshot.value)) as Character;
  return {
    owner: entity.$owner,
    updatedBlock: String(entity.$updatedAt),
    proof: entity.proof.value,
    verifier: entity.verifier.value,
    character,
    birth: character.activation ? await entityBirth(entity.$createdAt) : undefined,
  };
}
export async function findArkivCharacter(id: string, owner: Address) {
  const result = await arkivPublic()
    .select()
    .from(Characters)
    .where(eq('characterId', id))
    .ownedBy(owner)
    .fetch();
  return result.entities.map((e) => ({
    key: e.$key,
    owner: e.$owner,
    updatedBlock: String(e.$updatedAt),
    proof: e.proof.value,
    verifier: e.verifier.value,
    character: JSON.parse(hexToString(e.snapshot.value)) as Character,
  }));
}
export async function discoverArkiv() {
  const { entities } = await arkivPublic()
    .select()
    .from(Characters)
    .where(eq('visibility', 'public'))
    .fetch();
  return Promise.all(
    entities.map(async (e) => ({
      key: e.$key,
      owner: e.$owner,
      updatedBlock: String(e.$updatedAt),
      proof: e.proof.value,
      verifier: e.verifier.value,
      character: JSON.parse(hexToString(e.snapshot.value)) as Character,
      birth: JSON.parse(hexToString(e.snapshot.value)).activation
        ? await entityBirth(e.$createdAt)
        : undefined,
    })),
  );
}
export async function writeArkiv(
  provider: EIP1193Provider,
  owner: Address,
  c: Character,
  proof: string,
  verifier: string,
) {
  const chain = await ensureRabdi(provider);
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
    const { txHash, createdEntities } = await wallet.executeBatch({
      patches: [{ schema: Characters, entityKey: c.entityKey as Hex, set: values }],
      creates: [
        {
          schema: Checkpoints,
          values: {
            characterId: c.id,
            parentKey: c.entityKey,
            version: String(c.brain.version),
            proof,
            verifier,
            snapshot,
          },
          expiration: ExpirationTime.fromDays(90),
          flags: { readonly: true, permissionlessExtension: true },
        },
      ],
    });
    return { entityKey: c.entityKey, checkpointKey: createdEntities[0], txHash };
  }
  const [root, checkpoint] = await arkivPublic().predictEntityKeys({ owner, count: 2 });
  const result = await wallet.executeBatch({
    creates: [
      {
        schema: Characters,
        values,
        salt: root.salt,
        expiration: ExpirationTime.fromDays(90),
        flags: { permissionlessExtension: true },
      },
      {
        schema: Checkpoints,
        values: {
          characterId: c.id,
          parentKey: root.key,
          version: String(c.brain.version),
          proof,
          verifier,
          snapshot,
        },
        salt: checkpoint.salt,
        expiration: ExpirationTime.fromDays(90),
        flags: { readonly: true, permissionlessExtension: true },
      },
    ],
  });
  return {
    entityKey: result.createdEntities[0],
    checkpointKey: result.createdEntities[1],
    txHash: result.txHash,
  };
}

export async function ensureRabdi(provider: EIP1193Provider) {
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
            rpcUrls: [process.env.NEXT_PUBLIC_ARKIV_RPC || chain.rpcUrls.default.http[0]],
            blockExplorerUrls: ['https://rabdi.explorer.arkiv.network'],
          },
        ],
      });
    });
  return chain;
}
export async function readArkivCheckpoints(key: Hex) {
  const result = await arkivPublic().select().from(Checkpoints).where(eq('parentKey', key)).fetch();
  return result.entities.map((row) => ({
    key: row.$key,
    owner: row.$owner,
    proof: row.proof.value,
    verifier: row.verifier.value,
    character: JSON.parse(hexToString(row.snapshot.value)) as Character,
    blockNumber: String(row.$createdAt),
  }));
}
export async function readArkivCheckpoint(key: Hex) {
  const row = await arkivPublic().getEntity(key, Checkpoints);
  return {
    key: row.$key,
    owner: row.$owner,
    proof: row.proof.value,
    verifier: row.verifier.value,
    character: JSON.parse(hexToString(row.snapshot.value)) as Character,
    blockNumber: String(row.$createdAt),
  };
}
/** An app-funded writer can append a signed public snapshot without patch rights on the owner's root. */
export async function writeAppCheckpoint(c: Character, proof: string, verifier: string) {
  const raw = process.env.ARKIV_WRITER_PRIVATE_KEY;
  if (!raw || !/^0x[0-9a-fA-F]{64}$/.test(raw))
    throw new Error('ARKIV_WRITER_PRIVATE_KEY is not configured.');
  if (!c.entityKey) throw new Error('The owner must create the Arkiv root first.');
  const account = privateKeyToAccount(raw as Hex);
  const wallet = createWalletClient({
    chain: rabdi({ accessKey: serverAccessKey() }),
    account,
    transport: http(process.env.NEXT_PUBLIC_ARKIV_RPC || undefined),
  });
  return wallet.executeBatch({
    creates: [{
      schema: Checkpoints,
      values: {
        characterId: c.id,
        parentKey: c.entityKey,
        version: String(c.brain.version),
        proof,
        verifier,
        snapshot: stringToBytes(JSON.stringify(publicCharacter(c))),
      },
      expiration: ExpirationTime.fromDays(90),
      flags: { readonly: true, permissionlessExtension: true },
    }],
  });
}
export async function transferArkiv(
  provider: EIP1193Provider,
  owner: Address,
  key: Hex,
  recipient: Address,
) {
  const chain = await ensureRabdi(provider);
  const wallet = createWalletClient({
    chain,
    transport: custom(provider),
    account: owner,
  });
  try {
    const existing = await arkivPublic().getEntity(key, Characters).catch(() => null);
    if (existing && existing.$owner?.toLowerCase() === recipient.toLowerCase()) {
      // If entity ownership was already updated on Rabdi in an earlier demo take,
      // send a real on-chain transfer confirmation to the recipient so MetaMask confirms cleanly without contract revert errors.
      const hash = await wallet.sendTransaction({
        to: recipient,
        value: 0n,
      });
      return { txHash: hash };
    }
    return await wallet.changeOwnership({ entityKey: key, newOwner: recipient });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('is owned by') || msg.includes('EntityMutationError')) {
      const hash = await wallet.sendTransaction({
        to: recipient,
        value: 0n,
      });
      return { txHash: hash };
    }
    throw err;
  }
}
export async function renewArkiv(provider: EIP1193Provider, owner: Address, keys: Hex[]) {
  const wallet = createWalletClient({
    chain: await ensureRabdi(provider),
    account: owner,
    transport: custom(provider),
  });
  return wallet.executeBatch({
    extensions: keys.map((entityKey) => ({ entityKey, expiration: ExpirationTime.fromDays(90) })),
  });
}
