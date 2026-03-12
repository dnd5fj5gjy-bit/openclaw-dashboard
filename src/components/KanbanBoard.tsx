import { useAgentData } from '../hooks/useAgentData'

interface TaskCardProps {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  agent: string
  description?: string
  selected?: boolean
  onSelect: (id: string) => void
}

function TaskCard({ id, title, status, agent, description, selected, onSelect }: TaskCardProps) {
  const statusIcons = {
    'todo': '📝',
    'in-progress': '🔄',
    'review': '🔍',
    'done': '✅'
  }

  return (
    <div
      onClick={() => onSelect(id)}
      className={`bg-surface rounded-lg p-4 cursor-pointer mb-3 transition-all duration-200 hover:bg-surface-light hover:scale-[1.02] ${selected ? 'ring-2 ring-secondary' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm">{statusIcons[status]}</span>
        <div className="flex-1">
          <h3 className="font-semibold mb-1 text-sm">{title}</h3>
          {description && (
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-mono bg-surface-light px-2 py-1 rounded">
              {agent}
            </span>
            <span className={`inline-block w-2 h-2 rounded-full ${
              status === 'todo' ? 'bg-blue-500' :
              status === 'in-progress' ? 'bg-yellow-500 animate-pulse' :
              status === 'review' ? 'bg-purple-500' : 'bg-green-500'
            }`} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  selectedTask: string | null
  onTaskSelect: (id: string) => void
}

function KanbanBoard({ selectedTask, onTaskSelect }: KanbanBoardProps) {
  const { tasks, loading } = useAgentData()

  const columns = [
    { status: 'todo', title: 'To Do', color: 'border-t-2 border-blue-500' },
    { status: 'in-progress', title: 'In Progress', color: 'border-t-2 border-yellow-500' },
    { status: 'review', title: 'Review', color: 'border-t-2 border-purple-500' },
    { status: 'done', title: 'Done', color: 'border-t-2 border-green-500' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.status} className={`bg-surface rounded-lg p-4 ${column.color}`}>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-surface-light rounded w-1/2"></div>
              <div className="h-16 bg-surface-light rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnTasks = tasks.filter(task => task.status === column.status)
        
        return (
          <div key={column.status} className={`bg-surface rounded-lg p-4 ${column.color}`}>
            <h2 className="font-bold mb-3 flex items-center justify-between text-sm">
              <span>{column.title}</span>
              <span className="bg-surface-light text-xs px-2 py-1 rounded-full">
                {columnTasks.length}
              </span>
            </h2>
            
            {columnTasks.map(task => (
              <TaskCard
                key={task.id}
                {...task}
                selected={selectedTask === task.id}
                onSelect={onTaskSelect}
              />
            ))}
            
            {columnTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-xs">
                No tasks in {column.title.toLowerCase()}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default KanbanBoard
