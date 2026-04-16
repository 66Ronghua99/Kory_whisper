const SECRET_KEYS = new Set([
  'apiKey',
  'api_key',
  'authorization',
  'Authorization'
]);

function redactSecrets(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const redacted = {};
  for (const [key, nextValue] of Object.entries(value)) {
    redacted[key] = SECRET_KEYS.has(key) ? '' : redactSecrets(nextValue);
  }
  return redacted;
}

module.exports = {
  redactSecrets
};
