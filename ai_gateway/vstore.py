import chromadb, os
from chromadb.config import Settings
from typing import Dict, Any
from config import CHROMA_PATH

os.makedirs(CHROMA_PATH, exist_ok=True)

_client = chromadb.Client(Settings(persist_directory=CHROMA_PATH))
COLL_NAME = "items"


def _collection():
    return _client.get_or_create_collection(
        COLL_NAME, metadata={"hnsw:space": "cosine"}
    )


def upsert_item_embedding(item_id: str, vector, metadata: Dict[str, Any]):
    coll = _collection()
    coll.upsert(
        ids=[item_id],
        embeddings=[vector.tolist()],
        metadatas=[metadata],
    )
    # _client.persist()  # Removido - persist() não existe mais no ChromaDB atual


def query_by_vector(vector, top_k: int = 5):
    coll = _collection()
    res = coll.query(
        query_embeddings=[vector.tolist()],
        n_results=top_k,
        include=["distances", "metadatas"],
    )
    out = []
    for i, _id in enumerate(res["ids"][0]):
        out.append(
            {
                "id": _id,
                "distance": float(res["distances"][0][i]),
                "metadata": res["metadatas"][0][i],
            }
        )
    return out
