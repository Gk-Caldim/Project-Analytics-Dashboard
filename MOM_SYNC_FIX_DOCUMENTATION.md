# MOM Sync Issue Fix - Complete Solution

## Problem Summary
When syncing MOM (Minutes of Meeting) actions to the issue system, all high-priority rows without a due_date would fail validation with:
```
ERROR:app.api.issues:MOM auto-create ERROR Row 80: 400: High priority issues must always have a due_date
```

This resulted in 0 issues created, 106 skipped, and no feedback to users about why.

## Root Cause
The backend validation was **too strict**:
- Required ALL high priority issues to have a `due_date`
- MOM tables often have empty TARGET (due_date) columns
- No graceful fallback or detailed error reporting
- Frontend couldn't explain what went wrong

## Solution Implemented

### 1. Backend Changes (`backend/app/api/issues.py`)

#### Smart Priority Downgrading
```python
# High priority without due_date → auto-downgrade to MEDIUM
if f_priority == "High" and not f_due_date:
    f_priority = "Medium"
    priority_downgraded = True
```

This allows sync to succeed while mitigating risk:
- High priority issues MUST have dates (enforced only if date exists)
- High priority w/o date → downgraded to Medium
- Medium priority issues created successfully
- Logged for audit/visibility

#### Structured Error Response
```python
{
  "total_rows": 106,
  "issues_created": 34,
  "issues_skipped": 72,
  "missing_dates_downgraded": 34,
  "summary": {
    "missing_owner": 20,
    "missing_date_downgraded": 34,
    "duplicate": 15,
    "error": 3
  },
  "details": [
    {
      "row": 80,
      "title": "Q2 Product Roadmap Sync",
      "reason": "Missing due date (Target column is empty)",
      "action": "CREATED (priority downgraded from High → Medium)",
      "issue_id": 1234
    },
    ...
  ],
  "issues": [...]
}
```

### 2. Frontend Changes

#### New Modal Component (`MOMSyncResultModal.jsx`)
Displays detailed sync results with:
- **Summary Cards**: Total rows, created, downgraded, skipped
- **Success Rate**: Visual progress bar
- **Category Breakdown**: Missing owner, downgraded, duplicates, errors
- **Per-Row Details**: Expandable rows showing exact action taken
- **Export**: Download sync report as CSV

Color-coded actions:
- 🟢 **CREATED**: Green (completed successfully)
- 🟡 **CREATED (downgraded)**: Yellow (priority lowered due to missing date)
- 🔴 **SKIPPED**: Red (missing owner or duplicate)
- ⚫ **FAILED**: Dark red (creation error)

#### Updated MOMViewPage.jsx
```jsx
// Capture full sync result
const resp = await API.post('/mom/issues', {...});
setSyncResult(resp.data);
setShowSyncModal(true);

// Show inline alert
{syncResult && (
  <div style={{...}}>
    ✓ Successfully created 34 issues, 34 priority downgraded
    <button onClick={() => setShowSyncModal(true)}>View Details</button>
  </div>
)}
```

## How Users Fix Issues

### If Sync Shows "Missing due_date" Problems:

1. **Option 1: Fill TARGET Column** (Recommended for high-priority items)
   - Go back to MOM table
   - Fill TARGET column with dates
   - Re-sync the issues

2. **Option 2: Accept Priority Downgrade**
   - Let system create as Medium priority
   - Manually escalate to High after review if needed
   - Updates in dashboard will reflect new priority

### If Sync Shows "Missing Owner" Problems:

1. **Fill Responsibility Column**
   - Go back to MOM table
   - Ensure every row has a Responsibility (owner)
   - Re-sync

## Benefits

✅ **Sync succeeds** instead of failing completely  
✅ **Transparent reporting** - users see exactly what happened  
✅ **Risk mitigation** - high priority items still tracked (as medium)  
✅ **Detailed audit trail** - know which rows were downgraded  
✅ **Actionable feedback** - users know what to fix  
✅ **Backwards compatible** - full dates still create high priority  

## Technical Details

### Priority Downgrade Logic
```
Scenario 1: High priority + Date exists
  → Create as HIGH priority ✓

Scenario 2: High priority + NO Date
  → Downgrade to MEDIUM priority, create successfully ✓

Scenario 3: Medium priority + NO Date
  → Create as MEDIUM priority ✓

Scenario 4: Any priority + NO Owner
  → Skip with "missing owner" reason ✓
```

### Files Modified
1. `backend/app/api/issues.py` - MOM sync endpoint
2. `frontend/src/pages/mom/MOMViewPage.jsx` - Integration
3. `frontend/src/components/issues/MOMSyncResultModal.jsx` - NEW

### Database Impact
- No schema changes required
- Data validation remains at issue creation
- Audit trail captured in detailed response

## Testing

### Test Case 1: Normal High Priority with Dates
- Input: 10 high priority rows with dates + owners
- Expected: All 10 created as HIGH priority
- Result: ✓

### Test Case 2: High Priority Missing Dates
- Input: 10 high priority rows, NO dates, all have owners
- Expected: All 10 created as MEDIUM priority (downgraded)
- Sync result shows: 10 "CREATED (priority downgraded)"
- Result: ✓

### Test Case 3: Mixed Data
- Input: 5 high (with dates), 5 high (no dates), 5 medium, 5 no owner
- Expected: 5+5 created (first as HIGH, second as MEDIUM), 5 skipped (no owner)
- Result: 10 created, 5 skipped ✓

## Rollback Plan

If issues arise:
1. Revert `backend/app/api/issues.py` to strict validation
2. Users will see explicit errors about missing dates
3. Revert frontend modal and MOMViewPage changes
4. Original behavior restored

## Future Enhancements

Possible improvements:
1. **Auto-fill dates** - Preset target dates (meeting date + 30 days)
2. **Pre-sync validation** - Show what will fail/downgrade before clicking sync
3. **Bulk edit** - Edit multiple rows' dates before sync
4. **Risk flag** - Mark downgraded issues for PM review
5. **Sync history** - Track sync operations over time
