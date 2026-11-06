import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vertexSchema } from '../src/lib/vertex-schema';
import { conversationSchema } from '../src/lib/chat';
test('Vertex wire schema has only string enums, including deeply nested numeric constraints', () => {
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        direction: { type: 'integer', enum: [-1, 1] },
        kind: { type: 'string', enum: ['interest', 'goal'] },
      },
    },
  };
  const result = vertexSchema(schema);
  assert.equal('enum' in result.items.properties.direction, false);
  assert.match((result.items.properties.direction as any).description, /-1, 1/);
  assert.deepEqual(result.items.properties.kind.enum, ['interest', 'goal']);
  assert.deepEqual(
    schema.items.properties.direction.enum,
    [-1, 1],
    'does not mutate local validation',
  );
  function inspect(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.enum) assert.ok(node.enum.every((v: unknown) => typeof v === 'string'));
    Object.values(node).forEach(inspect);
  }
  inspect(vertexSchema(conversationSchema));
});
