"""Idempotent, privacy-preserving feedback: learn field structure, never patient values."""
import asyncio
import json
import os
import uuid
from threading import Lock
from datetime import datetime, timezone
from pathlib import Path
from rag_knowledge import feedback_document
from rag_pipeline import collection, embed, EMBED_MODEL

_stats_lock = Lock()

async def add_verified_case_to_kb(case_id: str, verified_form: dict):
    doc = feedback_document(case_id, verified_form)
    vector = await embed(doc['content'])
    col = await asyncio.to_thread(collection)
    metadata = {**doc['metadata'], 'date': datetime.now(timezone.utc).isoformat(), 'embedding_model': EMBED_MODEL}
    await asyncio.to_thread(col.upsert, ids=[doc['id']], documents=[doc['content']], embeddings=[vector], metadatas=[metadata])
    def write_stats():
        with _stats_lock:
            all_metadata = col.get(include=['metadatas'])
            stats = {'total_documents': col.count(), 'doctor_verified_cases_added': sum(m.get('source') == 'doctor_verified' for m in all_metadata['metadatas']), 'last_updated': metadata['date']}
            target = Path(os.getenv('CARELINK_KB_STATS_PATH', Path(__file__).parent / 'kb_stats.json'))
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(target.name + '.' + uuid.uuid4().hex + '.tmp')
            temporary.write_text(json.dumps(stats, indent=2), encoding='utf-8')
            os.replace(temporary, target)
            return stats
    stats = await asyncio.to_thread(write_stats)
    print(f"Knowledge base updated. Total documents: {stats['total_documents']}")
    return stats
