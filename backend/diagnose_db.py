import sys
import os
from sqlalchemy import text

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.core.database import engine

def diagnose():
    print("Diagnosing database columns for customer_complaint table...")
    try:
        with engine.connect() as conn:
            # Check if customer_complaint table exists
            res = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_complaint');"))
            exists = res.scalar()
            print(f"Table 'customer_complaint' exists: {exists}")
            
            if exists:
                # List columns
                res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_complaint';"))
                columns = res.fetchall()
                print("Columns in 'customer_complaint':")
                for col in columns:
                    print(f"  - {col[0]} ({col[1]})")
            
            # Check if sentiment_analysis table exists
            res = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sentiment_analysis');"))
            exists_sentiment = res.scalar()
            print(f"Table 'sentiment_analysis' exists: {exists_sentiment}")
            
            if exists_sentiment:
                res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sentiment_analysis';"))
                columns_sentiment = res.fetchall()
                print("Columns in 'sentiment_analysis':")
                for col in columns_sentiment:
                    print(f"  - {col[0]} ({col[1]})")
                    
    except Exception as e:
        print(f"Error during diagnosis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnose()
