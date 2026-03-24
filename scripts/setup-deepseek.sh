#!/bin/bash
# Setup DeepSeek-R1-Distill-Llama-8B for RepoFlow
# Run: ./scripts/setup-deepseek.sh
# Prerequisite: Ollama installed (curl -fsSL https://ollama.com/install.sh | sh)

set -e

echo ">>> Checking Ollama..."
if ! command -v ollama &> /dev/null; then
  echo "Ollama not found. Install it first:"
  echo "  curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
fi

echo ">>> Pulling deepseek-r1:8b (DeepSeek-R1-Distill-Llama-8B)..."
ollama pull deepseek-r1:8b

echo ""
echo ">>> Done. Ensure Ollama is running (ollama serve) and add to .env.local:"
echo "   OLLAMA_MODEL=deepseek-r1:8b"
