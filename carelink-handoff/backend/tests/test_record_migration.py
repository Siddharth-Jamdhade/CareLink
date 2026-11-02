import unittest
from sqlalchemy import create_engine, text, inspect
from app.database import upgrade_record_details

class RecordMigrationTest(unittest.TestCase):
    def test_existing_rows_survive_idempotent_upgrade(self):
        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                connection.execute(text("CREATE TABLE extracted_facts (id TEXT PRIMARY KEY, provider_name TEXT)"))
                connection.execute(text("INSERT INTO extracted_facts VALUES ('demo', 'Dr. Demo')"))
            upgrade_record_details(engine)
            upgrade_record_details(engine)
            self.assertIn("documented_diagnosis", {c["name"] for c in inspect(engine).get_columns("extracted_facts")})
            with engine.connect() as connection:
                self.assertEqual(connection.execute(text("SELECT provider_name, documented_diagnosis FROM extracted_facts")).one(), ("Dr. Demo", None))
        finally:
            engine.dispose()
