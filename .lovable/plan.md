

# Implementation Plan: Due Dates, Workspaces, and Manager Permissions

## Overview

Three features to add:
1. Due dates on task cards
2. Workspace creation and email invites (manager creates, individuals accept)
3. Managers can edit/move tasks of workspace members

---

## 1. Due Date on Task Cards

**Database change:** Add a `due_date` column (type `date`, nullable) to the `tasks` table.

**UI changes:**
- **TaskCard.tsx**: Display due date below the creation date. Show overdue indicator (red text) if past due and not completed.
- **AddTaskDialog.tsx**: Add a date picker field for selecting a due date when creating/editing tasks.
- **useTasks.ts**: Include `due_date` in the Task interface and in create/update mutations.

---

## 2. Workspaces with Email Invites

**Database tables to create:**

- **`workspaces`** table:
  - `id` (uuid, primary key)
  - `name` (text)
  - `created_by` (uuid, references auth.users)
  - `created_at` (timestamptz)

- **`workspace_members`** table:
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `user_id` (uuid, references auth.users)
  - `role` (text: "manager" or "member")
  - `joined_at` (timestamptz)

- **`workspace_invites`** table:
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, references workspaces)
  - `email` (text)
  - `invited_by` (uuid, references auth.users)
  - `status` (text: "pending", "accepted", "declined")
  - `created_at` (timestamptz)

- **`tasks` table update**: Add `workspace_id` (uuid, nullable, references workspaces) so tasks belong to a workspace.

**RLS Policies:**
- Workspace creators (managers) can manage their workspaces
- Workspace members can view their workspaces
- Only managers can create invites
- Users can view/accept invites sent to their email
- Tasks scoped to workspace: members can view tasks in their workspace; managers can edit all workspace tasks

**UI components:**
- **WorkspaceManager.tsx**: New component for managers to create a workspace and invite members by email. Shows current members and pending invites.
- **WorkspaceInvites.tsx**: Component for individuals to view and accept/decline pending invites.
- **AppSidebar.tsx**: Add workspace name display and navigation to workspace settings (for managers) or invite list (for individuals).
- **Auth flow update**: After login, if user has no workspace, show prompt to create (manager) or check for invites (individual).

**Hooks:**
- **useWorkspace.ts**: Fetch current workspace, members, invites. Mutations for create workspace, send invite, accept/decline invite.

---

## 3. Manager Permissions for Workspace Tasks

**Database RLS updates:**
- Update tasks RLS policies so managers in a workspace can update/delete any task within that workspace.
- Members can only edit their own tasks (already the case for non-managers).
- A database function `is_workspace_manager(workspace_id, user_id)` will check if a user is a manager in a given workspace.

**UI behavior:**
- Task cards will show edit/delete options to workspace managers for all tasks in the workspace.
- No UI changes needed beyond what workspace scoping provides -- existing edit/delete buttons will work based on permissions.

---

## Technical Details

### Database Migration (single migration)

```sql
-- Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace invites
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Add workspace_id and due_date to tasks
ALTER TABLE public.tasks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN due_date date;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_workspace_manager(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = 'manager'
  )
$$;

-- RLS policies for workspaces, members, invites
-- (managers see their workspaces, members see joined workspaces, etc.)

-- Updated tasks RLS: workspace managers can edit workspace tasks
```

### New Files
- `src/hooks/useWorkspace.ts` -- workspace CRUD, invite management
- `src/components/WorkspaceManager.tsx` -- manager UI for workspace + invites
- `src/components/WorkspaceInvites.tsx` -- individual UI for accepting invites

### Modified Files
- `src/hooks/useTasks.ts` -- add `due_date` and `workspace_id` to Task interface, filter tasks by workspace
- `src/components/TaskCard.tsx` -- display due date with overdue styling
- `src/components/AddTaskDialog.tsx` -- add date picker for due date
- `src/components/KanbanBoard.tsx` -- filter tasks by active workspace
- `src/components/AppSidebar.tsx` -- show workspace info, settings link, invite notifications
- `src/pages/Index.tsx` -- add workspace context/tab for workspace management
- `src/contexts/AuthContext.tsx` -- include active workspace in context

