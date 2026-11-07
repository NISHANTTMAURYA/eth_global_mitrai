import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const charRes = await client.query("SELECT body FROM characters WHERE id='8233fb15-7081-4340-b132-221886341183'");
    if (!charRes.rows.length) {
      console.log('Carrot Kid not found');
      return;
    }
    const c = charRes.rows[0].body;

    c.availability = 'transfer';
    c.askingPriceTglm = '15.5';
    c.highlights = [
      'Brain checkpoint 7 confirmed on Rabdi testnet',
      '5 public memory crystals preserved on-chain',
      'Ready for adoption by a new guardian'
    ];

    c.brain.habits = [
      {
        context: 'When someone shares an ambitious hackathon plan',
        action: 'Break it into one achievable next step and celebrate the courage to try.',
        successes: 5
      },
      {
        context: 'When someone is coding late into the night',
        action: 'Suggest taking a short breath, staying hydrated, and putting on ambient music.',
        successes: 4
      }
    ];
    c.brain.sessions = 12;
    c.brain.traits = { curiosity: 88, warmth: 85, playfulness: 100 };

    const existingMemIds = new Set((c.brain.memories || []).map(m => m.id));
    if (!existingMemIds.has('mem-carrot-4')) {
      c.brain.memories.push({
        id: 'mem-carrot-4',
        text: 'Discussed digital stewardship and how memories stay permanent on Arkiv even after ownership changes.',
        scope: 'public',
        createdAt: 1794005160000
      });
    }
    if (!existingMemIds.has('mem-carrot-5')) {
      c.brain.memories.push({
        id: 'mem-carrot-5',
        text: 'Talked about Mumbai local trains and coding till 4am — agreed that great demos require both courage and patience.',
        scope: 'public',
        createdAt: 1794005165000
      });
    }

    await client.query('UPDATE characters SET body=$1 WHERE id=$2', [
      JSON.stringify(c),
      '8233fb15-7081-4340-b132-221886341183'
    ]);
    console.log('✅ Carrot Kid upgraded: availability =', c.availability, 'memories =', c.brain.memories.length, 'habits =', c.brain.habits.length);

    // Also ensure the offer from 0x3333333333333333333333333333333333333333 exists and is pending
    const offerRes = await client.query("SELECT id FROM offers WHERE body->>'characterId'='8233fb15-7081-4340-b132-221886341183'");
    if (!offerRes.rows.length) {
      const offer = {
        id: 'offer-carrot-1',
        at: Date.now() - 3600000,
        from: '0x3333333333333333333333333333333333333333',
        note: 'Hello! I am an active web3 developer and I would love to adopt Carrot Kid and guide his next adventures.',
        epoch: 0,
        owner: '0x979e3ecb04de84980418d5146e557997150afc51',
        status: 'pending',
        bidTglm: '15.5',
        characterId: '8233fb15-7081-4340-b132-221886341183'
      };
      await client.query('INSERT INTO offers(id, body) VALUES($1, $2::jsonb)', [offer.id, JSON.stringify(offer)]);
      console.log('✅ Created pending adoption offer for Carrot Kid');
    } else {
      console.log('✅ Offer already exists for Carrot Kid');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run();
