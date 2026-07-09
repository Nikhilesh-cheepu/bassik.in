# Team Tasks & Checklists Guide

## Overview

The Tasks tab in the team management system provides two key features:

1. **Personal Todo List** - For noting down quick tasks and reminders
2. **Daily Checklists** - For recurring daily tasks managed by team managers

## For Team Members

### Personal Todos

**Creating a Todo:**
1. Go to the "Tasks" tab
2. Click "+ Add todo"
3. Enter a title (required) and optional description
4. Click "Add"

**Managing Todos:**
- Check the box next to a todo to mark it as done
- Click "Delete" to remove a todo
- Use the filter buttons (All, To do, Done) to view different todo lists

**Use Cases:**
- Quick reminders: "Call client about meeting"
- Follow-ups: "Review feedback from yesterday's post"
- Shopping lists: "Buy stock items for shoot"
- Notes to self: "Check analytics report tomorrow"

### Daily Checklists

Daily checklists are created by managers and contain recurring tasks that need to be completed each day or on specific days of the week.

**Checking off items:**
1. Go to the "Tasks" tab
2. Scroll to the "Daily Checklists" section
3. Check off items as you complete them
4. Items reset every day so you can check them off again

**Example Checklists:**

**For Amit (SEO + Social Media):**
- Client 1 Social Media
  - Mon flyer - post (appears only on Monday)
  - Tue flyer - post (appears only on Tuesday)
  - Check engagement metrics (appears every day)
  - Respond to comments (appears every day)

**For Designers (Jeslyn, Mahesh):**
- Client 1 Design Tasks
  - Mon flyer - create
  - Tue flyer - create
  - Review daily brief (appears every day)

## For Managers (Admin)

### Creating Daily Checklists

**Step 1: Create a Checklist**
1. Go to the "Tasks" tab
2. Click "+ Create checklist"
3. Select the team member this checklist is for
4. Enter a title (e.g., "Client 1", "Social Media Tasks")
5. Optionally add a description

**Step 2: Add Items**
1. In the checklist form, add items one by one
2. For each item:
   - Enter the task title (e.g., "Mon flyer - post")
   - Select when it should appear:
     - **Every day** - Item appears in the checklist every day
     - **Specific day** - Item only appears on that day of the week (Mon, Tue, Wed, etc.)
3. Click "+ Add item" to add more items
4. Click "Create" when done

**Viewing Checklists:**
- Use the "View checklists for" dropdown to see checklists for different team members
- You can see your own checklists or any team member's checklists

**Managing Checklists:**
- Click "Delete" on a checklist to remove it completely
- To edit items, delete the checklist and recreate it (editing coming soon)

### Example Setup for Different Roles

**Social Media Manager (Amit):**
```
Checklist 1: Client 1 - Social Posts
- Mon flyer - post (Monday only)
- Tue flyer - post (Tuesday only)
- Wed flyer - post (Wednesday only)
- Thu flyer - post (Thursday only)
- Fri flyer - post (Friday only)
- Check engagement (Every day)
- Respond to comments (Every day)

Checklist 2: Client 2 - Social Posts
- [Similar structure for Client 2]
```

**Designer (Jeslyn):**
```
Checklist 1: Client 1 - Design Tasks
- Mon flyer design (Monday only)
- Tue flyer design (Tuesday only)
- Wed flyer design (Wednesday only)
- Check brief (Every day)
- Review feedback (Every day)

Checklist 2: Client 2 - Design Tasks
- [Similar structure for Client 2]
```

**Content Creator (Srinath):**
```
Checklist 1: Shoot Preparation
- Check equipment (Every day)
- Review shoot schedule (Every day)
- Upload raw files (Every day)
- Edit videos (Every day)
```

## Tips & Best Practices

### For Team Members
1. **Check your checklists every morning** to see what needs to be done today
2. **Use todos for ad-hoc tasks** that aren't part of your regular checklist
3. **Mark items as done throughout the day** to track your progress
4. **Completed items reset daily** so you can check them off again tomorrow

### For Managers
1. **Create separate checklists for each client** to keep things organized
2. **Use day-specific items for recurring weekly tasks** (e.g., "Mon flyer - post")
3. **Use "Every day" items for daily tasks** (e.g., "Check engagement")
4. **Keep item titles short and actionable** (e.g., "Post flyer" instead of "Remember to post the flyer")
5. **Review and update checklists weekly** to ensure they're still relevant

## Technical Details

### Data Model
- **Todos** are personal to each team member
- **Checklists** are assigned to specific team members by managers
- **Checklist items** can be set to appear on specific days or every day
- **Completions** are tracked per day, so items reset daily

### Permissions
- All team members can create and manage their own todos
- Only admins can create and manage daily checklists
- Team members can only check off items in their own checklists
- Admins can view checklists for all team members

### Day of Week Filtering
The system automatically shows only the relevant checklist items for today:
- If today is Monday, only Monday-specific items and "Every day" items are shown
- If an item is marked for Tuesday, it won't appear on Monday

### Time Zone
All daily resets happen based on the Asia/Kolkata (IST) time zone.

## Future Enhancements

Potential features for future versions:
- Edit existing checklists and items
- Reorder checklist items
- Add notes to checklist items
- View completion history
- Export checklist reports
- Set reminders for uncompleted items
- Copy checklists between team members
- Templates for common checklists
