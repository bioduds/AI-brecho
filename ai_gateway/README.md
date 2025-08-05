# AI Gateway — Brechó (Local, AI-first)

**What it does**

- Image → vector embedding (OpenCLIP) and **similarity search** on a **local Chroma DB** (on-disk).
- **Gemma 3:4B** (via **Ollama**) acts as the **orchestrator** to normalize fields, pick the best match, and return a JSON cadastro.
- Auto-link to **Consignante** using a **session QR** captured in the photos (read via OpenCV QRCodeDetector).

> Privacy-friendly and **offline**. Your mom just **takes pictures**; the system does the rest.

---

## Quickstart

1) (Recommended) Install **Ollama** and pull a Gemma model (e.g. `gemma3:4b` or `llama3.2:latest` when available):

```
ollama pull gemma3:4b
```

2) Create a Python venv and install requirements:

```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# On macOS arm64, install torch with:
# pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

3) Run the server:

```
uvicorn server:app --reload --port 8808
```

4) Test image search (replace with a real JPG/PNG):

```
curl -X POST http://localhost:8808/search_by_image   -F "image=@/path/to/photo.jpg"   -F "top_k=5"
```

5) Streamlit app can call these endpoints to:

- show **Top-K similares**,
- let the user **confirm/override**,
- auto-**cadastrar** with JSON returned by `/intake/autoregister`.

---

## Endpoints

### `POST /index/upsert`

Register/update an item with images and metadata. Creates multi-view embedding.
**Form-data:**

- `sku` (optional; if absent, Gemma proposes one)
- `consignor_id` (optional; if absent, try session QR or ask Gemma to infer from context)
- `category`, `brand`, `size`, `condition`, `list_price`, etc. (optional)
- `images[]` (1..6 files)

### `POST /search_by_image`

Return most similar items from the vector DB.
**Form-data:**

- `image` (file)
- `top_k` (int, default=5)

### `POST /intake/autoregister`

Given 2–6 photos, the system:

- Reads **QR** in any frame for `consignor_id` (optional, but recommended).
- Runs **similarity search** to find duplicates/variants.
- Asks **Gemma** to normalize category/brand/size/condition.
- Returns a **JSON cadastro** + suggested `sku` + `price_band`.
**Form-data:**
- `images[]` (2..6 files)

### `POST /price/suggest`

Combines rules + Gemma rationale to suggest a price band.

---

## How it links to the Consignante

**Session QR**: print a small card with **ConsignanteID** (e.g., `C0001`).At intake, place the card on the table. The camera will capture it in 1–2 photos. The detector attaches this `consignor_id` to all items in the request. (No typing needed.)

Fallbacks:

- Manual override in the Streamlit confirmation step.
- OCR of handwritten ID (optional later).

---

## Vector DB

- **Chroma** on-disk (`./vectordb/`).
- One record per item + per-view embeddings (multi-view pooled embedding).

---

## Model Choices

- **Embedder**: OpenCLIP ViT-B/32 (fast, robust, small).
- **LLM**: **Gemma** via **Ollama** HTTP (`http://localhost:11434/api/generate`).

You can later fine-tune:

- **CLIP head** for your categories/defect cues.
- **Gemma** (LoRA) with your JSON targets and legendas.

---

## Security & Consent

- All local, no cloud by default.
- Face recognition **disabled** by default.
- We **only** read QR codes and clothing images for linking **with your consent**.
