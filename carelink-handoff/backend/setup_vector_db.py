"""Rebuild seed embeddings while preserving separately reviewed feedback structures."""
import asyncio
from rag_knowledge import build_documents
from rag_pipeline import collection, embed, EMBED_MODEL

async def main():
    documents = build_documents()
    gate = asyncio.Semaphore(3)
    async def vector(doc):
        async with gate:
            return await embed(doc['title'] + '\n' + doc['content'])
    # Complete all provider requests before changing the existing local index.
    vectors = await asyncio.gather(*(vector(doc) for doc in documents))
    col = await asyncio.to_thread(collection)
    await asyncio.to_thread(col.delete, where={'source': 'knowledge_base'})
    metadata = [{**d['metadata'], 'embedding_model': EMBED_MODEL} for d in documents]
    await asyncio.to_thread(col.upsert, ids=[d['id'] for d in documents], documents=[d['content'] for d in documents], metadatas=metadata, embeddings=vectors)
    print(f"Knowledge base ready: {len(documents)} documents embedded and stored in {col.name}. Total documents: {col.count()}")

if __name__ == '__main__':
    asyncio.run(main())
