from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://afrizone_db_user:Y5tclyoZkkDfMJqIwhsCWNLThVNUNEfZ@dpg-d6lq0f450q8c73a8sit0-a.oregon-postgres.render.com/afrizone_db"

engine = create_engine(DATABASE_URL)

def run():
    with engine.connect() as conn:
        # Check and add latitude
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='orders' AND column_name='latitude'
                ) THEN
                    ALTER TABLE orders ADD COLUMN latitude FLOAT;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='orders' AND column_name='longitude'
                ) THEN
                    ALTER TABLE orders ADD COLUMN longitude FLOAT;
                END IF;
            END $$;
        """))
        conn.commit()
        print("✅ Migration complete: latitude and longitude added to orders")

if __name__ == "__main__":
    run()