-- Final RLS and DB fixes for workspace collaboration

-- 1. Use auth.email() for better reliability in invite visibility
DROP POLICY IF EXISTS "Users can view workspace invites" ON public.workspace_invites;
CREATE POLICY "Users can view workspace invites"
ON public.workspace_invites FOR SELECT
USING (
  email = auth.email()
  OR invited_by = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);

DROP POLICY IF EXISTS "Users can update their invites" ON public.workspace_invites;
CREATE POLICY "Users can update their invites"
ON public.workspace_invites FOR UPDATE
USING (
  email = auth.email()
);

-- 2. Allow users to see workspaces they are invited to
DROP POLICY IF EXISTS "Members can view joined workspaces" ON public.workspaces;
CREATE POLICY "Members can view joined workspaces"
ON public.workspaces FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_workspace_member(id)
  OR id IN (SELECT workspace_id FROM public.workspace_invites WHERE email = auth.email())
);

-- 3. Correct joining policy
DROP POLICY IF EXISTS "Users can join via accepted invite" ON public.workspace_members;
CREATE POLICY "Users can join via accepted invite"
ON public.workspace_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.workspace_invites
    WHERE workspace_id = workspace_members.workspace_id
    AND email = auth.email()
    AND status = 'accepted'
  )
);

-- 4. Fix tasks UPDATE/DELETE policies to be more permissive for team collaboration
-- Members can update any task in the workspace
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks or managers can update workspace tasks" ON public.tasks;
CREATE POLICY "Users can update tasks"
ON public.tasks FOR UPDATE
USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);

-- Managers or creators can delete tasks
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks or managers can delete workspace tasks" ON public.tasks;
CREATE POLICY "Users can delete tasks"
ON public.tasks FOR DELETE
USING (
  created_by = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_manager(workspace_id, auth.uid()))
);
