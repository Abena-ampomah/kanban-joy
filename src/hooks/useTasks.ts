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
  created_by: string;
  created_at: string;
  updated_at: string;
  priority?: { id: string; name: string; color: string } | null;
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

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, priority:task_priorities(*)")
        .order("created_at", { ascending: false });
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
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (task: { title: string; description?: string; status?: string; priority_id?: string; assignee_id?: string }) => {
      const { error } = await supabase.from("tasks").insert({ ...task, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; status?: string; priority_id?: string | null; assignee_id?: string | null }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
      if (updates.status === "completed") fireConfetti();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    tasks: tasksQuery.data ?? [],
    priorities: prioritiesQuery.data ?? [],
    profiles: profilesQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
}
