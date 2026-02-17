
-- Remove old duplicate policies on workspace_members
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace managers can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace managers can remove members" ON public.workspace_members;

-- Remove old duplicate policies on workspaces
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;

-- Remove old duplicate policies on tasks
DROP POLICY IF EXISTS "Anyone can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Creators and workspace managers can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Creators and workspace managers can update tasks" ON public.tasks;

-- Remove old duplicate policies on workspace_invites
DROP POLICY IF EXISTS "Invitees can update their invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Managers can delete invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Managers can view workspace invites" ON public.workspace_invites;
