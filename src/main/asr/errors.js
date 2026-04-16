function redactSecretText(text, secrets = []) {
  let output = String(text || '');
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 0) {
      output = output.split(secret).join('[redacted]');
    }
  }
  output = output.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]');
  return output;
}

function createAsrError(message, options = {}) {
  const secrets = options.secrets || [];
  return new Error(redactSecretText(message, secrets));
}

module.exports = {
  createAsrError,
  redactSecretText
};
