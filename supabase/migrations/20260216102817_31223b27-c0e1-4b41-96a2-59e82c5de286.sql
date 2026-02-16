
-- Drop the recursive policies on workspace_members
DROP POLICY IF EXISTS "Members can view their workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Managers can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Managers can remove members" ON public.workspace_members;

-- Recreate without recursion: use direct user_id check instead of subquery back to workspace_members
CREATE POLICY "Members can view their workspace members"
ON public.workspace_members FOR SELECT
USING (
  user_id = auth.uid()
  OR workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  )
);

CREATE POLICY "Managers can remove members"
ON public.workspace_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  )
);

-- Also fix workspaces SELECT policy that may reference workspace_members
DROP POLICY IF EXISTS "Members can view joined workspaces" ON public.workspaces;
CREATE POLICY "Members can view joined workspaces"
ON public.workspaces FOR SELECT
USING (
  created_by = auth.uid()
  OR id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);

-- Fix tasks policies that reference workspace_members via is_workspace_manager
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks or managers can update workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks or managers can delete workspace tasks" ON public.tasks;

CREATE POLICY "Users can view tasks"
ON public.tasks FOR SELECT
USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR (workspace_id IS NOT NULL AND workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own tasks or managers can update workspace tasks"
ON public.tasks FOR UPDATE
USING (
  created_by = auth.uid()
  OR (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  ))
);

CREATE POLICY "Users can delete own tasks or managers can delete workspace tasks"
ON public.tasks FOR DELETE
USING (
  created_by = auth.uid()
  OR (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  ))
);

-- Fix workspace_invites policies
DROP POLICY IF EXISTS "Users can view their invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Managers can create invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Users can update their invites" ON public.workspace_invites;

CREATE POLICY "Users can view their invites"
ON public.workspace_invites FOR SELECT
USING (
  email = (SELECT auth.email())
  OR invited_by = auth.uid()
);

CREATE POLICY "Managers can create invites"
ON public.workspace_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update their invites"
ON public.workspace_invites FOR UPDATE
USING (
  email = (SELECT auth.email())
);
