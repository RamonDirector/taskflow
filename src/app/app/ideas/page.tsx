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

const THEME_COLOR = '#6b8f71';

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
  order_index?: number;
}

interface ActionPoint {
  title: string;
  time_estimate: string;
  category: string;
}

// Icons
const Icons = {
  mic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
};

// Custom Idea Node Component
const IdeaNode = ({ data, selected }: { data: { idea: Idea; onDelete: (id: string) => void; onSelect: (idea: Idea) => void; hasChildren: boolean }; selected: boolean }) => {
  const { idea, onDelete, onSelect, hasChildren } = data;
  
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-[#6b8f71] !w-3 !h-3 !border-2 !border-white dark:!border-[#1c1c1e]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => onSelect(idea)}
        className={`
          relative p-4 rounded-2xl min-w-[180px] max-w-[280px] cursor-pointer
          bg-white dark:bg-[#2c2c2e]
          border-2 transition-all duration-200
          ${selected 
            ? 'border-[#6b8f71] shadow-lg shadow-[#6b8f71]/30' 
            : 'border-gray-200 dark:border-gray-700 shadow-apple hover:border-amber-300'
          }
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
            {hasChildren && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                Plan ✓
              </span>
            )}
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
      </motion.div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#6b8f71] !w-3 !h-3 !border-2 !border-white dark:!border-[#1c1c1e]" />
    </>
  );
};

// Custom Task Node Component
const TaskNode = ({ data, selected }: { data: { idea: Idea; onDelete: (id: string) => void; onToggle: (id: string) => void }; selected: boolean }) => {
  const { idea, onDelete, onToggle } = data;
  
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#1c1c1e]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          relative p-3 rounded-xl min-w-[160px] max-w-[220px] group
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
          <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug flex-1 ${idea.completed ? 'line-through text-gray-400' : ''}`}>
            {idea.title}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(idea.id);
            }}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
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
  
  // Drawer state
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [childTasks, setChildTasks] = useState<Idea[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  // Voice editing
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Node types with callbacks
  const nodeTypes: NodeTypes = {
    idea: IdeaNode,
    task: TaskNode,
  };

  // Load dark mode
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch ideas
  const fetchIdeas = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const allIdeas = data.filter((t: Idea) => t.type === 'idea') as Idea[];
      const allTasks = data.filter((t: Idea) => t.parent_idea_id) as Idea[];
      setIdeas([...allIdeas, ...allTasks]);
    }
  }, [supabase]);

  // Update child tasks when selected idea changes
  useEffect(() => {
    if (selectedIdea) {
      const children = ideas
        .filter(i => i.parent_idea_id === selectedIdea.id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setChildTasks(children);
    }
  }, [selectedIdea, ideas]);

  // Convert ideas to nodes
  useEffect(() => {
    const ideasOnly = ideas.filter(i => i.type === 'idea');
    const tasksOnly = ideas.filter(i => i.parent_idea_id);

    const ideaNodes: Node[] = ideasOnly.map((idea, index) => ({
      id: idea.id,
      type: 'idea',
      position: { 
        x: idea.position_x ?? (150 + (index % 4) * 320), 
        y: idea.position_y ?? (100 + Math.floor(index / 4) * 250) 
      },
      data: { 
        idea, 
        onDelete: deleteIdea,
        onSelect: openDrawer,
        hasChildren: tasksOnly.some(t => t.parent_idea_id === idea.id),
      },
    }));

    const taskNodes: Node[] = tasksOnly.map((task) => {
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

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6b8f71', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const onNodeDragStop = useCallback(async (_: React.MouseEvent, node: Node) => {
    await supabase
      .from('tasks')
      .update({ position_x: node.position.x, position_y: node.position.y })
      .eq('id', node.id);
  }, [supabase]);

  // Drawer functions
  const openDrawer = (idea: Idea) => {
    setSelectedIdea(idea);
    setEditedTitle(idea.title);
  };

  const closeDrawer = () => {
    setSelectedIdea(null);
    setEditingTitle(false);
    setEditingStepIndex(null);
    setIsRecording(false);
  };

  // CRUD operations
  const deleteIdea = async (id: string) => {
    await supabase.from('tasks').delete().eq('parent_idea_id', id);
    await supabase.from('tasks').delete().eq('id', id);
    setIdeas(prev => prev.filter(i => i.id !== id && i.parent_idea_id !== id));
    if (selectedIdea?.id === id) closeDrawer();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const toggleTask = async (id: string) => {
    const task = ideas.find(i => i.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const updateIdeaTitle = async () => {
    if (!selectedIdea || !editedTitle.trim()) return;
    await supabase.from('tasks').update({ title: editedTitle.trim() }).eq('id', selectedIdea.id);
    setIdeas(prev => prev.map(i => i.id === selectedIdea.id ? { ...i, title: editedTitle.trim() } : i));
    setSelectedIdea(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
    setEditingTitle(false);
  };

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

  // Generate action plan
  const generatePlan = async () => {
    if (!selectedIdea || !user) return;
    setIsGeneratingPlan(true);

    try {
      // Delete existing children
      await supabase.from('tasks').delete().eq('parent_idea_id', selectedIdea.id);

      const res = await fetch('/api/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idea: selectedIdea.title, 
          voiceContext: selectedIdea.voice_context 
        }),
      });

      if (!res.ok) throw new Error('Failed to generate plan');
      const { action_points } = await res.json();

      if (action_points?.length > 0) {
        const rows = action_points.map((point: ActionPoint, index: number) => ({
          user_id: user.id,
          title: point.title,
          category: point.category,
          priority: 'medium',
          completed: false,
          type: 'task',
          parent_idea_id: selectedIdea.id,
          order_index: index,
        }));
        await supabase.from('tasks').insert(rows);
      }

      await fetchIdeas();
    } catch (e) {
      console.error('Plan generation error:', e);
    }

    setIsGeneratingPlan(false);
  };

  // Voice recording for step editing
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const startRecording = async (stepIndex: number) => {
    try {
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        await processVoiceEdit(stepIndex);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      setEditingStepIndex(stepIndex);
      
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const processVoiceEdit = async (stepIndex: number) => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const task = childTasks[stepIndex];
    if (!task) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (text?.trim()) {
        // Update the task title with the transcribed text
        await supabase.from('tasks').update({ title: text.trim() }).eq('id', task.id);
        setIdeas(prev => prev.map(i => i.id === task.id ? { ...i, title: text.trim() } : i));
      }
    } catch (e) {
      console.error('Voice edit error:', e);
    }

    setEditingStepIndex(null);
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Idea Board</h1>
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
        <Background color={darkMode ? '#333' : '#ddd'} gap={24} size={1} />
        <Controls className="!bg-white dark:!bg-[#2c2c2e] !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg" />
        <MiniMap 
          className="!bg-white dark:!bg-[#2c2c2e] !border-gray-200 dark:!border-gray-700 !rounded-xl"
          nodeColor={(node) => node.type === 'idea' ? '#f59e0b' : '#10b981'}
          maskColor={darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
        />
      </ReactFlow>

      {/* Idea Detail Drawer */}
      <AnimatePresence>
        {selectedIdea && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={closeDrawer}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-[#1c1c1e] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">{Icons.lightbulb}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Idea</span>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {Icons.x}
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Title */}
                <div>
                  {editingTitle ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && updateIdeaTitle()}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2c2c2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/50"
                        autoFocus
                      />
                      <button
                        onClick={updateIdeaTitle}
                        className="px-3 py-2 rounded-xl bg-[#6b8f71] text-white"
                      >
                        {Icons.check}
                      </button>
                    </div>
                  ) : (
                    <h2 
                      onClick={() => setEditingTitle(true)}
                      className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-[#6b8f71] transition-colors"
                    >
                      {selectedIdea.title}
                    </h2>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Toca para editar</p>
                </div>

                {/* Voice Context */}
                {selectedIdea.voice_context && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contexto original:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedIdea.voice_context}"</p>
                  </div>
                )}

                {/* Generate Plan Button */}
                <button
                  onClick={generatePlan}
                  disabled={isGeneratingPlan}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#6b8f71] to-[#5a7d60] text-white font-medium transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {isGeneratingPlan ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando plan...
                    </>
                  ) : (
                    <>
                      {Icons.sparkles}
                      {childTasks.length > 0 ? 'Regenerar Plan' : 'Generar Plan'}
                    </>
                  )}
                </button>

                {/* Action Points */}
                {childTasks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Plan de Acción ({childTasks.length} pasos)
                    </h3>
                    
                    {childTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group p-3 rounded-xl border transition-all ${
                          task.completed 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-gray-700 hover:border-[#6b8f71]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Step number / checkbox */}
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-medium transition-all ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-emerald-400'
                            }`}
                          >
                            {task.completed ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </button>

                          {/* Title */}
                          <p className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {task.title}
                          </p>

                          {/* Voice edit button */}
                          <button
                            onClick={() => isRecording && editingStepIndex === index ? stopRecording() : startRecording(index)}
                            className={`p-2 rounded-full transition-all ${
                              isRecording && editingStepIndex === index
                                ? 'bg-red-500 text-white'
                                : 'opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
                            }`}
                          >
                            {isRecording && editingStepIndex === index ? Icons.check : Icons.mic}
                          </button>
                        </div>

                        {/* Recording indicator */}
                        {isRecording && editingStepIndex === index && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Grabando... {formatTime(recordingTime)}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => deleteIdea(selectedIdea.id)}
                  className="w-full px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                >
                  Eliminar idea
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Idea Modal */}
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
                <span className="text-amber-500">{Icons.lightbulb}</span>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva idea</h2>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewIdea()}
                placeholder="¿Qué tienes en mente?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/50"
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#6b8f71] hover:bg-[#5a7d60] disabled:opacity-50 text-white text-sm font-medium transition-colors"
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
            <p className="text-gray-400 dark:text-gray-500 text-lg">Tu canvas está vacío</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Pulsa "Nueva idea" para empezar</p>
          </div>
        </div>
      )}
    </div>
  );
}
