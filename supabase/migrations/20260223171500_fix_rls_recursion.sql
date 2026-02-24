-- Fix infinite recursion in RLS policies (error 42P17)
-- The workspace_members SELECT policy was self-referential:
-- tasks -> workspace_members -> workspace_members (infinite loop)
--
-- Solution: use a SECURITY DEFINER function that bypasses RLS
-- to check membership, breaking the recursive cycle.

-- 1. Create a helper function that checks workspace membership
--    It runs as the function owner (bypasses RLS), so it won't
--    trigger the workspace_members policy again.
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$;

-- 2. Fix workspace_members SELECT policy - was recursively querying itself
DROP POLICY IF EXISTS "Members can view their workspace members" ON public.workspace_members;
CREATE POLICY "Members can view their workspace members"
ON public.workspace_members FOR SELECT
USING (
  user_id = auth.uid()
);

-- 3. Rewrite tasks SELECT policy to use the helper function
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks"
ON public.tasks FOR SELECT
USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);

-- 4. Rewrite tasks UPDATE policy too (also referenced workspace_members indirectly)
DROP POLICY IF EXISTS "Users can update own tasks or managers can update workspace tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks or managers can update workspace tasks"
ON public.tasks FOR UPDATE
USING (
  created_by = auth.uid()
  OR (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.created_by = auth.uid()
  ))
);

-- 5. Rewrite tasks DELETE policy
DROP POLICY IF EXISTS "Users can delete own tasks or managers can delete workspace tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks or managers can delete workspace tasks"
ON public.tasks FOR DELETE
USING (
  created_by = auth.uid()
  OR (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.created_by = auth.uid()
  ))
);
