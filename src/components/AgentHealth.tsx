import { useAgentData } from '../hooks/useAgentData'

function AgentHealth() {
  const { agents, connected, loading } = useAgentData()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green'
      case 'stalled': return 'yellow'
      case 'alert': return 'red'
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE'
      case 'stalled': return 'STALLED'
      case 'alert': return 'ALERT'
      default: return 'UNKNOWN'
    }
  }

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'never'
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  if (loading) {
    return (
      <div className="bg-surface-light rounded-lg p-6 mb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-surface rounded"></div>
            <div className="h-24 bg-surface rounded"></div>
            <div className="h-24 bg-surface rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-light rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🏥 Agent Health Monitor</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className={`flex items-center ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <span className="w-2 h-2 rounded-full mr-1.5 bg-current animate-pulse"></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="flex items-center">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5"></span> Active
        </span>
        <span className="flex items-center">
          <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full mr-1.5 animate-pulse"></span> Stalled
        </span>
        <span className="flex items-center">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span> Alert
        </span>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 text-sm">
            No agents found. Make sure the OpenClaw gateway is running.
          </div>
        ) : (
          agents.map((agent) => {
            const color = getStatusColor(agent.status)
            
            return (
              <div key={agent.agent_name} className="bg-surface rounded-lg p-4 hover:bg-surface-light transition-colors">
                <div className="flex items-center mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 ${
                    color === 'green' ? 'bg-green-500 animate-pulse' :
                    color === 'yellow' ? 'bg-yellow-500' : 
                    'bg-red-500 animate-pulse'
                  }`}></span>
                  <h3 className="font-semibold flex-1 text-sm">{agent.agent_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded bg-${color}-900 text-${color}-300`}>
                    {getStatusLabel(agent.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Last active:</span>
                    <p className="font-mono text-gray-300">{formatTimeAgo(agent.last_message_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tasks:</span>
                    <p className="font-mono text-secondary">{agent.task_count}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Activity summary */}
      {agents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-surface">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total agents:</span>
            <span className="font-mono">{agents.length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Active:</span>
            <span className="font-mono text-green-400">{agents.filter(a => a.status === 'active').length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Needs attention:</span>
            <span className="font-mono text-yellow-400">{agents.filter(a => a.status === 'stalled').length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Alerts:</span>
            <span className="font-mono text-red-400">{agents.filter(a => a.status === 'alert').length}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentHealth
