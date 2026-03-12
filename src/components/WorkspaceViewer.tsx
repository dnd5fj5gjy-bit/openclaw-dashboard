import { useState } from 'react'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

const mockWorkspaceData: FileNode = {
  name: 'workspace-root',
  type: 'folder',
  children: [
    {
      name: 'memory',
      type: 'folder',
      children: [
        { name: '2026-03-12.md', type: 'file' },
        { name: '2026-03-11.md', type: 'file' },
        { name: 'MEMORY.md', type: 'file' },
      ]
    },
    {
      name: 'learnings',
      type: 'folder',
      children: [
        { name: 'LEARNINGS.md', type: 'file' },
        { name: 'ERRORS.md', type: 'file' },
      ]
    },
    {
      name: 'agents',
      type: 'folder',
      children: [
        { name: 'nexus', type: 'folder', children: [{ name: 'session-logs.json', type: 'file' }] },
        { name: 'junior', type: 'folder', children: [{ name: 'session-logs.json', type: 'file' }] },
        { name: 'bgv', type: 'folder', children: [{ name: 'session-logs.json', type: 'file' }] },
      ]
    },
  ]
}

function WorkspaceViewer() {
  const [selectedNode, setSelectedNode] = useState<FileNode>(mockWorkspaceData)
  const [searchQuery, setSearchQuery] = useState('')

  function FileTree({ node, level = 0 }: { node: FileNode, level?: number }) {
    const isSelected = selectedNode.name === node.name
    const hasChildren = node.children && node.children.length > 0

    return (
      <div className="ml-4">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-surface-light transition-colors ${
            isSelected ? 'bg-primary text-secondary' : 'text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setSelectedNode(node)}
        >
          <span className="text-sm">
            {node.type === 'folder' ? (hasChildren ? '📂' : '📁') : '📄'}
          </span>
          <span className="text-sm font-mono">{node.name}</span>
        </div>

        {node.children && node.children.length > 0 && isSelected && (
          <FileTree node={{ name: '', type: 'folder' as const, children: node.children }} level={level + 1} />
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* File Browser */}
      <div className="lg:col-span-1 bg-surface-light rounded-lg p-4 h-fit">
        <h2 className="text-xl font-bold mb-4">📁 Workspace Explorer</h2>
        
        {/* Search bar */}
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-surface-light rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-secondary"
        />

        {/* File tree */}
        <div className="border-t border-b border-surface p-4 mb-4">
          {['memory/', 'learnings/', 'agents/nexus/', 'agents/junior/', 'agents/bgv/'].map((folder, idx) => (
            <FileTree key={idx} node={{ name: folder.trim(), type: 'folder' as const }} />
          ))}
        </div>

        {/* File list based on selection */}
        {selectedNode.type === 'file' ? (
          <div className="text-sm text-gray-400">
            📄 {selectedNode.name}
          </div>
        ) : selectedNode.children?.length ? (
          <div>
            <h3 className="font-semibold mb-2">{selectedNode.name === 'workspace-root' ? 'Root' : selectedNode.name}/</h3>
            {selectedNode.children.map((child, idx) => (
              <FileTree key={idx} node={child} />
            ))}
          </div>
        ) : null}
      </div>

      {/* File Content Preview */}
      <div className="lg:col-span-2 bg-surface-light rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">📄 File Viewer</h2>
        
        {selectedNode.type === 'file' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-surface pb-3">
              <span className="font-mono text-sm text-gray-400">{selectedNode.name}</span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                  ✏️ Edit
                </button>
                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                  ✓ Save Changes
                </button>
              </div>
            </div>

            <div className="bg-surface p-4 rounded-lg h-[500px] overflow-y-auto scrollbar-thin font-mono text-sm text-gray-300 leading-relaxed">
              {/* Simulating file content for demonstration */}
              {selectedNode.name.includes('MEMORY') ? (
                <>
                  <div className="text-green-400"># MEMORY.md</div>
                  <br />
                  <div className="text-purple-400"># Communication Style</div>
                  <div className="text-gray-300">- Keep replies concise — like a normal human employee talking to colleagues.</div>
                  <div className="text-gray-300">- Do NOT share internal thinking/monologue in chat. Only share results and things others need to know.</div>
                  <br />
                  <div className="text-purple-400"># OpenClaw Memory System</div>
                  <div className="text-gray-300">- MEMORY.md = curated long-term facts.</div>
                  <div className="text-gray-300">- memory/YYYY-MM-DD.md = daily notes (append-only).</div>
                  <br />
                  <div className="text-purple-400"># HEARTBEAT.md</div>
                  <div className="text-gray-300">## Sunday 09:00 — Memory Hygiene</div>
                  <div className="text-gray-300">Review MEMORY.md. Remove: duplicate facts, outdated info, task status updates.</div>
                </>
              ) : selectedNode.name.includes('LEARNINGS') ? (
                <>
                  <div className="text-green-400"># LEARNINGS.md</div>
                  <br />
                  <div className="text-gray-300">Log what you learned: corrections, better approaches, preferences.</div>
                  <br />
                  <div className="text-purple-400">| Date | Category | Learning | Source |</div>
                </>
              ) : (
                <div className="text-gray-400 italic">Content preview of {selectedNode.name} would appear here.</div>
              )}
            </div>

            <div className="flex justify-end space-x-2 text-sm text-gray-400">
              <span>{selectedNode.name.length} characters</span>
              <span>Last modified: Today 10:30 AM</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            Select a file from the explorer to view its contents
          </div>
        )}

        {/* Quick actions for folders */}
        {selectedNode.type === 'folder' && !selectedNode.children?.length && (
          <div className="mt-4 p-4 bg-blue-900/20 rounded-lg text-sm">
            <h3 className="font-semibold mb-2">📁 Empty Folder</h3>
            <p>This folder has no files. You can create new content here if needed.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkspaceViewer
