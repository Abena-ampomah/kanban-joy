import { Draggable } from "@hello-pangea/dnd";
import { Task, TaskUpdate } from "@/hooks/useTasks";
import { MoreHorizontal, Edit2, CalendarDays, AlertCircle, Archive } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskCardProps {
  task: Task;
  index: number;
  onUpdate: (id: string, updates: TaskUpdate) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function TaskCard({ task, index, onUpdate, onDelete, onEdit }: TaskCardProps) {
  const priorityColor = task.priority?.color || "#94a3b8";
  const priorityName = task.priority?.name || "None";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-card rounded-lg p-4 task-card-hover kanban-shadow border border-border/60 ${snapshot.isDragging ? "shadow-xl ring-2 ring-primary/30 rotate-2" : ""
            }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span
              className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold priority-badge"
              ref={(el) => {
                if (el) el.style.setProperty("--priority-color", priorityColor);
              }}
            >
              {priorityName}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-muted transition-colors"
                  aria-label="Task options"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                  <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h4 className="font-semibold text-sm text-card-foreground mb-1 leading-snug">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
          )}

          <div className="mt-3">
            <Select value={task.status} onValueChange={(val) => onUpdate(task.id, { status: val })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {task.due_date && (() => {
            const dueDate = new Date(task.due_date + "T00:00:00");
            const overdue = isPast(dueDate) && !isToday(dueDate) && task.status !== "completed";
            return (
              <div className={`flex items-center gap-1 mt-2 text-[11px] ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {overdue ? <AlertCircle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
                <span>{overdue ? "Overdue: " : "Due: "}{format(dueDate, "MMM d, yyyy")}</span>
              </div>
            );
          })()}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              {task.assignee ? (
                <div
                  className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
                  title={`Assigned to ${task.assignee.display_name}`}
                >
                  {task.assignee.display_name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  ?
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
