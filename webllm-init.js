// Lightweight WebLLM bootstrap. Loads a small instruct model and exposes
// window.webllm.complete(messages, onDelta) for streaming chat.
// Requires a WebGPU-enabled browser (Chromium-based or Firefox Nightly with flags).

// We import the ESM build from a CDN. If you want to pin versions, replace with a specific tag.
import { CreateMLCEngine } from 'https://esm.run/@mlc-ai/web-llm';

// Choose a compact, commonly available model for browsers.
// You can change this to any id from https://github.com/mlc-ai/web-llm model catalog.
const DEFAULT_MODEL = (window?.AI_BEHAVIOR?.model) || 'Phi-3-mini-4k-instruct-q4f16_1-MLC';

let enginePromise = null;

function ensureEngine(progressCb) {
  if (!('gpu' in navigator)) {
    const err = new Error('WebGPU is not supported on this device/browser.');
    // Still return a rejected promise for callers to handle.
    return Promise.reject(err);
  }
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(DEFAULT_MODEL, {
      initProgressCallback: (p) => {
        try { progressCb && progressCb(p); } catch {}
      },
    });
  }
  return enginePromise;
}

async function complete(messages, onDelta, options = {}) {
  const engine = await ensureEngine(options.onProgress);
  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: options.temperature ?? window?.AI_BEHAVIOR?.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? window?.AI_BEHAVIOR?.maxTokens ?? 768,
  });
  let full = '';
  for await (const part of stream) {
    const delta = part?.choices?.[0]?.delta?.content || '';
    if (delta) {
      full += delta;
      try { onDelta && onDelta(delta, full); } catch {}
    }
  }
  return full;
}

// Expose a small facade on window
window.webllm = {
  ensureEngine,
  complete,
  model: DEFAULT_MODEL,
};
