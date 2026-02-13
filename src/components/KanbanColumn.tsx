import { Droppable } from "@hello-pangea/dnd";
import { Task } from "@/hooks/useTasks";
import TaskCard from "./TaskCard";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  colorClass: string;
  bgClass: string;
  onAddTask: (status: string) => void;
  onUpdateTask: (id: string, updates: any) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
}

export default function KanbanColumn({ id, title, tasks, colorClass, bgClass, onAddTask, onUpdateTask, onDeleteTask, onEditTask }: KanbanColumnProps) {
  return (
    <div className={`flex flex-col min-w-[320px] w-[320px] rounded-2xl p-3 ${bgClass}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
            {tasks.length}
          </span>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
        </div>
        <button
          onClick={() => onAddTask(id)}
          className="p-1 rounded-md hover:bg-white/50 transition-colors"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-3 p-2 rounded-xl transition-colors min-h-[200px] ${
              snapshot.isDraggingOver ? "bg-white/40" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                onEdit={onEditTask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
