-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON public.tasks(priority_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_task_id ON public.notes(task_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON public.workspace_invites(workspace_id);
