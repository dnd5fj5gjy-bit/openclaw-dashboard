import { useState } from 'react'

interface TimelineEvent {
  time: string
  action: string
  agent: string
  details?: string
}

interface TaskDetailsProps {
  selectedTask: string | null
}

function TaskDetails({ selectedTask }: TaskDetailsProps) {
  if (!selectedTask) {
    return (
      <div className="text-center py-20 text-gray-400">
        Select a task from the kanban board to view details
      </div>
    )
  }

  // Mock timeline data
  const timeline: TimelineEvent[] = [
    { time: '10:30 AM', action: 'Task created', agent: 'Nexus', details: 'Initial task assignment' },
    { time: '10:35 AM', action: 'Research started', agent: 'Junior', details: 'Gathering market data from sources' },
    { time: '10:42 AM', action: 'Analysis complete', agent: 'BGV', details: 'Synthesized findings into report' },
    { time: '10:50 AM', action: 'Review started', agent: 'Nexus', details: 'Quality check and validation' },
  ]

  return (
    <div className="bg-surface-light rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">📋 Task #1: Analyze market trends</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - task info */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">📝 Description</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Conduct comprehensive analysis of recent market movements and competitor positioning. 
              Identify emerging trends, potential risks, and strategic opportunities for Q2 2026.
              Focus on cross-market correlations and seasonal patterns.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">👤 Assigned To</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Nexus (Lead Analysis)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Junior (Data Collection)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>BGV (Synthesis)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">📊 Progress</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Research</span>
                  <span>✅ 100%</span>
                </div>
                <div className="flex justify-between">
                  <span>Analysis</span>
                  <span>🔄 75%</span>
                </div>
                <div className="flex justify-between">
                  <span>Validation</span>
                  <span>⏳ 25%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline/audit trail */}
          <div>
            <h3 className="font-semibold mb-3">📜 Task Timeline (Audit Trail)</h3>
            <div className="bg-surface rounded-lg p-4">
              <div className="space-y-3">
                {timeline.map((event, index) => (
                  <div key={index} className="flex gap-3 text-sm">
                    <div className="flex-shrink-0 w-24 font-mono text-gray-400">{event.time}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{event.action}</div>
                      {event.details && (
                        <div className="text-gray-300 text-xs mt-1">{event.details}</div>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-20 text-right text-xs">
                      🤖 {event.agent}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-surface-light">
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium">
              ⏸️ Pause Task
            </button>
            <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium">
              🔁 Retry
            </button>
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium">
              ✓ Mark Complete
            </button>
          </div>
        </div>

        {/* Right column - workspace preview */}
        <div>
          <h3 className="font-semibold mb-3">📁 Workspace Preview</h3>
          <div className="bg-surface rounded-lg p-4 max-h-60 overflow-y-auto scrollbar-thin">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span>📁</span>
                <span>market_analysis/</span>
              </div>
              <div className="pl-4 flex items-center gap-2 text-blue-400">
                <span>📄</span>
                <span>Q2_market_report.md</span>
              </div>
              <div className="pl-4 flex items-center gap-2 text-gray-300">
                <span>📊</span>
                <span>competitor_data.csv</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span>📄</span>
                <span>synthesis_notes.md</span>
              </div>
            </div>
          </div>

          <h3 className="font-semibold mt-4 mb-3">🎯 Next Steps</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-surface-light p-1 rounded">
              <input type="checkbox" defaultChecked />
              <span>Finalize recommendations</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-surface-light p-1 rounded">
              <input type="checkbox" />
              <span>Create executive summary</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-surface-light p-1 rounded">
              <input type="checkbox" />
              <span>Schedule stakeholder review</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetails
