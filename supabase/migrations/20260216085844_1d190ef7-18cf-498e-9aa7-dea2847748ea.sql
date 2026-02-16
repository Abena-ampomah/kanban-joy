
-- Workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members table
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace invites table
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

-- Helper function: check if user is workspace manager
CREATE OR REPLACE FUNCTION public.is_workspace_manager(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = 'manager'
  )
$$;

-- RLS: Workspaces
CREATE POLICY "Members can view their workspaces"
ON public.workspaces FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = id AND user_id = auth.uid())
);

CREATE POLICY "Managers can create workspaces"
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Workspace managers can update workspace"
ON public.workspaces FOR UPDATE TO authenticated
USING (is_workspace_manager(id, auth.uid()));

CREATE POLICY "Workspace managers can delete workspace"
ON public.workspaces FOR DELETE TO authenticated
USING (is_workspace_manager(id, auth.uid()));

-- RLS: Workspace members
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY "Workspace managers can add members"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (is_workspace_manager(workspace_id, auth.uid()) OR (user_id = auth.uid() AND role = 'manager'));

CREATE POLICY "Workspace managers can remove members"
ON public.workspace_members FOR DELETE TO authenticated
USING (is_workspace_manager(workspace_id, auth.uid()));

-- RLS: Workspace invites
CREATE POLICY "Managers can view workspace invites"
ON public.workspace_invites FOR SELECT TO authenticated
USING (
  is_workspace_manager(workspace_id, auth.uid())
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Managers can create invites"
ON public.workspace_invites FOR INSERT TO authenticated
WITH CHECK (is_workspace_manager(workspace_id, auth.uid()));

CREATE POLICY "Invitees can update their invites"
ON public.workspace_invites FOR UPDATE TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Managers can delete invites"
ON public.workspace_invites FOR DELETE TO authenticated
USING (is_workspace_manager(workspace_id, auth.uid()));

-- Update tasks RLS: drop old update/delete policies and recreate with workspace manager support
DROP POLICY IF EXISTS "Creators and managers can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Creators and managers can delete tasks" ON public.tasks;

CREATE POLICY "Creators and workspace managers can update tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR has_role(auth.uid(), 'manager'::app_role)
  OR (workspace_id IS NOT NULL AND is_workspace_manager(workspace_id, auth.uid()))
);

CREATE POLICY "Creators and workspace managers can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'manager'::app_role)
  OR (workspace_id IS NOT NULL AND is_workspace_manager(workspace_id, auth.uid()))
);

-- Update tasks SELECT to scope by workspace membership
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks"
ON public.tasks FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR workspace_id IS NULL
  OR EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
);
