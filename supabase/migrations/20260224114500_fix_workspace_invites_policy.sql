-- Fix workspace_members policies to allow accepting invites and viewing team
-- 1. Allow users to join a workspace if they have an invitation
DROP POLICY IF EXISTS "Users can join workspaces they are invited to" ON public.workspace_members;
CREATE POLICY "Users can join workspaces they are invited to"
ON public.workspace_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.workspace_invites i
    WHERE i.workspace_id = workspace_members.workspace_id
      AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND i.status = 'accepted'
  )
);

-- 2. Allow members/managers to view all members of their workspaces
DROP POLICY IF EXISTS "Members can view their workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members/Managers can view workspace members" ON public.workspace_members;
CREATE POLICY "Members/Managers can view workspace members"
ON public.workspace_members FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_workspace_member(workspace_id)
);

-- 3. Workspace Invites Policies
DROP POLICY IF EXISTS "Invitees can view their invites" ON public.workspace_invites;
CREATE POLICY "Invitees can view their invites"
ON public.workspace_invites FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR (SELECT created_by FROM public.workspaces WHERE id = workspace_id) = auth.uid()
);

DROP POLICY IF EXISTS "Invitees can update their invites" ON public.workspace_invites;
CREATE POLICY "Invitees can update their invites"
ON public.workspace_invites FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 4. Managers can manage workspace members
DROP POLICY IF EXISTS "Managers can manage members" ON public.workspace_members;
CREATE POLICY "Managers can manage members"
ON public.workspace_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);
