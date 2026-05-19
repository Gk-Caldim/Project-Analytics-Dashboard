from app.utils.suggestions import suggest_data_type

def test_suggest_phone_types():
    assert suggest_data_type("phone_number") == "phone"
    assert suggest_data_type("MobileContact") == "phone"
    assert suggest_data_type("contact_details") == "phone"

def test_suggest_email_types():
    assert suggest_data_type("user_email") == "email"
    assert suggest_data_type("EMAIL_ADDRESS") == "email"

def test_suggest_date_types():
    assert suggest_data_type("created_date") == "date"
    assert suggest_data_type("due_time") == "date"
    assert suggest_data_type("deadline") == "date"

def test_suggest_currency_types():
    assert suggest_data_type("estimated_budget") == "currency"
    assert suggest_data_type("item_cost") == "currency"
    assert suggest_data_type("salary_amount") == "currency"

def test_suggest_boolean_types():
    assert suggest_data_type("is_active") == "boolean"
    assert suggest_data_type("has_permissions") == "boolean"
    assert suggest_data_type("enabled") == "boolean"

def test_suggest_text_fallback():
    assert suggest_data_type("unknown_field_name") == "text"
    assert suggest_data_type("description") == "long_text"
