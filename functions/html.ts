/** Keep serialized data inside its HTML <script type="application/json"> element. */
export function serializeJsonForHtml(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError("Value is not JSON-serializable");
  // A literal '<' could start </script>, <!--, or another HTML token.
  // JSON.parse decodes the escape, preserving the original data exactly.
  return json.replace(/</g, "\\u003c");
}
