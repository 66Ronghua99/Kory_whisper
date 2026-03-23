/**
 * Clipboard-only text delivery helpers.
 * Deps: electron (runtime only)
 * Used By: platform input simulators
 * Last Updated: 2026-03-23
 */

function normalizeTextForClipboard(text, options = {}) {
  if (!text || !text.trim()) {
    return null;
  }

  const appendSpace = options.appendSpace !== false;
  let processedText = text.trim();

  if (appendSpace && !processedText.endsWith(' ') && !processedText.endsWith('。')) {
    processedText += ' ';
  }

  return processedText;
}

async function deliverTextToClipboard(text, options = {}) {
  const processedText = normalizeTextForClipboard(text, options);
  if (!processedText) {
    return null;
  }

  const clipboard = options.clipboard || require('electron').clipboard;
  clipboard.writeText(processedText);
  console.log('[Input] Text copied to clipboard:', processedText);
  return processedText;
}

module.exports = {
  normalizeTextForClipboard,
  deliverTextToClipboard
};
