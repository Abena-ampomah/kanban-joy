-- Final fix for workspace RLS recursion and visibility
-- Using SECURITY DEFINER functions to break recursion and allow member visibility

-- 1. Ensure helper functions are robust
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_manager(ws_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = u_id
      AND role = 'manager'
  );
$$;

-- 2. Fix workspace_members SELECT policy
DROP POLICY IF EXISTS "Members can view their workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT
USING (
  public.is_workspace_member(workspace_id)
);

-- 3. Fix workspaces SELECT policy
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view joined workspaces" ON public.workspaces;
CREATE POLICY "Members can view joined workspaces"
ON public.workspaces FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_workspace_member(id)
);

-- 4. Ensure tasks SELECT policy uses the helper function
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks"
ON public.tasks FOR SELECT
USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);

-- 5. Fix workspace_invites SELECT policy
DROP POLICY IF EXISTS "Users can view their invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Managers can view workspace invites" ON public.workspace_invites;
CREATE POLICY "Users can view workspace invites"
ON public.workspace_invites FOR SELECT
USING (
  email = (auth.jwt() ->> 'email')
  OR invited_by = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);

-- 6. Fix workspace_members INSERT/DELETE policies
DROP POLICY IF EXISTS "Managers can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace managers can add members" ON public.workspace_members;
CREATE POLICY "Managers can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  public.is_workspace_manager(workspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "Managers can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace managers can remove members" ON public.workspace_members;
CREATE POLICY "Managers can remove members"
ON public.workspace_members FOR DELETE
USING (
  public.is_workspace_manager(workspace_id, auth.uid())
  OR user_id = auth.uid()
);

-- 7. Fix workspace_invites INSERT/DELETE policies
DROP POLICY IF EXISTS "Managers can create invites" ON public.workspace_invites;
CREATE POLICY "Managers can create invites"
ON public.workspace_invites FOR INSERT
WITH CHECK (
  public.is_workspace_manager(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete invites" ON public.workspace_invites;
CREATE POLICY "Managers can delete invites"
ON public.workspace_invites FOR DELETE
USING (
  public.is_workspace_manager(workspace_id, auth.uid())
);
