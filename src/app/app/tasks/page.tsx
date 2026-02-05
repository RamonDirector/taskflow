'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceEditButton from '@/app/components/VoiceEditButton';
import Image from 'next/image';

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

interface Task {
  id: string;
  title: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  voice_context?: string;
  type?: string;
  completed?: boolean;
  parent_idea_id?: string;
}

const Icons = {
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

export default function TasksPage() {
  const { darkMode, toggle: toggleDarkMode } = useDarkMode();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // Voice edit state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // Voice recording for new task
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingNewTask, setIsRecordingNewTask] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Inline text edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  
  // Swipe state
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  
  // Double tap detection
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_DELAY = 300;
  
  const router = useRouter();
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('type', 'task')
      .is('parent_idea_id', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data as Task[]);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchTasks();
      setLoading(false);
    };
    init();
  }, [supabase, router, fetchTasks]);

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTaskTitle = async (id: string, newTitle: string) => {
    await supabase.from('tasks').update({ title: newTitle }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  // Voice edit handler
  const handleVoiceTranscript = async (text: string) => {
    if (!selectedTaskId) return;
    setIsProcessingVoice(true);
    
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) {
      setIsProcessingVoice(false);
      return;
    }

    try {
      // Use AI to edit the task based on voice input
      const editRes = await fetch('/api/voice-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editType: 'action-point',
          voiceInput: text,
          context: {
            ideaTitle: 'Tarea',
            stepTitle: task.title,
            stepIndex: 0,
            totalSteps: 1,
          },
        }),
      });
      
      if (editRes.ok) {
        const { result } = await editRes.json();
        const newTitle = result?.title || result?.new_step || text;
        await updateTaskTitle(selectedTaskId, newTitle);
      }
    } catch (e) {
      console.error('Voice edit error:', e);
    }

    setIsProcessingVoice(false);
    setSelectedTaskId(null);
  };

  // Swipe handlers (for complete/delete)
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    if (inlineEditId) return;
    touchStartX.current = e.touches[0].clientX;
    setSwipingId(id);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId || inlineEditId) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = (task: Task) => {
    if (inlineEditId) return;
    
    const offset = swipeOffset;
    setSwipingId(null);
    setSwipeOffset(0);
    
    // Only trigger swipe actions if actually swiped
    if (Math.abs(offset) > 60) {
      if (offset > 60) {
        toggleTask(task.id);
      } else if (offset < -60) {
        deleteTask(task.id);
      }
    }
  };

  // Tap to select (show mic), double tap for inline edit
  const handleTaskTap = (task: Task) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;
    
    if (lastTap && lastTap.id === task.id && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
      // Double tap → inline edit
      lastTapRef.current = null;
      setSelectedTaskId(null);
      setInlineEditId(task.id);
      setInlineEditValue(task.title);
    } else {
      // Single tap → select task (show mic)
      lastTapRef.current = { id: task.id, time: now };
      if (selectedTaskId === task.id) {
        // Tap again on selected → deselect
        setSelectedTaskId(null);
      } else {
        setSelectedTaskId(task.id);
      }
    }
  };

  const saveInlineEdit = async () => {
    if (!inlineEditId || !inlineEditValue.trim()) return;
    await updateTaskTitle(inlineEditId, inlineEditValue.trim());
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const clearSelection = () => {
    setSelectedTaskId(null);
    setInlineEditId(null);
  };

  // Voice recording for NEW task
  const startRecordingForNewTask = async () => {
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
        await processNewTaskRecording();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingNewTask(true);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecordingNewTask = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const processNewTaskRecording = async () => {
    if (!user) return;
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (text?.trim()) {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: text.trim(),
            type: 'task',
            category: 'personal',
            priority: 'medium',
            completed: false,
          })
          .select()
          .single();

        if (!error && data) {
          setTasks(prev => [data, ...prev]);
        }
      }
    } catch (e) {
      console.error('New task recording error:', e);
    }

    setIsRecordingNewTask(false);
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#2d2d30] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#2d2d30]" onClick={clearSelection}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-white/80 dark:bg-[#2d2d30]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {Icons.back}
            </button>
            <Image src="/icon-192-transparent.png" alt="Hansei" width={28} height={28} className="rounded-lg" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tareas</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {completedCount}/{tasks.length}
            </span>
          </div>
          
          {/* Voice button for new task */}
          <div className="flex items-center gap-2">
            {isRecording && isRecordingNewTask && (
              <span className="text-xs text-[#6b8f71] font-medium animate-pulse">Grabando...</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isRecording && isRecordingNewTask) {
                  stopRecordingNewTask();
                } else {
                  startRecordingForNewTask();
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative bg-[#6b8f71]"
            >
              {isRecording && isRecordingNewTask && (
                <div className="absolute inset-0 rounded-full bg-[#6b8f71] animate-ping opacity-30" />
              )}
              <div className="relative w-5 h-5">
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewTask ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewTask ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            </button>
            
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 max-w-2xl mx-auto">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[#6b8f71] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
            </button>
          ))}
        </div>
        
{/* Hint removed - UI should be self-explanatory */}
      </header>

      {/* Task list */}
      <main className="max-w-2xl mx-auto p-4 space-y-3 pb-20">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map(task => {
            const isSwiping = swipingId === task.id;
            const isSelected = selectedTaskId === task.id;
            const isInlineEditing = inlineEditId === task.id;
            const showComplete = isSwiping && swipeOffset > 30;
            const showDelete = isSwiping && swipeOffset < -30;

            return (
              <motion.div
                key={task.id}
                layout
                layoutId={task.id}
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ 
                  layout: { type: "tween", duration: 0.2, ease: "easeOut" },
                  opacity: { duration: 0.15 }
                }}
                className="relative overflow-hidden rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Swipe backgrounds */}
                {!isSelected && !isInlineEditing && (
                  <div className="absolute inset-0 flex">
                    {/* Complete background - matcha green */}
                    <div className={`flex-1 bg-[#c8d9cb] flex items-center pl-5 transition-opacity ${showComplete ? 'opacity-100' : 'opacity-0'}`}>
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {/* Delete background - burgundy */}
                    <div className={`flex-1 flex items-center justify-end pr-5 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: DELETE_COLOR }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Card */}
                <div
                  style={{
                    transform: isSwiping && !isSelected ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                    transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
                  }}
                  onTouchStart={(e) => handleTouchStart(e, task.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(task)}
                  onClick={() => handleTaskTap(task)}
                  className={`relative p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#6b8f71] ring-2 ring-[#6b8f71]/30 scale-[1.02] bg-white dark:bg-[#2c2c2e]'
                      : task.completed
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-gray-700 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                      }`}
                    >
                      {task.completed && Icons.check}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isInlineEditing ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit();
                            if (e.key === 'Escape') setInlineEditId(null);
                          }}
                          onBlur={saveInlineEdit}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full text-sm bg-transparent border-b-2 border-[#6b8f71] outline-none text-gray-900 dark:text-white py-1"
                        />
                      ) : (
                        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {task.title}
                        </p>
                      )}
                      {task.category && !isInlineEditing && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 mt-1 inline-block">
                          {task.category}
                        </span>
                      )}
                    </div>

                    {/* Voice edit button when selected */}
                    {isSelected && (
                      <VoiceEditButton
                        onTranscript={handleVoiceTranscript}
                        size="md"
                        disabled={isProcessingVoice}
                      />
                    )}
                  </div>

{/* Hint removed - UI should be self-explanatory */}
                  
                  {isProcessingVoice && (
                    <p className="mt-2 text-xs text-[#6b8f71] flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-3 block">✓</span>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'pending' ? 'No hay tareas pendientes' : filter === 'completed' ? 'No hay tareas completadas' : 'No hay tareas'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Usa la vista principal para capturar tareas por voz
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
