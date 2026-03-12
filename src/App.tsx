import { useState } from 'react'
import KanbanBoard from './components/KanbanBoard'
import AgentHealth from './components/AgentHealth'
import TaskDetails from './components/TaskDetails'
import WorkspaceViewer from './components/WorkspaceViewer'

function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'details' | 'workspace'>('kanban')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-surface-light p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-secondary">
            🦆 OpenClaw Multi-Agent Dashboard
          </h1>
          <nav className="flex space-x-3">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                activeTab === 'kanban' 
                  ? 'bg-surface text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-surface-light'
              }`}
            >
              📋 Kanban Board
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                activeTab === 'details' 
                  ? 'bg-surface text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-surface-light'
              }`}
            >
              📊 Task Details
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                activeTab === 'workspace' 
                  ? 'bg-surface text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-surface-light'
              }`}
            >
              📁 Workspace Files
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {activeTab === 'kanban' && (
          <>
            <AgentHealth />
            <KanbanBoard 
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
            />
          </>
        )}

        {activeTab === 'details' && (
          <TaskDetails selectedTask={selectedTask} />
        )}

        {activeTab === 'workspace' && (
          <WorkspaceViewer />
        )}
      </main>
    </div>
  )
}

export default App
