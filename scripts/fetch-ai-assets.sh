#!/usr/bin/env bash
# fetch-ai-assets.sh
# Downloads the offline AI runtime + model into this repo.
#
# The AI module is fully offline: it loads transformers.js (ONNX Runtime WASM)
# and its model from local files served by this app, never from the internet.
# Run this once on a machine with internet access:
#
#     bash scripts/fetch-ai-assets.sh
#
# After it completes, the app (and its service worker) can serve the AI chat
# with no server or internet connection.
set -euo pipefail

TJS_VERSION="3.8.1"
ORT_VERSION="1.22.0-dev.20250409-89f8206ba4"
TJS_TARBALL="https://registry.npmjs.org/@huggingface/transformers/-/transformers-${TJS_VERSION}.tgz"
ORT_TARBALL="https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-${ORT_VERSION}.tgz"

MODEL_REPO="onnx-community/SmolLM2-135M-Instruct"
MODEL_DIR="models/SmolLM2-135M-Instruct"
MODEL_BASE="https://huggingface.co/${MODEL_REPO}/resolve/main"
MODEL_FILES="model_int8.onnx config.json generation_config.json tokenizer.json tokenizer_config.json"

TJS_DIR="js/vendor/transformers"
WASM_DIR="${TJS_DIR}/onnxruntime-web"

mkdir -p "${MODEL_DIR}" "${TJS_DIR}" "${WASM_DIR}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

echo "==> transformers.js runtime v${TJS_VERSION}"
curl -fsSL "${TJS_TARBALL}" -o "${TMP}/tjs.tgz"
tar -xzf "${TMP}/tjs.tgz" -C "${TMP}"
cp "${TMP}/package/dist/transformers.min.js" "${TJS_DIR}/transformers.js"

echo "==> ONNX Runtime Web WASM (v${ORT_VERSION})"
curl -fsSL "${ORT_TARBALL}" -o "${TMP}/ort.tgz"
tar -xzf "${TMP}/ort.tgz" -C "${TMP}"
cp "${TMP}/package/dist/ort.bundle.min.mjs" "${TJS_DIR}/ort.bundle.min.mjs"
cp "${TMP}/package/dist/ort-wasm-simd-threaded.wasm" "${WASM_DIR}/ort-wasm-simd-threaded.wasm"

echo "==> AI model ${MODEL_REPO}"
for f in ${MODEL_FILES}; do
  echo "    ${MODEL_DIR}/${f}"
  curl -fL --retry 3 "${MODEL_BASE}/${f}" -o "${MODEL_DIR}/${f}"
done

echo
echo "Done. Offline AI assets installed:"
du -sh "${TJS_DIR}" "${MODEL_DIR}"
