DROP POLICY IF EXISTS "Users can update own tasks or managers can update workspace tasks" ON public.tasks;
CREATE POLICY "Users can update tasks"
ON public.tasks FOR UPDATE
USING (
  created_by = auth.uid()
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);
