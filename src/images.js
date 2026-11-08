const MEDIA = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_BYTES = Number(process.env.BRIDGE_IMAGE_MAX_BYTES || 10 * 1024 * 1024);
export const MAX_IMAGES = Number(process.env.BRIDGE_IMAGE_MAX_COUNT || 50);

export function normalizeImage(block) {
  if (!block || block.type !== 'image') return { ok: false, reason: 'not an image block' };
  const src = block.source || {};
  if (src.type !== 'base64' || typeof src.data !== 'string' || !src.data) {
    return { ok: false, reason: `unsupported source ${src.type || 'none'}` };
  }
  const mediaType = String(src.media_type || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  if (!MEDIA.has(mediaType)) return { ok: false, reason: `unsupported media ${mediaType || 'none'}` };
  const bytes = Math.floor((src.data.length * 3) / 4);
  if (bytes > MAX_BYTES) return { ok: false, reason: `too large (${bytes} bytes)` };
  return { ok: true, mediaType, data: src.data, bytes };
}

function buildContent(text, images, toPart) {
  const parts = [];
  let cursor = 0;
  for (const image of images) {
    const at = text.indexOf(image.marker, cursor);
    if (at === -1) {
      if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) });
      cursor = text.length;
      parts.push(toPart(image));
      continue;
    }
    const before = text.slice(cursor, at + image.marker.length);
    if (before) parts.push({ type: 'text', text: before });
    parts.push(toPart(image));
    cursor = at + image.marker.length;
  }
  if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) });
  return parts;
}

export function anthropicContent(text, images) {
  return buildContent(text, images, (image) => ({
    type: 'image',
    source: { type: 'base64', media_type: image.mediaType, data: image.data },
  }));
}

export function openAIContent(text, images) {
  return buildContent(text, images, (image) => ({
    type: 'image_url',
    image_url: { url: `data:${image.mediaType};base64,${image.data}` },
  }));
}

export function estimateImageTokens(images) {
  return Array.isArray(images) ? images.length * 1600 : 0;
}

export function redactForLog(value) {
  if (typeof value === 'string') {
    return value.length > 512 && /^[A-Za-z0-9+/=]{64}/.test(value) ? `<base64 ${value.length} chars>` : value;
  }
  if (Array.isArray(value)) return value.map(redactForLog);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = key === 'data' && typeof item === 'string' ? `<base64 ${item.length} chars>` : redactForLog(item);
    }
    return out;
  }
  return value;
}
