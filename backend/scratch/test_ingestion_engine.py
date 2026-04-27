import sys
import os
import pandas as pd
from openpyxl import Workbook
from io import BytesIO

# Add backend to path to import app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.utils.ingestion import IngestionEngine

def create_sample_excel():
    wb = Workbook()
    ws = wb.active
    ws.title = "TestSheet"

    # Row 1: Some noise
    ws.append(["Confidential", "", "", "", "Report v1.0"])
    
    # Row 2 & 3: Multi-row Merged Header
    # Col A: "Project Info" merged across A2:B2
    ws.merge_cells('A2:B2')
    ws['A2'] = "Project Info"
    
    # Col C: "Timeline" merged across C2:D2
    ws.merge_cells('C2:D2')
    ws['C2'] = "Timeline"
    
    # Col E: "Financials" (Single row header part)
    ws['E2'] = "Financials"
    
    # Row 3: Sub-headers
    ws['A3'] = "Project Name"
    ws['B3'] = "Project Code"
    ws['C3'] = "Start Date"
    ws['D3'] = "End Date"
    ws['E3'] = "Budget (USD)"

    # Data Rows (Added more to pass 70% numeric threshold)
    ws.append(["Alpha", "P001", "2023-01-15", "15/06/2023", "1,200.50"])
    ws.append(["Beta", "P002", "2023-02-20", "20/07/2023", "2500"])
    ws.append(["Gamma", "P003", "2023-03-25", "25/08/2023", "3000.75"])
    ws.append(["Delta", "P004", "NaN", "null", "N/A"]) # 3/4 numeric = 75% > 70%
    
    out = BytesIO()
    wb.save(out)
    return out.getvalue()

def test_ingestion():
    engine = IngestionEngine()
    excel_content = create_sample_excel()
    
    print("Starting ingestion test...")
    try:
        result = engine.ingest(excel_content, "test.xlsx")
        print(f"Ingestion successful! Records found: {len(result)}")
        
        # Check headers
        if result:
            headers = list(result[0].keys())
            print(f"Detected Headers: {headers}")
            
            # Expected headers: 
            # project_info_project_name, project_info_project_code, 
            # timeline_start_date, timeline_end_date, budget_usd
            
            for i, record in enumerate(result):
                print(f"Row {i+1}: {record}")
                
    except Exception as e:
        print(f"Ingestion failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ingestion()
