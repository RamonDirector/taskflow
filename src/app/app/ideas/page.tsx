'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/activity';
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
import VoiceEditButton from '@/app/components/VoiceEditButton';
import Image from 'next/image';
import { BottomNav } from '@/components/BottomNav';
import { useLocale } from '@/lib/i18n';

// Dark mode hook
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('hansei-darkmode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { darkMode, toggle };
};

const THEME_COLOR = '#6b8f71';
const DELETE_COLOR = '#8B2942'; // Burgundy red

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
const IdeaNode = ({ data, selected }: { data: { idea: Idea; onDelete: (id: string) => void; hasChildren: boolean; childCount: number; ideaLabel: string; stepsLabel: (n: number) => string }; selected: boolean }) => {
  const { idea, onDelete, hasChildren, childCount, ideaLabel, stepsLabel } = data;
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        relative p-4 rounded-2xl min-w-[200px] max-w-[280px] cursor-pointer
        bg-white dark:bg-[#2c2c2e]
        border-2 transition-all duration-200
        ${selected 
          ? 'border-[#6b8f71] shadow-lg shadow-[#6b8f71]/30' 
          : 'border-gray-200 dark:border-gray-700 shadow-apple hover:border-amber-300 hover:shadow-md'
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
            {ideaLabel}
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

      {/* Footer: Category + Plan indicator */}
      <div className="mt-3 flex items-center justify-between">
        {idea.category && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {idea.category}
          </span>
        )}
        {hasChildren && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
            {stepsLabel(childCount)}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// TaskNode removed - tasks only shown in drawer for mobile-friendly UX

export default function IdeasBoard() {
  const { locale, t } = useLocale();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const { darkMode, toggle: toggleDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
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
  const [isEditingIdeaTitle, setIsEditingIdeaTitle] = useState(false); // Voice edit for title
  const [isRecordingNewIdea, setIsRecordingNewIdea] = useState(false); // Voice for new idea
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Swipe state for steps
  const [swipingStepId, setSwipingStepId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  
  // Long press & double tap state
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [inlineEditStepId, setInlineEditStepId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_DELAY = 300;
  
  // Export toast
  const [showExportToast, setShowExportToast] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Export for AI
  const exportForAI = async () => {
    const ideasOnly = ideas.filter(i => i.type === 'idea');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    let md = `# Hansei — Ideas\n> Exported: ${dateStr} | ${ideasOnly.length} ideas\n\n`;
    
    ideasOnly.forEach(idea => {
      const created = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      md += `- ${idea.title} (created ${created})\n`;
      // Add child tasks/steps as context
      const children = ideas.filter(i => i.parent_idea_id === idea.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      if (children.length > 0) {
        const steps = children.map(c => `${c.completed ? '[x]' : '[ ]'} ${c.title}`).join('; ');
        md += `  Context: ${steps}\n`;
      }
    });
    
    try {
      await navigator.clipboard.writeText(md.trim());
      setShowExportToast(true);
      setTimeout(() => setShowExportToast(false), 2000);
    } catch { /* clipboard not available */ }
  };

  // Node types (only ideas on canvas)
  const nodeTypes: NodeTypes = {
    idea: IdeaNode,
  };

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

  // Convert ideas to nodes (ONLY ideas, no task nodes for mobile-friendly canvas)
  useEffect(() => {
    const ideasOnly = ideas.filter(i => i.type === 'idea');
    const tasksOnly = ideas.filter(i => i.parent_idea_id);

    const ideaNodes: Node[] = ideasOnly.map((idea, index) => ({
      id: idea.id,
      type: 'idea',
      position: { 
        x: idea.position_x ?? (150 + (index % 3) * 280), 
        y: idea.position_y ?? (100 + Math.floor(index / 3) * 200) 
      },
      data: { 
        idea, 
        onDelete: deleteIdea,
        hasChildren: tasksOnly.some(t => t.parent_idea_id === idea.id),
        childCount: tasksOnly.filter(t => t.parent_idea_id === idea.id).length,
        ideaLabel: t.ideas.idea_label,
        stepsLabel: t.ideas.steps,
      },
    }));

    // Only idea nodes - no task nodes on canvas (mobile-friendly)
    setNodes(ideaNodes);
    setEdges([]); // No edges needed
  }, [ideas, setNodes, setEdges]);

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

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch('/app');
    router.prefetch('/app/tasks');
  }, [router]);

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
    // Delete children first, then the idea itself
    const { error: childErr } = await supabase.from('tasks').delete().eq('parent_idea_id', id);
    const { error: ideaErr } = await supabase.from('tasks').delete().eq('id', id);
    if (childErr || ideaErr) {
      console.error('Delete idea failed:', childErr || ideaErr);
      // Fallback: mark as completed so it disappears
      await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', id);
    }
    setIdeas(prev => prev.filter(i => i.id !== id && i.parent_idea_id !== id));
    if (selectedIdea?.id === id) closeDrawer();
    if (user) logActivity({ supabase, userId: user.id, action: 'idea_deleted', entityType: 'idea', entityId: id });
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Delete task failed:', error);
      await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', id);
    }
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
          voiceContext: selectedIdea.voice_context,
          locale,
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
    if (!task || !selectedIdea) return;

    try {
      // 1. Transcribe audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (text?.trim()) {
        // 2. Use AI to edit the task based on voice input
        const editRes = await fetch('/api/voice-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editType: 'action-point',
            voiceInput: text.trim(),
            context: {
              ideaTitle: selectedIdea.title,
              stepTitle: task.title,
              stepIndex: stepIndex,
              totalSteps: childTasks.length,
            },
          }),
        });
        
        if (editRes.ok) {
          const { result } = await editRes.json();
          const newTitle = result?.title || result?.new_step;
          if (newTitle) {
            await supabase.from('tasks').update({ title: newTitle }).eq('id', task.id);
            setIdeas(prev => prev.map(i => i.id === task.id ? { ...i, title: newTitle } : i));
          }
        }
      }
    } catch (e) {
      console.error('Voice edit error:', e);
    }

    setEditingStepIndex(null);
  };

  // Voice recording for idea title
  const startRecordingForTitle = async () => {
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
        await processVoiceEditForTitle();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const processVoiceEditForTitle = async () => {
    if (!selectedIdea) return;
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (text?.trim()) {
        // Use AI to edit the idea title based on voice input
        const editRes = await fetch('/api/voice-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editType: 'action-point', // Reuse same logic
            voiceInput: text.trim(),
            context: {
              ideaTitle: t.app.type_idea,
              stepTitle: selectedIdea.title,
              stepIndex: 0,
              totalSteps: 1,
            },
          }),
        });
        
        if (editRes.ok) {
          const { result } = await editRes.json();
          const newTitle = result?.title || result?.new_step || text.trim();
          await supabase.from('tasks').update({ title: newTitle }).eq('id', selectedIdea.id);
          setIdeas(prev => prev.map(i => i.id === selectedIdea.id ? { ...i, title: newTitle } : i));
          setSelectedIdea(prev => prev ? { ...prev, title: newTitle } : null);
          setEditedTitle(newTitle);
        }
      }
    } catch (e) {
      console.error('Voice edit error:', e);
    }

    setIsEditingIdeaTitle(false);
  };

  // Voice recording for NEW idea
  const startRecordingForNewIdea = async () => {
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
        await processNewIdeaRecording();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingNewIdea(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const [isProcessingNewIdea, setIsProcessingNewIdea] = useState(false);

  const stopRecordingNewIdea = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
    setIsProcessingNewIdea(true);
  };

  const processNewIdeaRecording = async () => {
    if (!user) {
      setIsRecordingNewIdea(false);
      setIsProcessingNewIdea(false);
      return;
    }
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    if (audioBlob.size < 500) {
      setIsRecordingNewIdea(false);
      setIsProcessingNewIdea(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (text?.trim()) {
        // Use extract-tasks to get a clean title, but treat everything as idea
        const extractRes = await fetch('/api/extract-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim(), locale }),
        });

        let title = text.trim();
        let category = 'personal';
        if (extractRes.ok) {
          const extractData = await extractRes.json();
          const allItems = extractData.items || [];
          if (allItems.length > 0) {
            title = allItems[0].title || title;
            category = allItems[0].category || category;
          }
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title,
            voice_context: text.trim(),
            type: 'idea',
            category,
            priority: 'medium',
            completed: false,
          })
          .select()
          .single();

        if (!error && data) {
          setIdeas(prev => [data, ...prev]);
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        }
      }
    } catch (e) {
      console.error('New idea recording error:', e);
    }

    setIsRecordingNewIdea(false);
    setIsProcessingNewIdea(false);
  };

  // Swipe handlers for steps
  const handleStepTouchStart = (e: React.TouchEvent, taskId: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingStepId(taskId);
    setSwipeOffset(0);
  };

  const handleStepTouchMove = (e: React.TouchEvent) => {
    if (!swipingStepId) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(diff);
  };

  const handleStepTouchEnd = (task: Idea) => {
    // End long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const currentOffset = swipeOffset;
    // Reset swipe state
    setSwipingStepId(null);
    setSwipeOffset(0);
    
    // Perform action based on offset (only if not selected for editing)
    if (!selectedStepId && !inlineEditStepId) {
      if (currentOffset > 60) {
        toggleTask(task.id);
      } else if (currentOffset < -60) {
        deleteTask(task.id);
      }
    }
  };

  // Long press to select for voice editing
  const handleLongPressStart = (taskId: string) => {
    longPressTimer.current = setTimeout(() => {
      // Cancel any swipe
      setSwipingStepId(null);
      setSwipeOffset(0);
      // Select this step
      setSelectedStepId(taskId);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Double tap for inline text edit
  const handleStepTap = (task: Idea, index: number) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;
    
    if (lastTap && lastTap.id === task.id && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
      // Double tap → inline edit
      lastTapRef.current = null;
      setInlineEditStepId(task.id);
      setInlineEditValue(task.title);
      setSelectedStepId(null);
    } else {
      // First tap → wait for potential double tap
      lastTapRef.current = { id: task.id, time: now };
    }
  };

  // Save inline edit
  const saveInlineEdit = async () => {
    if (!inlineEditStepId || !inlineEditValue.trim()) return;
    await supabase.from('tasks').update({ title: inlineEditValue.trim() }).eq('id', inlineEditStepId);
    setIdeas(prev => prev.map(i => i.id === inlineEditStepId ? { ...i, title: inlineEditValue.trim() } : i));
    setInlineEditStepId(null);
    setInlineEditValue('');
  };

  // Cancel selection
  const clearSelection = () => {
    setSelectedStepId(null);
    setInlineEditStepId(null);
  };

  // Focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#2d2d30] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-[#2d2d30] overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 px-4 py-3 bg-white/80 dark:bg-[#2d2d30]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
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
            <Image src="/icon-192-transparent.png" alt="Hansei" width={28} height={28} className="rounded-lg" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t.ideas.title}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {ideas.filter(i => i.type === 'idea').length} ideas
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); exportForAI(); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-amber-600"
              title="Export for AI"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
              </svg>
            </button>
          </div>

          {/* Voice button for new idea - Press and hold */}
          <div className="flex items-center gap-2">
            {isRecording && isRecordingNewIdea && (
              <span className="text-xs text-[#6b8f71] font-medium animate-pulse">{t.app.recording}</span>
            )}
            {!isRecording && isProcessingNewIdea && (
              <span className="text-xs text-[#6b8f71] font-medium flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
                {t.tasks.processing}
              </span>
            )}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                if (!isRecording && !isProcessingNewIdea) startRecordingForNewIdea();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (isRecording && isRecordingNewIdea) stopRecordingNewIdea();
              }}
              onMouseDown={() => {
                if (!isRecording) startRecordingForNewIdea();
              }}
              onMouseUp={() => {
                if (isRecording && isRecordingNewIdea) stopRecordingNewIdea();
              }}
              onMouseLeave={() => {
                if (isRecording && isRecordingNewIdea) stopRecordingNewIdea();
              }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative bg-[#6b8f71] select-none touch-none"
            >
              {/* Pulsing ring when recording */}
              {isRecording && isRecordingNewIdea && (
                <div className="absolute inset-0 rounded-full bg-[#6b8f71] animate-ping opacity-30" />
              )}
              {/* Mic → Check animation */}
              <div className="relative w-5 h-5">
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewIdea ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewIdea ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            </button>
            
          </div>
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
        onNodeClick={(_, node) => {
          if (node.type === 'idea') {
            const idea = ideas.find(i => i.id === node.id);
            if (idea) openDrawer(idea);
          }
        }}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50 dark:bg-[#2d2d30]"
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color={darkMode ? '#333' : '#ddd'} gap={24} size={1} />
        <Controls className="!bg-white dark:!bg-[#1c1c1e] !border !border-gray-200 dark:!border-gray-600 !rounded-xl !shadow-lg" />
        <MiniMap 
          className="!bg-white dark:!bg-[#1c1c1e] !border !border-gray-200 dark:!border-gray-600 !rounded-xl !overflow-hidden"
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
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-[#2d2d30] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">{Icons.lightbulb}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.ideas.idea_label}</span>
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
                {/* Title with voice edit */}
                <div>
                  {editingTitle ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editedTitle}
                        onChange={(e) => {
                          setEditedTitle(e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            updateIdeaTitle();
                          }
                          if (e.key === 'Escape') {
                            setEditingTitle(false);
                            setEditedTitle(selectedIdea?.title || '');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2c2c2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/50 resize-none overflow-hidden"
                        style={{ minHeight: '60px' }}
                        autoFocus
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                            el.focus();
                            el.setSelectionRange(el.value.length, el.value.length);
                          }
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingTitle(false);
                            setEditedTitle(selectedIdea?.title || '');
                          }}
                          className="px-3 py-1.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                        >
                          {t.ideas.cancel}
                        </button>
                        <button
                          onClick={updateIdeaTitle}
                          className="px-4 py-1.5 rounded-xl bg-[#6b8f71] text-white text-sm font-medium"
                        >
                          {t.ideas.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <h2 
                        onClick={() => setEditingTitle(true)}
                        className="flex-1 text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-[#6b8f71] transition-colors"
                      >
                        {selectedIdea.title}
                      </h2>
                      {/* Voice edit for title - Press and hold */}
                      <button
                        onTouchStart={(e) => {
                          e.preventDefault();
                          if (!isRecording) {
                            setIsEditingIdeaTitle(true);
                            startRecordingForTitle();
                          }
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          if (isRecording && isEditingIdeaTitle) stopRecording();
                        }}
                        onMouseDown={() => {
                          if (!isRecording) {
                            setIsEditingIdeaTitle(true);
                            startRecordingForTitle();
                          }
                        }}
                        onMouseUp={() => {
                          if (isRecording && isEditingIdeaTitle) stopRecording();
                        }}
                        onMouseLeave={() => {
                          if (isRecording && isEditingIdeaTitle) stopRecording();
                        }}
                        className={`p-2 rounded-full transition-all flex-shrink-0 select-none touch-none ${
                          isRecording && isEditingIdeaTitle
                            ? 'bg-[#6b8f71] text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-[#6b8f71]'
                        }`}
                      >
                        {/* Mic → Check animation */}
                        <div className="relative w-5 h-5">
                          <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isEditingIdeaTitle ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                            {Icons.mic}
                          </div>
                          <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isEditingIdeaTitle ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                            {Icons.check}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                  {isRecording && isEditingIdeaTitle && (
                    <p className="text-xs text-[#6b8f71] mt-1">{t.app.recording} {formatTime(recordingTime)}</p>
                  )}
                </div>

                {/* Voice Context */}
                {selectedIdea.voice_context && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.ideas.original_context}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedIdea.voice_context}"</p>
                  </div>
                )}

                {/* Generate Plan Button - only show if no plan exists */}
                {childTasks.length === 0 && (
                  <button
                    onClick={generatePlan}
                    disabled={isGeneratingPlan}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#6b8f71] to-[#5a7d60] text-white font-medium transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t.ideas.generating_plan}
                      </>
                    ) : (
                      <>
                        {Icons.sparkles}
                        {t.ideas.generate_plan}
                      </>
                    )}
                  </button>
                )}

                {/* Action Points with swipe */}
                {childTasks.length > 0 && (
                  <div className="space-y-3" onClick={() => { if (selectedStepId) clearSelection(); }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t.ideas.action_plan(childTasks.length)}
                      </h3>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Move all pending tasks to main task list
                          const pendingTasks = childTasks.filter(t => !t.completed);
                          if (pendingTasks.length === 0) return;
                          
                          await Promise.all(
                            pendingTasks.map(task => 
                              supabase.from('tasks').update({ 
                                parent_idea_id: null,
                                origin_idea_id: selectedIdea?.id 
                              }).eq('id', task.id)
                            )
                          );
                          
                          // Refresh ideas
                          await fetchIdeas();
                          
                          // Haptic feedback
                          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#6b8f71] hover:bg-[#6b8f71]/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {t.ideas.add_to_tasks}
                      </button>
                    </div>
                    
                    {childTasks.map((task, index) => {
                      const isBeingSwiped = swipingStepId === task.id;
                      const isSelected = selectedStepId === task.id;
                      const isInlineEditing = inlineEditStepId === task.id;
                      const showComplete = isBeingSwiped && swipeOffset > 30;
                      const showDelete = isBeingSwiped && swipeOffset < -30;
                      const readyToComplete = isBeingSwiped && swipeOffset > 60;
                      const readyToDelete = isBeingSwiped && swipeOffset < -60;
                      
                      return (
                        <div key={task.id} className="relative overflow-hidden rounded-2xl">
                          {/* Swipe backgrounds */}
                          {!isSelected && !isInlineEditing && (
                            <div className="absolute inset-0 flex">
                              {/* Complete background (right swipe) - matcha green */}
                              <div className={`flex-1 bg-[#c8d9cb] flex items-center pl-5 transition-opacity ${showComplete ? 'opacity-100' : 'opacity-0'}`}>
                                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              {/* Delete background (left swipe) - red */}
                              <div className={`flex-1 flex items-center justify-end pr-5 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: DELETE_COLOR }}>
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </div>
                            </div>
                          )}
                          
                          {/* Card that moves */}
                          <div
                            style={{ 
                              transform: isBeingSwiped && !isSelected ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                              transition: isBeingSwiped ? 'none' : 'transform 0.3s ease-out',
                            }}
                            onTouchStart={(e) => {
                              if (isRecording || isSelected || isInlineEditing) return;
                              handleStepTouchStart(e, task.id);
                              handleLongPressStart(task.id);
                            }}
                            onTouchMove={(e) => {
                              if (isSelected || isInlineEditing) return;
                              handleStepTouchMove(e);
                              // Cancel long press if swiping
                              if (Math.abs(swipeOffset) > 15) handleLongPressEnd();
                            }}
                            onTouchEnd={() => {
                              handleLongPressEnd();
                              if (!isSelected && !isInlineEditing) handleStepTouchEnd(task);
                            }}
                            onTouchCancel={handleLongPressEnd}
                            onClick={() => handleStepTap(task, index)}
                            className={`relative rounded-2xl p-4 border-2 transition-all ${
                              isSelected
                                ? 'border-black dark:border-white ring-2 ring-black/20 dark:ring-white/30 scale-[1.02] bg-white dark:bg-[#2c2c2e]'
                                : task.completed 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                                  : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-gray-700 active:scale-[0.98] active:bg-gray-50 dark:active:bg-[#38383a]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Step number / checkbox */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
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

                              {/* Title or Inline Edit */}
                              {isInlineEditing ? (
                                <input
                                  type="text"
                                  value={inlineEditValue}
                                  onChange={(e) => setInlineEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveInlineEdit();
                                    if (e.key === 'Escape') setInlineEditStepId(null);
                                  }}
                                  onBlur={saveInlineEdit}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                  className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none text-gray-800 dark:text-gray-200 py-1"
                                />
                              ) : (
                                <p className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {task.title}
                                </p>
                              )}

                              {/* Move to tasks - always visible for non-completed tasks */}
                              {!task.completed && !isInlineEditing && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Track origin before moving
                                    await supabase.from('tasks').update({ 
                                      parent_idea_id: null,
                                      origin_idea_id: selectedIdea?.id 
                                    }).eq('id', task.id);
                                    await fetchIdeas();
                                    setSelectedStepId(null);
                                    if (navigator.vibrate) navigator.vibrate(50);
                                  }}
                                  className="p-2 rounded-full text-gray-400 hover:text-[#6b8f71] hover:bg-[#6b8f71]/10 transition-all flex-shrink-0"
                                  title={t.ideas.add_to_tasks}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                  </svg>
                                </button>
                              )}

                              {/* Mic button when selected - Press and hold */}
                              {isSelected && (
                                <button
                                  onTouchStart={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isRecording) {
                                      setEditingStepIndex(index);
                                      startRecording(index);
                                    }
                                  }}
                                  onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (isRecording && editingStepIndex === index) stopRecording();
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    if (!isRecording) {
                                      setEditingStepIndex(index);
                                      startRecording(index);
                                    }
                                  }}
                                  onMouseUp={(e) => {
                                    e.stopPropagation();
                                    if (isRecording && editingStepIndex === index) stopRecording();
                                  }}
                                  onMouseLeave={() => {
                                    if (isRecording && editingStepIndex === index) stopRecording();
                                  }}
                                  className={`p-2.5 rounded-full transition-all relative select-none touch-none ${
                                    isRecording && editingStepIndex === index
                                      ? 'bg-[#6b8f71] text-white'
                                      : 'bg-[#6b8f71] text-white hover:bg-[#5a7d60]'
                                  }`}
                                >
                                  {/* Pulsing ring when recording */}
                                  {isRecording && editingStepIndex === index && (
                                    <div className="absolute inset-0 rounded-full bg-[#6b8f71] animate-ping opacity-30" />
                                  )}
                                  {/* Mic → Check animation */}
                                  <div className="relative w-5 h-5">
                                    <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && editingStepIndex === index ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                                      {Icons.mic}
                                    </div>
                                    <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && editingStepIndex === index ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                                      {Icons.check}
                                    </div>
                                  </div>
                                </button>
                              )}
                            </div>

                            {/* Recording indicator */}
                            {isRecording && editingStepIndex === index && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-[#6b8f71]">
                                <span className="w-2 h-2 rounded-full bg-[#6b8f71] animate-pulse" />
                                {t.app.recording} {formatTime(recordingTime)}
                              </div>
                            )}

{/* Hint removed - UI should be self-explanatory */}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => deleteIdea(selectedIdea.id)}
                  className="w-full px-4 py-2 rounded-xl text-[#8B2942] hover:bg-[#8B2942]/10 dark:hover:bg-[#8B2942]/20 text-sm font-medium transition-colors"
                >
                  {t.ideas.delete_idea}
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.ideas.new_idea}</h2>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewIdea()}
                placeholder={t.ideas.whats_on_your_mind}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2d2d30] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/50"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowInput(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t.ideas.cancel}
                </button>
                <button
                  onClick={addNewIdea}
                  disabled={!newIdeaTitle.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#6b8f71] hover:bg-[#5a7d60] disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {t.ideas.add}
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
            <Image 
              src="/images/panda-idea-v2.png" 
              alt="Kai con idea" 
              width={160} 
              height={160} 
              className="mx-auto mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t.ideas.your_space}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t.ideas.say_idea_hint}</p>
          </div>
        </div>
      )}

      {/* Export toast */}
      <AnimatePresence>
        {showExportToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#6b8f71] text-white text-sm font-medium shadow-lg"
          >
            {t.ideas.export_copied}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
