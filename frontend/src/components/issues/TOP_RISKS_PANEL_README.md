# Top Risks Panel - Usage Guide

## Component Overview

The **TopRisksPanel** is a new dashboard component that displays the top 5 high-risk issues with instant visual insights.

## Location & Integration

**File Path:** `frontend/src/components/issues/TopRisksPanel.jsx`

**Integrated In:** `VPProjectDashboard.jsx` (displays in main grid alongside Critical Issues)

## Features

### Display Elements
- **Title**: Issue name (2-line truncation for brevity)
- **Owner**: Person responsible for the issue
- **Priority Badge**: High/Medium/Low with color coding
- **Count Badge**: Shows total number of risks (max 5)

### Color Coding
```
High Priority:    🔴 Red (#991b1b text on #fee2e2 background)
Medium Priority:  🟡 Yellow (#854d0e text on #fef9c3 background)
Low Priority:     🟢 Green (#0c4a6e text on #f0f9ff background)
```

### Interactions
- **Hover**: Card shifts right with shadow effect
- **Click**: Opens IssueDetailModal for full issue details
- **Count Badge**: Shows at-a-glance risk count
- **ChevronRight Icon**: Visual indicator for clickability

## Component Props

```jsx
<TopRisksPanel projectId={activeProject.dbProjectId} />
```

**Required Props:**
- `projectId` (number): The project database ID

## States & Feedback

### Loading State
- Shows 3 skeleton loaders while fetching issues
- Smooth animation while loading

### Empty State
- Displays "No risks detected" message with green checkmark
- Indicates project is healthy

### Error State
- Shows error message in red
- Allows users to understand what went wrong

## Data Integration

### Backend Requirements
The component expects these endpoints:
- `GET /issues/project/{projectId}/critical?limit=5` - Returns top 5 critical issues

### Issue Object Structure
```json
{
  "id": 123,
  "title": "Issue title",
  "owner": "Person Name",
  "priority": "High" | "Medium" | "Low",
  "status": "Open" | "In Progress" | "Closed",
  "due_date": "2024-04-20"
}
```

## Styling & Layout

### Grid Position
- Placed in 2-column grid (1fr 1fr)
- Full responsive width
- Minimum height: 280px

### Card Styling
- 4px left border (priority color)
- 12px padding
- 6px border-radius
- Smooth hover transitions
- High contrast for visibility

## Responsive Design

The component uses inline styles and is mobile-responsive:
- Flex layout for stacking items
- Overflow auto for lists exceeding viewport
- Touch-friendly interaction areas

## Customization

To modify display limits, update:
```jsx
const data = await getCriticalIssues(projectId, 5);  // Change 5 to desired number
```

To adjust colors, edit the `PRIORITY_COLORS` object in `api/issues.js`

## Performance Considerations

- Fetches only 5 issues (optimized query)
- Caches IssueDetailModal state
- Smooth animations use CSS transforms
- No unnecessary re-renders on hover

## Accessibility

- Color-coded + text labels (not relying on color alone)
- Semantic HTML structure
- Clear visual hierarchy
- Keyboard navigation support through modal

## Future Enhancements

Possible additions:
- Filters for priority/status
- Bulk actions on multiple issues
- Sort by due date/owner
- Custom risk threshold configuration
- Export functionality
- Risk trend analytics
