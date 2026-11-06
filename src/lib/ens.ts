import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { namehash } from 'viem/ens';
import { lifecycle, type Character } from './domain';

export const ENS_PARENT_DOMAIN = 'mitrai.eth';

export function characterSubname(c: Pick<Character, 'name'>): string {
  const clean = c.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'companion';
  return `${clean}.${ENS_PARENT_DOMAIN}`;
}

export type EnsPassport = {
  subname: string;
  parent: string;
  node: `0x${string}`;
  resolver: string;
  owner: string;
  records: Record<string, string>;
  createdAt: number;
};

export function getCharacterEnsPassport(c: Character): EnsPassport {
  const subname = characterSubname(c);
  let node: `0x${string}`;
  try {
    node = namehash(subname);
  } catch {
    node = namehash('companion.mitrai.eth');
  }
  const l = lifecycle(c);
  return {
    subname,
    parent: ENS_PARENT_DOMAIN,
    node,
    resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41', // Standard PublicResolver
    owner: c.owner,
    records: {
      'description': c.tagline,
      'arkiv.entity': c.entityKey || 'Unregistered (Local Draft)',
      'agent.model': c.model,
      'agent.status': l.stage,
      'agent.guardian': c.owner,
      'agent.epoch': String(c.ownershipEpoch ?? 0),
      'agent.lifespan': `${Math.max(0, Math.round(l.remaining / 86400000))}d remaining`,
      'agent.availability': c.availability,
      'url': `${typeof window !== 'undefined' ? window.location.origin : process.env.APP_ORIGIN || 'http://localhost:3000'}/companion/${c.id}`,
    },
    createdAt: c.birth?.at ?? c.createdAt,
  };
}

let publicClientMainnet: ReturnType<typeof createPublicClient> | null = null;

export function getEnsPublicClient() {
  if (!publicClientMainnet) {
    publicClientMainnet = createPublicClient({
      chain: mainnet,
      transport: http(process.env.ENS_ETHEREUM_RPC || 'https://ethereum-rpc.publicnode.com'),
    });
  }
  return publicClientMainnet;
}

export async function resolveEnsName(address: string): Promise<string | null> {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  try {
    const client = getEnsPublicClient();
    return await client.getEnsName({ address: address as `0x${string}` });
  } catch {
    return null;
  }
}

