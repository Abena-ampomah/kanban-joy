-- Fix workspace invite acceptance and global archive visibility

-- 1. Allow users to see workspaces they are invited to
DROP POLICY IF EXISTS "Members can view joined workspaces" ON public.workspaces;
CREATE POLICY "Members can view joined workspaces"
ON public.workspaces FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_workspace_member(id)
  OR id IN (SELECT workspace_id FROM public.workspace_invites WHERE email = (auth.jwt() ->> 'email'))
);

-- 2. Ensure users can update their own invites
DROP POLICY IF EXISTS "Users can update their invites" ON public.workspace_invites;
CREATE POLICY "Users can update their invites"
ON public.workspace_invites FOR UPDATE
USING (
  email = (auth.jwt() ->> 'email')
);

-- 3. Allow users to join a workspace if they have an 'accepted' invite
--    We need to keep the manager policy and add a user joining policy
DROP POLICY IF EXISTS "Managers can add members" ON public.workspace_members;
CREATE POLICY "Managers can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  public.is_workspace_manager(workspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND created_by = auth.uid())
);

CREATE POLICY "Users can join via accepted invite"
ON public.workspace_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.workspace_invites
    WHERE workspace_id = workspace_members.workspace_id
    AND email = (auth.jwt() ->> 'email')
    AND status = 'accepted'
  )
);
