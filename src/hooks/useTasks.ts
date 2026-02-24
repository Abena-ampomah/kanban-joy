import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_id: string | null;
  assignee_id: string | null;
  workspace_id: string | null;
  due_date: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  priority?: { id: string; name: string; color: string } | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority_id?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  workspace_id?: string | null;
  is_archived?: boolean;
}

export interface Priority {
  id: string;
  name: string;
  color: string;
}

function fireConfetti() {
  const count = 200;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
  confetti({ ...defaults, particleCount: count * 0.25, spread: 26, startVelocity: 55 });
  confetti({ ...defaults, particleCount: count * 0.2, spread: 60 });
  confetti({ ...defaults, particleCount: count * 0.35, spread: 100, decay: 0.91, scalar: 0.8 });
  confetti({ ...defaults, particleCount: count * 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  confetti({ ...defaults, particleCount: count * 0.1, spread: 120, startVelocity: 45 });
}

export interface Profile {
  id: string;
  display_name: string;
}

export function useTasks(workspaceId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tasksQuery = useQuery({
    queryKey: ["tasks", { archived: false, workspaceId }],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          id, title, description, status, priority_id, assignee_id, workspace_id, due_date, 
          is_archived, archived_at, created_by, created_at, updated_at,
          priority:task_priorities(id, name, color)
        `)
        .eq("is_archived", false);

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      } else {
        query = query.is("workspace_id", null);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!user,
  });

  const archivedTasksQuery = useQuery({
    queryKey: ["tasks", { archived: true, workspaceId }],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          id, title, description, status, priority_id, assignee_id, workspace_id, due_date, 
          is_archived, archived_at, created_by, created_at, updated_at,
          priority:task_priorities(id, name, color)
        `)
        .eq("is_archived", true);

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      } else {
        query = query.is("workspace_id", null);
      }

      const { data, error } = await query
        .order("archived_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!user,
  });

  const prioritiesQuery = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_priorities").select("*");
      if (error) throw error;
      return data as Priority[];
    },
    enabled: !!user,
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return (data || []) as Profile[];
    },
    enabled: !!user,
  });
  const createTask = useMutation({
    mutationFn: async (task: { title: string; description?: string; status?: string; priority_id?: string; assignee_id?: string; due_date?: string }) => {
      const { error } = await supabase.from("tasks").insert({
        ...task,
        workspace_id: workspaceId || null,
        created_by: user!.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task created!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; status?: string; priority_id?: string | null; assignee_id?: string | null; due_date?: string | null; workspace_id?: string | null; is_archived?: boolean }) => {
      const actualUpdates: Record<string, unknown> = { ...updates };
      if (updates.is_archived === true) {
        actualUpdates.archived_at = new Date().toISOString();
      } else if (updates.is_archived === false) {
        actualUpdates.archived_at = null;
      }

      const { error } = await supabase.from("tasks").update(actualUpdates).eq("id", id);
      if (error) throw error;
      if (updates.status === "completed") fireConfetti();
    },
    onMutate: async (newUpdate) => {
      // Cancel refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["tasks", { archived: false, workspaceId }]);

      // Optimistically update to the new value
      queryClient.setQueryData(["tasks", { archived: false, workspaceId }], (old: Task[] | undefined) => {
        if (!old) return [];
        return old.map((t) => (t.id === newUpdate.id ? { ...t, ...newUpdate } : t)) as Task[];
      });

      return { previousTasks };
    },
    onError: (err, newUpdate, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["tasks", { archived: false, workspaceId }], context?.previousTasks);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task permanently deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const archiveTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task archived", description: "This task will be permanently deleted in 6 months." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const restoreTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_archived: false, archived_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task restored" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    tasks: tasksQuery.data ?? [],
    archivedTasks: archivedTasksQuery.data ?? [],
    priorities: prioritiesQuery.data ?? [],
    profiles: profilesQuery.data ?? [],
    isLoading: tasksQuery.isLoading || archivedTasksQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
  };
}

