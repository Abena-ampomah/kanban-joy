import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Priority } from "@/hooks/useTasks";
import { Task } from "@/hooks/useTasks";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: { title: string; description?: string; status?: string; priority_id?: string; assignee_id?: string; due_date?: string }) => void;
  onUpdate?: (id: string, updates: any) => void;
  priorities: Priority[];
  profiles: { id: string; display_name: string }[];
  defaultStatus?: string;
  editingTask?: Task | null;
}

export default function AddTaskDialog({ open, onOpenChange, onSubmit, onUpdate, priorities, profiles, defaultStatus, editingTask }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(defaultStatus || "todo");
  const [priorityId, setPriorityId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setStatus(editingTask.status);
      setPriorityId(editingTask.priority_id || "");
      setAssigneeId(editingTask.assignee_id || "");
      setDueDate(editingTask.due_date ? new Date(editingTask.due_date + "T00:00:00") : undefined);
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "todo");
      setPriorityId("");
      setAssigneeId("");
      setDueDate(undefined);
    }
  }, [editingTask, defaultStatus, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dueDateStr = dueDate ? format(dueDate, "yyyy-MM-dd") : null;
    if (editingTask && onUpdate) {
      onUpdate(editingTask.id, {
        title, description, status,
        priority_id: priorityId || null,
        assignee_id: assigneeId || null,
        due_date: dueDateStr,
      });
    } else {
      onSubmit({
        title, description, status,
        priority_id: priorityId || undefined,
        assignee_id: assigneeId || undefined,
        due_date: dueDateStr || undefined,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." className="mt-1" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full mt-1 justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button type="submit" className="w-full">{editingTask ? "Update Task" : "Create Task"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
