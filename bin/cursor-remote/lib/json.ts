/** Parse JSON with trailing commas (VS Code workspace files). */
export function loadJsonLenient(text: string): unknown {
  const cleaned = text.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(cleaned);
}
