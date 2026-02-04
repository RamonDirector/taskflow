'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Idea {
  id: string;
  title: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  position_x?: number;
  position_y?: number;
  created_at: string;
  voice_context?: string;
  type?: string;
  completed?: boolean;
  parent_idea_id?: string;
}

// Custom Idea Node Component
const IdeaNode = ({ data, selected }: { data: { idea: Idea; onDelete: (id: string) => void }; selected: boolean }) => {
  const { idea, onDelete } = data;
  
  const priorityGlow = {
    high: 'shadow-amber-500/30',
    medium: 'shadow-emerald-500/20',
    low: 'shadow-slate-500/10',
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-[#6b8f71] !w-3 !h-3 !border-2 !border-white dark:!border-[#1c1c1e]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          relative p-4 rounded-2xl min-w-[180px] max-w-[280px]
          bg-white dark:bg-[#2c2c2e]
          border-2 transition-all duration-200
          ${selected 
            ? 'border-[#6b8f71] shadow-lg shadow-[#6b8f71]/30' 
            : 'border-gray-200 dark:border-gray-700 shadow-apple'
          }
          ${priorityGlow[idea.priority || 'medium']}
        `}
      >
        {/* Type badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Idea
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(idea.id);
            }}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-50 hover:opacity-100"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-3">
          {idea.title}
        </p>

        {/* Category tag */}
        {idea.category && (
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {idea.category}
            </span>
          </div>
        )}

        {/* Priority indicator */}
        <div className="absolute bottom-2 right-2">
          <div className={`w-2 h-2 rounded-full ${
            idea.priority === 'high' ? 'bg-amber-500' :
            idea.priority === 'medium' ? 'bg-emerald-500' : 'bg-gray-400'
          }`} />
        </div>
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#6b8f71] !w-3 !h-3 !border-2 !border-white dark:!border-[#1c1c1e]" />
    </>
  );
};

// Custom Task Node Component (for linked action items)
const TaskNode = ({ data, selected }: { data: { idea: Idea; onDelete: (id: string) => void; onToggle: (id: string) => void }; selected: boolean }) => {
  const { idea, onDelete, onToggle } = data;
  
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#1c1c1e]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          relative p-3 rounded-xl min-w-[160px] max-w-[220px]
          bg-white dark:bg-[#2c2c2e]
          border transition-all duration-200
          ${selected 
            ? 'border-emerald-500 shadow-md shadow-emerald-500/20' 
            : 'border-gray-200 dark:border-gray-700 shadow-sm'
          }
          ${idea.completed ? 'opacity-60' : ''}
        `}
      >
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(idea.id);
            }}
            className={`
              w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
              flex items-center justify-center transition-all
              ${idea.completed 
                ? 'bg-emerald-500 border-emerald-500' 
                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
              }
            `}
          >
            {idea.completed && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Title */}
          <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${idea.completed ? 'line-through text-gray-400' : ''}`}>
            {idea.title}
          </p>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(idea.id);
            }}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 ml-auto"
          >
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#1c1c1e]" />
    </>
  );
};

const nodeTypes: NodeTypes = {
  idea: IdeaNode,
  task: TaskNode,
};

export default function IdeasBoard() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [darkMode, setDarkMode] = useState(false);
  
  // New idea input
  const [showInput, setShowInput] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Load dark mode
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch ideas and their related tasks
  const fetchIdeas = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Filter to ideas and their child tasks
      const allIdeas = data.filter((t: Idea) => t.type === 'idea') as Idea[];
      const allTasks = data.filter((t: Idea) => t.parent_idea_id) as Idea[];
      setIdeas([...allIdeas, ...allTasks]);
    }
  }, [supabase]);

  // Convert ideas to nodes
  useEffect(() => {
    const ideasOnly = ideas.filter(i => i.type === 'idea');
    const tasksOnly = ideas.filter(i => i.parent_idea_id);

    // Create idea nodes
    const ideaNodes: Node[] = ideasOnly.map((idea, index) => ({
      id: idea.id,
      type: 'idea',
      position: { 
        x: idea.position_x ?? (150 + (index % 4) * 320), 
        y: idea.position_y ?? (100 + Math.floor(index / 4) * 250) 
      },
      data: { 
        idea, 
        onDelete: deleteIdea 
      },
    }));

    // Create task nodes (positioned below their parent ideas)
    const taskNodes: Node[] = tasksOnly.map((task, index) => {
      const parentIdea = ideasOnly.find(i => i.id === task.parent_idea_id);
      const siblingTasks = tasksOnly.filter(t => t.parent_idea_id === task.parent_idea_id);
      const siblingIndex = siblingTasks.findIndex(t => t.id === task.id);
      
      return {
        id: task.id,
        type: 'task',
        position: {
          x: (parentIdea?.position_x ?? 150) + (siblingIndex * 180) - ((siblingTasks.length - 1) * 90),
          y: (parentIdea?.position_y ?? 100) + 180,
        },
        data: { 
          idea: task, 
          onDelete: deleteTask,
          onToggle: toggleTask,
        },
      };
    });

    setNodes([...ideaNodes, ...taskNodes]);

    // Create edges from ideas to tasks
    const newEdges: Edge[] = tasksOnly.map(task => ({
      id: `e-${task.parent_idea_id}-${task.id}`,
      source: task.parent_idea_id!,
      target: task.id,
      animated: !task.completed,
      style: { stroke: task.completed ? '#9ca3af' : '#6b8f71', strokeWidth: 2 },
    }));

    setEdges(newEdges);
  }, [ideas]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchIdeas();
      setLoading(false);
    };
    init();
  }, [supabase, router, fetchIdeas]);

  // Handle connections
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6b8f71', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  // Save node positions when dragged
  const onNodeDragStop = useCallback(async (_: React.MouseEvent, node: Node) => {
    await supabase
      .from('tasks')
      .update({ position_x: node.position.x, position_y: node.position.y })
      .eq('id', node.id);
  }, [supabase]);

  // Delete idea
  const deleteIdea = async (id: string) => {
    // Delete child tasks first
    await supabase.from('tasks').delete().eq('parent_idea_id', id);
    // Delete idea
    await supabase.from('tasks').delete().eq('id', id);
    setIdeas(prev => prev.filter(i => i.id !== id && i.parent_idea_id !== id));
  };

  // Delete task
  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  // Toggle task completion
  const toggleTask = async (id: string) => {
    const task = ideas.find(i => i.id === id);
    if (!task) return;
    
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  // Add new idea
  const addNewIdea = async () => {
    if (!newIdeaTitle.trim() || !user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newIdeaTitle.trim(),
        type: 'idea',
        category: 'personal',
        priority: 'medium',
        completed: false,
        position_x: 150 + Math.random() * 400,
        position_y: 150 + Math.random() * 200,
      })
      .select()
      .single();

    if (!error && data) {
      setIdeas(prev => [data, ...prev]);
      setNewIdeaTitle('');
      setShowInput(false);
    }
  };

  // Focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-[#1c1c1e] overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 px-4 py-3 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Idea Board
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {ideas.filter(i => i.type === 'idea').length} ideas
            </span>
          </div>

          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6b8f71] hover:bg-[#5a7d60] text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva idea
          </button>
        </div>
      </header>

      {/* Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50 dark:bg-[#1c1c1e]"
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background 
          color={darkMode ? '#333' : '#ddd'} 
          gap={24} 
          size={1}
        />
        <Controls 
          className="!bg-white dark:!bg-[#2c2c2e] !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg"
        />
        <MiniMap 
          className="!bg-white dark:!bg-[#2c2c2e] !border-gray-200 dark:!border-gray-700 !rounded-xl"
          nodeColor={(node) => node.type === 'idea' ? '#f59e0b' : '#10b981'}
          maskColor={darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
        />
      </ReactFlow>

      {/* New Idea Input Modal */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInput(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nueva idea
                </h2>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewIdea()}
                placeholder="¿Qué tienes en mente?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/50 focus:border-[#6b8f71]"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowInput(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addNewIdea}
                  disabled={!newIdeaTitle.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#6b8f71] hover:bg-[#5a7d60] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  Añadir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {ideas.filter(i => i.type === 'idea').length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <p className="text-gray-400 dark:text-gray-500 text-lg">
              Tu canvas está vacío
            </p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
              Pulsa "Nueva idea" para empezar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
