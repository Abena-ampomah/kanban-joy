import { useState } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useTasks, Task } from "@/hooks/useTasks";
import KanbanColumn from "./KanbanColumn";
import AddTaskDialog from "./AddTaskDialog";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { id: "todo", title: "To-Do", colorClass: "bg-kanban-todo/15 text-kanban-todo", bgClass: "bg-[hsl(var(--kanban-todo-bg))]" },
  { id: "in_progress", title: "In Progress", colorClass: "bg-kanban-progress/15 text-kanban-progress", bgClass: "bg-[hsl(var(--kanban-progress-bg))]" },
  { id: "completed", title: "Completed", colorClass: "bg-kanban-completed/15 text-kanban-completed", bgClass: "bg-[hsl(var(--kanban-completed-bg))]" },
];

export default function KanbanBoard() {
  const { tasks, priorities, profiles, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("todo");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    if (destination.droppableId !== result.source.droppableId) {
      updateTask.mutate({ id: draggableId, status: destination.droppableId });
    }
  };

  const handleAddTask = (status: string) => {
    setEditingTask(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-foreground">Kanban Dashboard</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={() => handleAddTask("todo")} className="gap-2">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">Loading tasks...</div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  tasks={filteredTasks.filter((t) => t.status === col.id)}
                  colorClass={col.colorClass}
                  bgClass={col.bgClass}
                  onAddTask={handleAddTask}
                  onUpdateTask={(id, updates) => updateTask.mutate({ id, ...updates })}
                  onDeleteTask={(id) => deleteTask.mutate(id)}
                  onEditTask={handleEditTask}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <AddTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(t) => createTask.mutate(t)}
        onUpdate={(id, updates) => updateTask.mutate({ id, ...updates })}
        priorities={priorities}
        profiles={profiles}
        defaultStatus={defaultStatus}
        editingTask={editingTask}
      />
    </div>
  );
}
