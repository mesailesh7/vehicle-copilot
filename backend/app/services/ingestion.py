import os
import shutil
import tempfile

from typing import List
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

from app.config import settings

qdrant_client = QdrantClient(
    url = settings.qdrant_url,
    api_key = settings.qdrant_api_key if settings.qdrant_api_key else None,
)

EMBEDDING_DIM = 1536
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_key=settings.openai_api_key
)

def ensure_collection_exists(collection_name: str = settings.qdrant_collection_name ):
    collections = [c.name for c in qdrant_client.get_collections().collections]
    if collection_name not in collections:
        qdrant_client.create_collection(collection_name=collection_name, vectors_config=VectorParams(
            size=EMBEDDING_DIM,
            distance=Distance.COSINE,
        ))

def get_vector_store()->QdrantVectorStore:
    ensure_collection_exists()
    return QdrantVectorStore(
        client=qdrant_client,
        collection_name=settings.qdrant_collection_name,
        embedding=embeddings,
    )

async def process_pdf_manual(file:UploadFile, vehicle_id:int) -> int:
    """Extracts, chunks, embeds, and stores a PDF document for a specific vehicle."""
    ensure_collection_exists()

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf",
    ) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        raw_docs = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", " ", ""]
        )
        split_docs = splitter.split_documents(raw_docs)

        for doc in split_docs:
            doc.metadata["vehicle_id"] = vehicle_id
            doc.metadata["source_filename"] = file.filename

        vector_store = get_vector_store()
        vector_store.add_documents(split_docs)

        return len(split_docs)

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)