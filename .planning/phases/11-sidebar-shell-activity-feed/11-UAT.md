---
status: testing
phase: 11-sidebar-shell-activity-feed
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md]
started: 2026-03-25T07:30:00Z
updated: 2026-03-25T07:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server. Start the application with `npm run dev`. Server boots without errors on port 5001. Opening http://localhost:5001 in a browser loads the app without console errors.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Start the application with `npm run dev`. Server boots without errors on port 5001. Opening http://localhost:5001 loads the app without console errors.
result: [pending]

### 2. Three-Tab Sidebar Visible
expected: When viewing a project, the right sidebar shows three tabs at the top: "Activity", "Brain & Docs", and "Approvals". Activity tab is selected by default. A spring-animated indicator slides under the active tab.
result: [pending]

### 3. Tab Switching Works
expected: Clicking each tab switches the visible content below. The tab indicator animates smoothly to the selected tab. All three tabs show their respective content areas.
result: [pending]

### 4. Tab Scroll Position Preserved
expected: In the Activity tab, scroll down. Switch to "Brain & Docs" tab. Switch back to "Activity". Your scroll position is exactly where you left it (CSS-hide, not unmount).
result: [pending]

### 5. Tab Selection Persists on Reload
expected: Select "Brain & Docs" tab. Refresh the page. The sidebar reopens with "Brain & Docs" still selected (persisted to localStorage).
result: [pending]

### 6. Activity Tab Empty State
expected: On a project with no autonomy activity, the Activity tab shows a friendly empty state with title "Your team is ready" and a description explaining what the feed will show.
result: [pending]

### 7. Approvals Tab Empty State
expected: The Approvals tab shows a placeholder empty state (e.g., "All clear!") since no approvals hub is built yet (Phase 13).
result: [pending]

### 8. Brain & Docs Tab Content
expected: The Brain & Docs tab shows all existing brain editing functionality — core direction fields, execution rules, team culture. Everything that was in the old right sidebar still works identically.
result: [pending]

### 9. Activity Stats Card
expected: At the top of the Activity tab, a stats card shows 3 compact stat pills: tasks completed, handoffs, and cost spent (showing today's numbers, likely $0.00 for cost if no autonomy ran).
result: [pending]

### 10. Activity Feed Filter Chips
expected: Below the stats card, horizontal filter chips appear: "All" (selected by default), "Tasks", "Handoffs", "Reviews", "Approvals". Clicking a chip highlights it and would filter events (likely empty if no autonomy activity).
result: [pending]

### 11. Agent Working Avatar Animation
expected: In the project tree (left sidebar), agent avatars can show a "working" state with a rotating dashed ring animation when an agent is executing a background task. (Test: visually confirm the CSS animation exists in the codebase — runtime confirmation requires triggering background execution.)
result: [pending]

### 12. Mobile Sidebar Tabs
expected: On a mobile viewport (resize browser to < 1024px width), tap the right sidebar toggle. The sidebar opens as a Sheet drawer. The three tabs (Activity, Brain & Docs, Approvals) appear at the top and work correctly via tap (no swipe gesture needed).
result: [pending]

### 13. Unread Badge on Activity Tab
expected: The Activity tab icon shows an unread count badge when new autonomy events arrive while viewing another tab. The badge clears when switching to the Activity tab.
result: [pending]

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0

## Gaps

[none yet]
