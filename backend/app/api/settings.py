import os
import shutil
import base64
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.settings import SystemSetting as SystemSettingModel
from app.schemas.settings import SystemSetting as SystemSettingSchema, SystemSettingBase, BulkSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/", response_model=List[SystemSettingSchema])
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettingModel).all()
    
    # Initial setup / ensure all default settings exist
    default_settings = [
        {"category": "Organization", "key": "company_name", "value": "Industrial Analytics Platform", "type": "text"},
        {"category": "Organization", "key": "company_logo", "value": "", "type": "image"},
        {"category": "Organization", "key": "hq_address", "value": "123 Tech City, Industrial Park", "type": "text"},
        {"category": "Organization", "key": "operational_country", "value": "India", "type": "text"},
        {"category": "Organization", "key": "base_currency", "value": "USD ($)", "type": "select"},
        {"category": "Branding", "key": "primary_color", "value": "#6366f1", "type": "color"},
        {"category": "Branding", "key": "secondary_color", "value": "#0ea5e9", "type": "color"},
        {"category": "Branding", "key": "display_mode", "value": "light", "type": "select"},
        {"category": "System", "key": "auto_backup", "value": "true", "type": "toggle"},
        {"category": "System", "key": "notifications_enabled", "value": "true", "type": "toggle"},
        {"category": "Connections", "key": "smtp_host", "value": "smtp.gmail.com", "type": "text"},
        {"category": "Connections", "key": "smtp_port", "value": "587", "type": "number"},
        {"category": "Connections", "key": "smtp_user", "value": "", "type": "text"},
        {"category": "Connections", "key": "smtp_pass", "value": "", "type": "text"}
    ]
    
    existing_keys = {s.key for s in settings}
    added = False
    for ds in default_settings:
        if ds["key"] not in existing_keys:
            db_setting = SystemSettingModel(**ds)
            db.add(db_setting)
            added = True
    
    if added:
        db.commit()
        settings = db.query(SystemSettingModel).all()
        
    return settings

@router.patch("/bulk", response_model=List[SystemSettingSchema])
def update_bulk_settings(update_data: BulkSettingsUpdate, db: Session = Depends(get_db)):
    for setting in update_data.settings:
        db_setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == setting.key).first()
        if db_setting:
            db_setting.value = setting.value
        else:
            # Create if doesn't exist
            db_setting = SystemSettingModel(**setting.dict())
            db.add(db_setting)
    
    db.commit()
    return db.query(SystemSettingModel).all()

@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Read file content
    contents = await file.read()
    file_extension = os.path.splitext(file.filename)[1].replace('.', '')
    if not file_extension:
        file_extension = "png"
        
    # Convert to base64
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:image/{file_extension};base64,{base64_data}"
    
    # Update the setting in database
    db_setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == "company_logo").first()
    if db_setting:
        db_setting.value = data_url
    else:
        db_setting = SystemSettingModel(
            category="Organization",
            key="company_logo",
            value=data_url,
            type="image"
        )
        db.add(db_setting)
        
    db.commit()
    
    return {"url": data_url}
