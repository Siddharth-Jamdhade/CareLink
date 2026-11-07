"""Export seed knowledge vectors for the Sites D1 adapter; never export feedback/patient records."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from rag_pipeline import collection, EMBED_MODEL
from rag_knowledge import KB_PATH

def export(output):
    result = collection().get(where={'source': 'knowledge_base'}, include=['documents', 'metadatas', 'embeddings'])
    if not result['ids']:
        raise SystemExit('No seed vectors found. Run setup_vector_db.py first.')
    documents = [{'id': doc_id, 'content': result['documents'][i], 'metadata': result['metadatas'][i], 'embedding': result['embeddings'][i].tolist()} for i, doc_id in enumerate(result['ids'])]
    data = {'model': EMBED_MODEL, 'dimensions': 768, 'version': hashlib.sha256(KB_PATH.read_bytes()).hexdigest(), 'documents': documents}
    target = Path(output).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    os.replace(temporary, target)
    print(f'Exported {len(documents)} seed vectors to {target}. Patient feedback and records are excluded.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default=str(Path(__file__).resolve().parents[2] / 'carelink-hospital-portal/app/rag/seed-index.json'))
    export(parser.parse_args().output)
