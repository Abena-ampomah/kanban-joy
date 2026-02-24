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
  assignee?: { id: string; display_name: string } | null;
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

export function useTasks(workspaceId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tasksQuery = useQuery({
    queryKey: ["tasks", { archived: false, workspaceId }],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, priority:task_priorities(*), assignee:profiles(id, display_name)")
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
      return (data ?? []) as unknown as Task[];
    },
    enabled: !!user,
  });

  const archivedTasksQuery = useQuery({
    queryKey: ["tasks", { archived: true, workspaceId }],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, priority:task_priorities(*), assignee:profiles(id, display_name)")
        .eq("is_archived", true);

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      } else {
        query = query.is("workspace_id", null);
      }

      const { data, error } = await query
        .order("archived_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Task[];
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
    queryKey: ["profiles", { workspaceId }],
    queryFn: async () => {
      if (workspaceId) {
        const { data, error } = await supabase
          .from("workspace_members")
          .select("profiles(id, display_name)")
          .eq("workspace_id", workspaceId);
        if (error) throw error;
        return (data as unknown as { profiles: { id: string; display_name: string } | null }[])
          .map(m => m.profiles)
          .filter(Boolean);
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name")
          .eq("id", user!.id);
        if (error) throw error;
        return data;
      }
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (task: { title: string; description?: string; status?: string; priority_id?: string; assignee_id?: string; due_date?: string; workspace_id?: string }) => {
      const payload = {
        ...task,
        created_by: user!.id,
        workspace_id: task.workspace_id || workspaceId || null
      };
      const { error } = await supabase.from("tasks").insert(payload);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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

