/** Vertex's responseSchema enum wire field accepts strings only.
 * Keep numeric validation in the local parser; express numeric choices as guidance. */
export function vertexSchema<T>(schema: T): T {
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const result = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, visit(item)]),
    );
    if (Array.isArray(result.enum) && result.enum.some((item) => typeof item !== 'string')) {
      const choices = result.enum;
      delete result.enum;
      result.description = [
        result.description,
        `Allowed values: ${choices.map(String).join(', ')}.`,
      ]
        .filter(Boolean)
        .join(' ');
    }
    return result;
  }
  return visit(schema) as T;
}
