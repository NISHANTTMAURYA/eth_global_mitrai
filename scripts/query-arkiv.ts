import { createPublicClient } from '@arkiv-network/sdk';
import { rabdi } from '@arkiv-network/sdk/chains';
import { eq } from '@arkiv-network/sdk/query';
import { http, hexToString } from 'viem';
import { Characters } from '../src/lib/arkiv';
const client = createPublicClient({
  chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY || '' }),
  transport: http(process.env.ARKIV_RPC),
});
const query = client.select().from(Characters).where(eq('visibility', 'public'));
const result = process.env.ARKIV_OWNER
  ? await query.ownedBy(process.env.ARKIV_OWNER as `0x${string}`).fetch()
  : await query.fetch();
for (const row of result.entities)
  console.log(
    JSON.stringify(
      {
        entityKey: row.$key,
        owner: row.$owner,
        name: row.name.value,
        character: JSON.parse(hexToString(row.snapshot.value)),
        verifier: row.verifier.value,
      },
      null,
      2,
    ),
  );
console.log(
  `${result.entities.length} returned. Other creators can use this schema; independently verify the engine signature and canonical entity key before trusting a record.`,
);
