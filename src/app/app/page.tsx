'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { InstallPrompt } from '../components/InstallPrompt';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  category?: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
  type?: 'task' | 'idea';
  parent_idea_id?: string;
  order_index?: number;
  voice_context?: string;
}

interface ExtractedTask {
  title: string;
  category: string;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
}

interface ExtractedIdea {
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

interface ActionPoint {
  title: string;
  time_estimate: string;
  category: string;
}

const categories = ['work', 'personal', 'health', 'finance', 'home', 'social', 'learning', 'errands'];

// Category labels for display
const categoryLabels: Record<string, string> = {
  work: 'Work',
  personal: 'Personal', 
  health: 'Health',
  finance: 'Finance',
  home: 'Home',
  social: 'Social',
  learning: 'Learning',
  errands: 'Errands',
};

// Neutral colors for all tasks (no priority coloring)
const priorityColors: Record<string, { bg: string; ring: string; cardBg: string; cardBgDark: string }> = {
  high: { bg: 'bg-white dark:bg-[#2c2c2e]', ring: 'ring-gray-200 dark:ring-gray-700', cardBg: 'bg-white', cardBgDark: 'dark:bg-[#2c2c2e]' },
  medium: { bg: 'bg-white dark:bg-[#2c2c2e]', ring: 'ring-gray-200 dark:ring-gray-700', cardBg: 'bg-white', cardBgDark: 'dark:bg-[#2c2c2e]' },
  low: { bg: 'bg-white dark:bg-[#2c2c2e]', ring: 'ring-gray-200 dark:ring-gray-700', cardBg: 'bg-white', cardBgDark: 'dark:bg-[#2c2c2e]' },
};

// Satisfying "ding" sound using Web Audio API
const playTaskCreatedSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Create a richer, more elegant chime with harmonics
    const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // Elegant two-note chime (like a gentle notification)
    playTone(523.25, now, 0.4, 0.15);        // C5
    playTone(659.25, now + 0.08, 0.35, 0.12); // E5
    playTone(783.99, now + 0.16, 0.3, 0.08);  // G5 - subtle high harmonic
    
  } catch {
    // Silently fail if audio is not supported
  }
};

// Confetti burst for completing tasks
const fireConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#000000', '#636366', '#8e8e93', '#c8d9cb'],
  });
};

export default function AppDashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [extractedIdeas, setExtractedIdeas] = useState<ExtractedIdea[]>([]);
  const [showExtracted, setShowExtracted] = useState(false);
  const [error, setError] = useState('');
  
  // Post-recording mode choice state
  const [showModeChoice, setShowModeChoice] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [structuredText, setStructuredText] = useState('');
  const [showStructured, setShowStructured] = useState(false);
  
  // Calendar action state
  const [calendarLink, setCalendarLink] = useState<string | null>(null);
  const [calendarTaskTitle, setCalendarTaskTitle] = useState('');
  
  // Extracted task editing state
  const [selectedExtractedIndex, setSelectedExtractedIndex] = useState<{type: 'task' | 'idea', index: number} | null>(null);
  const [editingExtractedIndex, setEditingExtractedIndex] = useState<{type: 'task' | 'idea', index: number} | null>(null);
  const extractedLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extractedLastTapRef = useRef<{ type: string; index: number; time: number } | null>(null);
  
  // Action Plan modal state
  const [actionPlanIdea, setActionPlanIdea] = useState<Task | null>(null);
  const [actionPoints, setActionPoints] = useState<ActionPoint[]>([]);
  const [planAnimationKey, setPlanAnimationKey] = useState(0);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  
  // Collapsed ideas state (for toggling action points visibility)
  const [collapsedIdeas, setCollapsedIdeas] = useState<Set<string>>(new Set());
  
  // Inline generation state (which idea is currently generating)
  const [generatingIdeaId, setGeneratingIdeaId] = useState<string | null>(null);
  
  // Debate/Chat state
  const [debateMessages, setDebateMessages] = useState<{role: 'user' | 'assistant'; content: string}[]>([]);
  const [debateInput, setDebateInput] = useState('');
  const [debating, setDebating] = useState(false);
  const debateChatRef = useRef<HTMLDivElement>(null);
  const [debateRecording, setDebateRecording] = useState(false);
  const debateMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const debateChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Inline edit state (in-place editing, no modals)
  const [inlineEdit, setInlineEdit] = useState<{ taskId: string; field: 'title' | 'category' | 'date' } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);
  
  // Voice-first selection state (long-press to select, then mic to edit)
  const [selectedItem, setSelectedItem] = useState<{ type: 'idea' | 'task' | 'action-point'; id: string; index?: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Pending voice edit preview (before confirming)
  const [pendingVoiceEdit, setPendingVoiceEdit] = useState<{
    type: 'action-point' | 'task' | 'idea';
    id: string;
    index?: number;
    originalTitle: string;
    newTitle: string;
    newCategory?: string;
    taskId?: string; // For action-point, the actual task id to update
  } | null>(null);
  
  // Dark mode state with wave transition
  const [darkMode, setDarkMode] = useState(false);
  const [themeTransition, setThemeTransition] = useState<'idle' | 'expanding' | 'collapsing'>('idle');
  
  // Animated theme toggle
  const toggleThemeWithAnimation = () => {
    const newDarkMode = !darkMode;
    setThemeTransition('expanding');
    
    // Change theme at midpoint of animation (1s total)
    setTimeout(() => {
      setDarkMode(newDarkMode);
    }, 500);
    
    // Reset transition state after animation
    setTimeout(() => {
      setThemeTransition('idle');
    }, 1000);
  };
  
  // Stats visibility
  const [showStats, setShowStats] = useState(true);
  
  // Swipe state
  const [swipingTaskId, setSwipingTaskId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  
  // Double tap detection
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_DELAY = 300; // ms

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
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

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('taskflow-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
    }
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taskflow-darkmode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taskflow-darkmode', 'false');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Start live transcription
  const startLiveTranscription = () => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES'; // Default to Spanish, will auto-detect

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      setLiveTranscript(final || interim);
    };

    recognition.onerror = () => {
      // Silently handle errors
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Already started or not supported
    }
  };

  const stopLiveTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setLiveTranscript('');
    setExtractedTasks([]);
    setShowExtracted(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        stopLiveTranscription();
        processAudio();
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      startLiveTranscription();
      
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setError('Acceso al micrófono denegado. Por favor, permite el acceso e inténtalo de nuevo.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processAudio = async () => {
    setProcessing(true);
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    setProcessingStep('Transcribiendo...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errData = await transcribeRes.json().catch(() => ({}));
        throw new Error(`Transcription failed: ${errData.details || errData.error || transcribeRes.status}`);
      }
      const { text } = await transcribeRes.json();
      setTranscript(text);

      // Check if we have a selected item for voice editing
      if (selectedItem) {
        console.log('[Voice Edit] selectedItem:', selectedItem);
        setProcessingStep('Editando...');
        await processVoiceEdit(text);
        setProcessing(false);
        setProcessingStep('');
        return;
      }
      
      // Check if we have a selected extracted task for voice editing
      if (selectedExtractedIndex) {
        setProcessingStep('Editando...');
        await processExtractedVoiceEdit(text);
        setProcessing(false);
        setProcessingStep('');
        return;
      }

      // Show mode choice: Extract tasks OR Structure text
      setPendingTranscript(text);
      setShowModeChoice(true);
      setProcessingStep('');
      setProcessing(false);
    } catch (err: any) {
      console.error('Audio processing error:', err);
      setError(err?.message || 'Error al procesar el audio. Inténtalo de nuevo.');
      setProcessing(false);
    }
  };

  // Process as tasks/ideas extraction
  const processAsExtract = async () => {
    if (!pendingTranscript) return;
    
    setShowModeChoice(false);
    setProcessing(true);
    setProcessingStep('Extrayendo tareas...');

    try {
      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pendingTranscript }),
      });

      if (!extractRes.ok) {
        const errData = await extractRes.json().catch(() => ({}));
        throw new Error(`Extraction failed: ${errData.error || extractRes.status}`);
      }
      const { tasks: extractedTasksResult, ideas: extractedIdeasResult } = await extractRes.json();

      if ((!extractedTasksResult || extractedTasksResult.length === 0) && 
          (!extractedIdeasResult || extractedIdeasResult.length === 0)) {
        setError('No se encontraron tareas ni ideas. Intenta ser más específico.');
        setProcessing(false);
        setProcessingStep('');
        setPendingTranscript('');
        return;
      }

      setExtractedTasks(extractedTasksResult || []);
      setExtractedIdeas(extractedIdeasResult || []);
      setShowExtracted(true);
      setPendingTranscript('');
    } catch (err: any) {
      console.error('Extract error:', err);
      setError(err?.message || 'Error al extraer tareas.');
    }
    setProcessing(false);
    setProcessingStep('');
  };

  // Process as structured text
  const processAsStructure = async () => {
    if (!pendingTranscript) return;
    
    setShowModeChoice(false);
    setProcessing(true);
    setProcessingStep('Estructurando...');

    try {
      const structureRes = await fetch('/api/structure-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pendingTranscript }),
      });

      if (!structureRes.ok) {
        throw new Error('Failed to structure text');
      }
      const { structured } = await structureRes.json();

      setStructuredText(structured);
      setShowStructured(true);
      setPendingTranscript('');
    } catch (err: any) {
      console.error('Structure error:', err);
      setError('Error al estructurar el texto.');
    }
    setProcessing(false);
    setProcessingStep('');
  };

  // Copy structured text to clipboard
  const copyStructuredText = async () => {
    try {
      await navigator.clipboard.writeText(structuredText);
      // Brief visual feedback could be added here
    } catch {
      setError('No se pudo copiar al portapapeles');
    }
  };

  // Process voice edit for selected items
  const processVoiceEdit = async (voiceInput: string) => {
    if (!selectedItem) return;

    try {
      let context: Record<string, unknown> = {};

      switch (selectedItem.type) {
        case 'idea': {
          // Find the idea and its current plan
          const idea = tasks.find(t => t.id === selectedItem.id);
          if (!idea) return;
          
          // Get children tasks (action points) for this idea
          const childTasks = tasks.filter(t => t.parent_idea_id === selectedItem.id);
          context = {
            ideaTitle: idea.title,
            currentPlan: childTasks.map(t => ({
              title: t.title,
              time_estimate: '30min',
              category: t.category || 'work'
            }))
          };
          break;
        }
        case 'action-point': {
          // Find the parent idea and the specific step
          const parentIdea = tasks.find(t => t.id === selectedItem.id);
          const childTasks = tasks.filter(t => t.parent_idea_id === selectedItem.id)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
          const step = childTasks[selectedItem.index || 0];
          console.log('[Voice Edit] action-point context:', { parentIdea: parentIdea?.title, childTasks: childTasks.length, step: step?.title, index: selectedItem.index });
          if (!parentIdea || !step) {
            console.log('[Voice Edit] EARLY RETURN - parentIdea or step missing');
            return;
          }
          
          context = {
            ideaTitle: parentIdea.title,
            stepTitle: step.title,
            stepIndex: selectedItem.index || 0,
            totalSteps: childTasks.length
          };
          break;
        }
        case 'task': {
          const task = tasks.find(t => t.id === selectedItem.id);
          if (!task) return;
          
          context = {
            taskTitle: task.title,
            category: task.category || 'personal'
          };
          break;
        }
      }

      const res = await fetch('/api/voice-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editType: selectedItem.type,
          voiceInput,
          context
        }),
      });

      if (!res.ok) throw new Error('Voice edit failed');
      const { editType, intent, result } = await res.json();
      console.log('[Voice Edit] API response:', { editType, intent, result });

      // Handle different intents for tasks
      if (editType === 'task' && intent) {
        const task = tasks.find(t => t.id === selectedItem.id);
        
        switch (intent) {
          case 'calendar':
            // Show calendar link to user
            if (result.calendarLink) {
              setCalendarLink(result.calendarLink);
              setCalendarTaskTitle(task?.title || '');
              setSelectedItem(null);
              playTaskCreatedSound();
            }
            break;
            
          case 'complete':
            await supabase.from('tasks').update({ completed: true }).eq('id', selectedItem.id);
            fireConfetti();
            break;
            
          case 'delete':
            await supabase.from('tasks').delete().eq('id', selectedItem.id);
            break;
            
          case 'priority':
            if (result.level) {
              await supabase.from('tasks').update({ priority: result.level }).eq('id', selectedItem.id);
            }
            break;
            
          case 'edit':
          default:
            // Update task with provided fields
            const updateData: Record<string, any> = {};
            if (result.title) updateData.title = result.title;
            if (result.category) updateData.category = result.category;
            if (result.due_date !== undefined) updateData.due_date = result.due_date;
            if (result.priority) updateData.priority = result.priority;
            
            if (Object.keys(updateData).length > 0) {
              await supabase.from('tasks').update(updateData).eq('id', selectedItem.id);
            }
            break;
        }
      } else {
        // Handle idea and action-point edits (existing logic)
        switch (editType) {
          case 'idea': {
            // Delete old child tasks and create new ones
            const oldChildren = tasks.filter(t => t.parent_idea_id === selectedItem.id);
            for (const child of oldChildren) {
              await supabase.from('tasks').delete().eq('id', child.id);
            }
            
            // Insert new action points
            const actionPoints = result.action_points || result;
            if (actionPoints && Array.isArray(actionPoints) && user) {
              const rows = actionPoints.map((point: ActionPoint, index: number) => ({
                user_id: user.id,
                title: point.title,
                category: point.category,
                due_date: null,
                priority: 'medium' as const,
                completed: false,
                type: 'task',
                parent_idea_id: selectedItem.id,
                order_index: index,
              }));
              await supabase.from('tasks').insert(rows);
            }
            playTaskCreatedSound();
            break;
          }
          case 'action-point': {
            // Show preview instead of directly updating
            const childTasks = tasks.filter(t => t.parent_idea_id === selectedItem.id)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            const taskToUpdate = childTasks[selectedItem.index || 0];
            // Handle both 'title' and 'new_step' from Gemini response
            const newTitle = result.title || result.new_step;
            console.log('[Voice Edit] action-point result handler:', { taskToUpdate: taskToUpdate?.title, newTitle, resultCategory: result.category });
            if (taskToUpdate && newTitle) {
              console.log('[Voice Edit] Setting pendingVoiceEdit');
              setPendingVoiceEdit({
                type: 'action-point',
                id: selectedItem.id,
                index: selectedItem.index,
                originalTitle: taskToUpdate.title,
                newTitle: newTitle,
                newCategory: result.category,
                taskId: taskToUpdate.id,
              });
              // Don't clear selection yet - keep it for visual context
              return; // Exit early - don't refresh/clear until confirmed
            } else {
              console.log('[Voice Edit] NOT setting pendingVoiceEdit - missing taskToUpdate or newTitle');
            }
            break;
          }
        }
      }

      // Refresh tasks and clear selection
      await fetchTasks();
      setSelectedItem(null);
      setTranscript('');

    } catch (err) {
      console.error('Voice edit error:', err);
      setError('Error al editar. Inténtalo de nuevo.');
    }
  };

  const saveAllItems = async () => {
    if (!user) return;

    // Save tasks
    const taskRows = extractedTasks.map((task) => ({
      user_id: user.id,
      title: task.title,
      category: task.category,
      due_date: task.due_date,
      priority: task.priority,
      completed: false,
      type: 'task',
    }));

    // Save ideas (with voice context for AI plan generation)
    const ideaRows = extractedIdeas.map((idea) => ({
      user_id: user.id,
      title: idea.title,
      category: idea.category,
      due_date: null,
      priority: idea.priority,
      completed: false,
      type: 'idea',
      voice_context: transcript || null,
    }));

    const allRows = [...taskRows, ...ideaRows];
    
    if (allRows.length === 0) return;

    const { error } = await supabase.from('tasks').insert(allRows);

    if (error) {
      setError('Error al guardar. Inténtalo de nuevo.');
      return;
    }

    playTaskCreatedSound();
    setShowExtracted(false);
    setExtractedTasks([]);
    setExtractedIdeas([]);
    setTranscript('');
    setLiveTranscript('');
    await fetchTasks();
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !completed })
      .eq('id', id);

    if (!error) {
      if (!completed) {
        fireConfetti();
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    }
  };

  // Cycle priority: high (red) → medium (yellow) → low (green) → high
  const cyclePriority = async (id: string, currentPriority: string) => {
    const cycle: Record<string, 'high' | 'medium' | 'low'> = {
      high: 'medium',
      medium: 'low',
      low: 'high',
    };
    const newPriority = cycle[currentPriority] || 'high';

    const { error } = await supabase
      .from('tasks')
      .update({ priority: newPriority })
      .eq('id', id);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, priority: newPriority } : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Delete idea and all its child tasks
  const deleteIdea = async (id: string) => {
    // First delete all child tasks
    await supabase.from('tasks').delete().eq('parent_idea_id', id);
    // Then delete the idea itself
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id && t.parent_idea_id !== id));
    }
  };

  // Inline edit functions (in-place, no modals)
  const startInlineEdit = (task: Task, field: 'title' | 'category' | 'date') => {
    const value = field === 'title' ? task.title : 
                  field === 'category' ? (task.category || 'personal') : 
                  (task.due_date || '');
    setInlineEdit({ taskId: task.id, field });
    setInlineEditValue(value);
    // Auto-focus happens via useEffect
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
    setInlineEditValue('');
  };

  const saveInlineEdit = async (taskId: string, field: 'title' | 'category' | 'date', value: string) => {
    const updateData: Partial<Task> = {};
    if (field === 'title') updateData.title = value;
    if (field === 'category') updateData.category = value;
    if (field === 'date') updateData.due_date = value || undefined;

    const { error } = await supabase
      .from('tasks')
      .update(field === 'date' ? { due_date: value || null } : updateData)
      .eq('id', taskId);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, ...updateData } : t
        )
      );
    }
    cancelInlineEdit();
  };

  // Auto-focus inline input when editing title
  useEffect(() => {
    if (inlineEdit?.field === 'title' && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineEdit]);

  // Handle tap: single tap = voice select, double tap = inline edit
  const handleItemTap = (task: Task, type: 'idea' | 'task' | 'action-point', index?: number) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;
    
    if (lastTap && lastTap.id === task.id && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
      // Double tap → inline edit with keyboard
      lastTapRef.current = null;
      startInlineEdit(task, 'title');
    } else {
      // Single tap → select for voice editing
      lastTapRef.current = { id: task.id, time: now };
      // Delay to wait for potential double tap
      setTimeout(() => {
        if (lastTapRef.current?.id === task.id && lastTapRef.current?.time === now) {
          // Still single tap after delay → select for voice
          setSelectedItem({ type, id: task.id, index });
          lastTapRef.current = null;
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Action Plan functions
  // Inline action plan generation (no modal)
  const generateActionPlanInline = async (idea: Task) => {
    if (!user) return;
    
    setGeneratingIdeaId(idea.id);
    // Expand the idea if collapsed
    setCollapsedIdeas(prev => {
      const newSet = new Set(prev);
      newSet.delete(idea.id);
      return newSet;
    });

    try {
      // Delete existing child tasks first
      const oldChildren = tasks.filter(t => t.parent_idea_id === idea.id);
      for (const child of oldChildren) {
        await supabase.from('tasks').delete().eq('id', child.id);
      }

      // Generate new action plan (using voice context as primary input)
      const res = await fetch('/api/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.title, voiceContext: idea.voice_context }),
      });

      if (!res.ok) throw new Error('Failed to generate plan');
      const { action_points } = await res.json();
      
      if (action_points && action_points.length > 0) {
        // Save new action points as child tasks
        const rows = action_points.map((point: ActionPoint, index: number) => ({
          user_id: user.id,
          title: point.title,
          category: point.category,
          due_date: null,
          priority: 'medium' as const,
          completed: false,
          type: 'task',
          parent_idea_id: idea.id,
          order_index: index,
        }));
        
        await supabase.from('tasks').insert(rows);
        playTaskCreatedSound();
      }
      
      await fetchTasks();
    } catch {
      setError('Error al generar el plan. Inténtalo de nuevo.');
    }
    setGeneratingIdeaId(null);
  };

  // Legacy modal function (keeping for now but unused)
  const generateActionPlan = async (idea: Task) => {
    setActionPlanIdea(idea);
    setGeneratingPlan(true);
    setActionPoints([]);
    setPlanAnimationKey(0); // Reset animation

    try {
      const res = await fetch('/api/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.title, voiceContext: idea.voice_context }),
      });

      if (!res.ok) throw new Error('Failed to generate plan');
      const { action_points } = await res.json();
      setActionPoints(action_points || []);
    } catch {
      setError('Error al generar el plan. Inténtalo de nuevo.');
      setActionPlanIdea(null);
    }
    setGeneratingPlan(false);
  };

  const deployActionPlan = async () => {
    if (!user || !actionPlanIdea || actionPoints.length === 0) return;

    // Convert action points to tasks linked to parent idea
    const rows = actionPoints.map((point, index) => ({
      user_id: user.id,
      title: point.title,
      category: point.category,
      due_date: null,
      priority: 'medium' as const,
      completed: false,
      type: 'task',
      parent_idea_id: actionPlanIdea.id,
      order_index: index,
    }));

    const { error } = await supabase.from('tasks').insert(rows);

    if (error) {
      setError('Error al crear las tareas.');
      return;
    }

    // Keep idea active (not completed) - it's the parent of the chain
    // await supabase.from('tasks').update({ completed: true }).eq('id', actionPlanIdea.id);

    playTaskCreatedSound();
    setActionPlanIdea(null);
    setActionPoints([]);
    setDebateMessages([]);
    await fetchTasks();
  };

  const closeActionPlanModal = () => {
    setActionPlanIdea(null);
    setActionPoints([]);
    setDebateMessages([]);
    setDebateInput('');
  };

  const sendDebateMessage = async () => {
    if (!debateInput.trim() || !actionPlanIdea || debating) return;

    const userMessage = debateInput.trim();
    setDebateInput('');
    setDebating(true);

    // Add user message to chat
    const newMessages = [...debateMessages, { role: 'user' as const, content: userMessage }];
    setDebateMessages(newMessages);

    try {
      const res = await fetch('/api/debate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: actionPlanIdea.title,
          currentPlan: actionPoints,
          messages: debateMessages,
          userMessage,
        }),
      });

      if (!res.ok) throw new Error('Failed to debate');
      const { response, action_points, plan_changed } = await res.json();

      // Add assistant response
      setDebateMessages([...newMessages, { role: 'assistant', content: response }]);

      // Update plan if changed - trigger re-animation
      if (plan_changed && action_points) {
        setActionPoints(action_points);
        setPlanAnimationKey(k => k + 1);
      }

      // Scroll to bottom of chat
      setTimeout(() => {
        debateChatRef.current?.scrollTo({ top: debateChatRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch {
      setDebateMessages([...newMessages, { role: 'assistant', content: 'Error al procesar. Intenta de nuevo.' }]);
    }
    setDebating(false);
  };

  const startDebateRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      debateChunksRef.current = [];
      debateMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          debateChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        // Transcribe and send
        const audioBlob = new Blob(debateChunksRef.current, { type: 'audio/webm' });
        setDebating(true);
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (transcribeRes.ok) {
            const { text } = await transcribeRes.json();
            if (text && actionPlanIdea) {
              // Add user message and send directly
              const newMessages = [...debateMessages, { role: 'user' as const, content: text }];
              setDebateMessages(newMessages);
              
              // Call debate API
              const res = await fetch('/api/debate-idea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  idea: actionPlanIdea.title,
                  currentPlan: actionPoints,
                  messages: debateMessages,
                  userMessage: text,
                }),
              });
              
              if (res.ok) {
                const { response, action_points, plan_changed } = await res.json();
                setDebateMessages([...newMessages, { role: 'assistant', content: response }]);
                if (plan_changed && action_points) {
                  setActionPoints(action_points);
                  setPlanAnimationKey(k => k + 1);
                }
              }
            }
          }
        } catch {
          setError('Error al transcribir');
        }
        setDebating(false);
      };

      mediaRecorder.start(250);
      setDebateRecording(true);
    } catch {
      setError('No se pudo acceder al micrófono');
    }
  };

  const stopDebateRecording = () => {
    if (debateMediaRecorderRef.current && debateMediaRecorderRef.current.state !== 'inactive') {
      debateMediaRecorderRef.current.stop();
    }
    setDebateRecording(false);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (actionPlanIdea) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [actionPlanIdea]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, taskId: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingTaskId(taskId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingTaskId) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    
    // If significant horizontal movement, cancel long press (it's a swipe)
    if (Math.abs(diff) > 15 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    setSwipeOffset(diff);
  };

  const handleTouchEnd = (task: Task) => {
    if (swipeOffset > 100) {
      // Swipe right - complete
      toggleTask(task.id, task.completed);
    } else if (swipeOffset < -100) {
      // Swipe left - delete
      deleteTask(task.id);
    }
    setSwipingTaskId(null);
    setSwipeOffset(0);
  };

  // Long-press handlers for voice-first editing
  const handleLongPressStart = (type: 'idea' | 'task' | 'action-point', id: string, index?: number) => {
    longPressTimer.current = setTimeout(() => {
      // Cancel any swipe in progress
      setSwipingTaskId(null);
      setSwipeOffset(0);
      
      setSelectedItem({ type, id, index });
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
      // Don't auto-start recording - user taps the mic icon to start
    }, 500); // 500ms for long press
  };
  
  // Start voice edit recording (called when user taps the mic icon on selected item)
  const startVoiceEditRecording = async () => {
    if (!selectedItem && !selectedExtractedIndex) return;
    await startRecording();
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setSelectedExtractedIndex(null);
    setPendingVoiceEdit(null);
  };

  // Confirm pending voice edit
  const confirmVoiceEdit = async () => {
    if (!pendingVoiceEdit) return;
    
    try {
      if (pendingVoiceEdit.type === 'action-point' && pendingVoiceEdit.taskId) {
        await supabase.from('tasks').update({
          title: pendingVoiceEdit.newTitle,
          ...(pendingVoiceEdit.newCategory && { category: pendingVoiceEdit.newCategory }),
        }).eq('id', pendingVoiceEdit.taskId);
        
        playTaskCreatedSound();
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error confirming voice edit:', err);
      setError('Error al guardar. Inténtalo de nuevo.');
    }
    
    setPendingVoiceEdit(null);
    setSelectedItem(null);
    setTranscript('');
  };

  // Cancel pending voice edit
  const cancelVoiceEdit = () => {
    setPendingVoiceEdit(null);
    // Keep selection so user can try again
  };

  // Long-press handlers for extracted tasks (before saving)
  const handleExtractedLongPressStart = (type: 'task' | 'idea', index: number) => {
    extractedLongPressTimer.current = setTimeout(() => {
      setSelectedExtractedIndex({ type, index });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleExtractedLongPressEnd = () => {
    if (extractedLongPressTimer.current) {
      clearTimeout(extractedLongPressTimer.current);
      extractedLongPressTimer.current = null;
    }
  };

  // Handle tap on extracted task: single = voice select, double = inline edit
  const handleExtractedTap = (type: 'task' | 'idea', index: number) => {
    const now = Date.now();
    const lastTap = extractedLastTapRef.current;
    
    if (lastTap && lastTap.type === type && lastTap.index === index && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
      // Double tap → inline edit
      extractedLastTapRef.current = null;
      setEditingExtractedIndex({ type, index });
    } else {
      // Single tap → select for voice
      extractedLastTapRef.current = { type, index, time: now };
      setTimeout(() => {
        if (extractedLastTapRef.current?.type === type && 
            extractedLastTapRef.current?.index === index && 
            extractedLastTapRef.current?.time === now) {
          setSelectedExtractedIndex({ type, index });
          extractedLastTapRef.current = null;
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Voice edit for extracted tasks
  const startExtractedVoiceEdit = async () => {
    if (!selectedExtractedIndex) return;
    await startRecording();
  };

  // Process voice edit for extracted tasks
  const processExtractedVoiceEdit = async (voiceInput: string) => {
    if (!selectedExtractedIndex) return;
    
    const { type, index } = selectedExtractedIndex;
    const item = type === 'task' ? extractedTasks[index] : extractedIdeas[index];
    
    try {
      const res = await fetch('/api/voice-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editType: 'task',
          voiceInput,
          context: { taskTitle: item.title, category: item.category }
        }),
      });

      if (!res.ok) throw new Error('Voice edit failed');
      const { intent, result } = await res.json();
      
      if (intent === 'edit' && result.title) {
        if (type === 'task') {
          const newTasks = [...extractedTasks];
          newTasks[index] = { ...newTasks[index], title: result.title, category: result.category || newTasks[index].category };
          setExtractedTasks(newTasks);
        } else {
          const newIdeas = [...extractedIdeas];
          newIdeas[index] = { ...newIdeas[index], title: result.title, category: result.category || newIdeas[index].category };
          setExtractedIdeas(newIdeas);
        }
      } else if (intent === 'delete') {
        if (type === 'task') {
          setExtractedTasks(prev => prev.filter((_, i) => i !== index));
        } else {
          setExtractedIdeas(prev => prev.filter((_, i) => i !== index));
        }
      }
      
      setSelectedExtractedIndex(null);
    } catch (err) {
      console.error('Voice edit error:', err);
      setError('Error al editar. Inténtalo de nuevo.');
    }
  };

  const removeExtractedTask = (index: number) => {
    setExtractedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#1c1c1e] flex items-center justify-center transition-colors">
        <div className="w-10 h-10 border-3 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Calculate weekly stats
  const getWeeklyStats = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekTasks = tasks.filter(t => new Date(t.created_at) >= startOfWeek);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    const weekTotal = weekTasks.length;
    
    // Dominant priority from pending tasks
    const priorityCount: Record<string, number> = { high: 0, medium: 0, low: 0 };
    pendingTasks.forEach(t => {
      const p = t.priority || 'medium';
      priorityCount[p]++;
    });
    const dominantPriority = Object.entries(priorityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium';
    
    return { weekCompleted, weekTotal, dominantPriority };
  };
  
  const stats = getWeeklyStats();

  return (
    <main className={`min-h-screen flex flex-col pb-8 transition-colors duration-500 ${
      recording 
        ? 'animate-gradient-mesh' 
        : 'bg-white dark:bg-[#1c1c1e]'
    }`}>
      {/* Theme transition wave overlay */}
      {themeTransition !== 'idle' && (
        <div 
          className={`theme-transition-overlay ${
            themeTransition === 'expanding' ? 'theme-transition-expand' : 'theme-transition-collapse'
          } ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
        />
      )}
      
      {/* Header - minimal & seamless */}
      <header className={`px-5 pt-4 pb-2 sticky top-0 z-40 transition-colors duration-500 ${
        recording
          ? 'bg-transparent'
          : 'bg-gradient-to-b from-gray-50 via-gray-50 to-transparent dark:from-[#1c1c1e] dark:via-[#1c1c1e] dark:to-[#1c1c1e]/0'
      }`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">
            taskflow
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleThemeWithAnimation}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-4">
        {/* Hero Record Button with Progress Ring - scrolls with content */}
        <div className="flex flex-col items-center py-4 mb-4">
          {(() => {
            const progressColors = {
              high: { start: '#ef4444', end: '#f87171' },
              medium: { start: '#f59e0b', end: '#fbbf24' },
              low: { start: '#000000', end: '#636366' },
            };
            const colors = progressColors[stats.dominantPriority as keyof typeof progressColors] || progressColors.low;
            const progress = stats.weekTotal > 0 ? (stats.weekCompleted / stats.weekTotal) : 0;
            const showProgress = tasks.length > 0 && showStats && !recording && !processing && !selectedItem;
            const hasSelection = !!selectedItem || !!selectedExtractedIndex;
            
            return (
              <div className="relative">
                {/* Selection indicator ring */}
                {hasSelection && !recording && !processing && (
                  <div className="absolute inset-[-8px] rounded-full border-3 border-black dark:border-white animate-pulse" />
                )}
                
                {/* Recording pulse rings */}
                {recording && (
                  <>
                    <div className="absolute inset-[-12px] rounded-full border-2 border-black dark:border-white/30 animate-ping" />
                    <div className="absolute inset-[-6px] rounded-full border-2 border-black dark:border-white/50 animate-pulse" />
                  </>
                )}
                
                {/* Processing - animated gradient with orbiting circles */}
                {processing && (
                  <>
                    {/* Gradient glow background */}
                    <div className="absolute inset-[-20px] rounded-full animate-gradient-flow opacity-60 blur-xl" />
                    
                    {/* Orbiting circles - monochrome */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="absolute w-3 h-3 rounded-full bg-black/40 dark:bg-white/40 animate-orbit" style={{ animationDuration: '3s' }} />
                      <div className="absolute w-2 h-2 rounded-full bg-black/30 dark:bg-white/30 animate-orbit" style={{ animationDuration: '4s', animationDelay: '-1s' }} />
                      <div className="absolute w-2.5 h-2.5 rounded-full bg-black/20 dark:bg-white/20 animate-orbit" style={{ animationDuration: '5s', animationDelay: '-2s' }} />
                    </div>
                    
                    {/* Subtle spinner ring */}
                    <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2" className="text-black/10 dark:text-white/10" />
                      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="80 295" className="text-black dark:text-white" />
                    </svg>
                  </>
                )}
                
                {/* Main button - Apple style black - DISABLED when step is selected */}
                <button
                  onClick={recording && !hasSelection ? stopRecording : (!hasSelection ? startRecording : undefined)}
                  disabled={processing || hasSelection}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 overflow-hidden ${
                    recording && !hasSelection
                      ? 'bg-black dark:bg-white shadow-[0_8px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_40px_rgba(255,255,255,0.3)] scale-110' 
                      : hasSelection
                        ? 'bg-black/30 dark:bg-white/30 cursor-not-allowed'
                        : 'bg-black dark:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] hover:scale-105'
                  }`}
                >
                  {recording && !hasSelection ? (
                    // Recording: show timer and stop icon
                    <div className="flex flex-col items-center">
                      <span className="text-white dark:text-black text-xl font-light tabular-nums">{formatTime(recordingTime)}</span>
                      <div className="w-4 h-4 bg-white dark:bg-black rounded-sm mt-1" />
                      {/* Brain Dump indicator appears after 30s */}
                      {recordingTime >= 30 && (
                        <span className="absolute -bottom-8 text-xs text-black dark:text-white font-medium animate-fade-in whitespace-nowrap">
                          Brain Dump Mode
                        </span>
                      )}
                    </div>
                  ) : processing && !hasSelection ? (
                    // Processing: animated gradient button
                    <div className="absolute inset-0 rounded-full animate-gradient-flow animate-gradient-pulse" />
                  ) : hasSelection ? (
                    // Selection mode: dimmed mic icon - inactive
                    <svg className="w-10 h-10 text-black/50 dark:text-white/50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  ) : (
                    // Just mic icon - clean and simple
                    <svg className="w-10 h-10 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </button>
              </div>
            );
          })()}
          
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-white dark:bg-[#2c2c2e] border-2 border-black dark:border-white text-black dark:text-white text-sm flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white font-bold">×</button>
          </div>
        )}

        {/* Calendar action result */}
        {calendarLink && (
          <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#38383a] animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-black dark:text-white">Añadir al calendario</h3>
              <button
                onClick={() => { setCalendarLink(null); setCalendarTaskTitle(''); }}
                className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              "{calendarTaskTitle}"
            </p>
            <a
              href={calendarLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-medium text-white bg-black dark:bg-white dark:text-black hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Abrir Google Calendar
            </a>
          </div>
        )}

        {/* Mode choice after recording */}
        {showModeChoice && (
          <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#38383a] animate-fade-in relative z-40">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
              "{pendingTranscript}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={processAsExtract}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-black dark:bg-white dark:text-black hover:opacity-90 transition-all"
              >
                Extraer tareas
              </button>
              <button
                onClick={processAsStructure}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-black dark:text-white bg-gray-200 dark:bg-[#48484a] hover:bg-gray-300 dark:hover:bg-[#58585a] transition-all border border-gray-300 dark:border-[#58585a]"
              >
                Estructurar
              </button>
            </div>
          </div>
        )}

        {/* Structured text result */}
        {showStructured && structuredText && (
          <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#38383a] animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-black dark:text-white">Texto estructurado</h3>
              <button
                onClick={() => { setShowStructured(false); setStructuredText(''); }}
                className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none mb-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed max-h-80 overflow-y-auto">
              {structuredText}
            </div>
            <button
              onClick={copyStructuredText}
              className="w-full py-3 rounded-xl font-medium text-white bg-black dark:bg-white dark:text-black hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar
            </button>
          </div>
        )}

        {/* Extracted tasks and ideas confirmation */}
        {showExtracted && (extractedTasks.length > 0 || extractedIdeas.length > 0) && (
          <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#38383a] animate-fade-in relative z-40">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {extractedTasks.length > 0 && `${extractedTasks.length} tarea${extractedTasks.length > 1 ? 's' : ''}`}
              {extractedTasks.length > 0 && extractedIdeas.length > 0 && ' + '}
              {extractedIdeas.length > 0 && `${extractedIdeas.length} idea${extractedIdeas.length > 1 ? 's' : ''}`}
            </h3>
            <ul className="space-y-2 mb-5">
              {/* Tasks - with long press and double tap */}
              {extractedTasks.map((task, i) => {
                const isSelected = selectedExtractedIndex?.type === 'task' && selectedExtractedIndex?.index === i;
                const isEditing = editingExtractedIndex?.type === 'task' && editingExtractedIndex?.index === i;
                
                return (
                  <li 
                    key={`task-${i}`} 
                    className={`py-3 px-4 flex items-center gap-3 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-gray-200 dark:bg-[#38383a] ring-2 ring-black dark:ring-white' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                    onTouchStart={() => handleExtractedLongPressStart('task', i)}
                    onTouchEnd={handleExtractedLongPressEnd}
                    onTouchCancel={handleExtractedLongPressEnd}
                    onMouseDown={() => handleExtractedLongPressStart('task', i)}
                    onMouseUp={handleExtractedLongPressEnd}
                    onMouseLeave={handleExtractedLongPressEnd}
                    onClick={() => !isEditing && handleExtractedTap('task', i)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-black dark:bg-white' 
                        : 'bg-gray-200 dark:bg-[#38383a]'
                    }`}>
                      {isSelected ? (
                        <svg className="w-5 h-5 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{(task.category || 'T').slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={task.title}
                          autoFocus
                          onChange={(e) => {
                            const newTasks = [...extractedTasks];
                            newTasks[i] = { ...newTasks[i], title: e.target.value };
                            setExtractedTasks(newTasks);
                          }}
                          onBlur={() => setEditingExtractedIndex(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingExtractedIndex(null)}
                          className="font-medium text-gray-900 dark:text-white bg-transparent w-full outline-none border-b-2 border-black dark:border-white"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {task.due_date ? formatDueDate(task.due_date) : 'Sin fecha'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeExtractedTask(i); }}
                      className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
              {/* Ideas - with long press and double tap */}
              {extractedIdeas.map((idea, i) => {
                const isSelected = selectedExtractedIndex?.type === 'idea' && selectedExtractedIndex?.index === i;
                const isEditing = editingExtractedIndex?.type === 'idea' && editingExtractedIndex?.index === i;
                
                return (
                  <li 
                    key={`idea-${i}`} 
                    className={`py-3 px-4 flex items-center gap-3 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-gray-200 dark:bg-[#38383a] ring-2 ring-black dark:ring-white' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                    onTouchStart={() => handleExtractedLongPressStart('idea', i)}
                    onTouchEnd={handleExtractedLongPressEnd}
                    onTouchCancel={handleExtractedLongPressEnd}
                    onMouseDown={() => handleExtractedLongPressStart('idea', i)}
                    onMouseUp={handleExtractedLongPressEnd}
                    onMouseLeave={handleExtractedLongPressEnd}
                    onClick={() => !isEditing && handleExtractedTap('idea', i)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-black dark:bg-white' 
                        : 'bg-gray-300 dark:bg-[#48484a]'
                    }`}>
                      {isSelected ? (
                        <svg className="w-5 h-5 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">💡</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={idea.title}
                          autoFocus
                          onChange={(e) => {
                            const newIdeas = [...extractedIdeas];
                            newIdeas[i] = { ...newIdeas[i], title: e.target.value };
                            setExtractedIdeas(newIdeas);
                          }}
                          onBlur={() => setEditingExtractedIndex(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingExtractedIndex(null)}
                          className="font-medium text-gray-900 dark:text-white bg-transparent w-full outline-none border-b-2 border-black dark:border-white"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white">{idea.title}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">Idea</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExtractedIdeas(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={saveAllItems}
                className="flex-1 py-3 rounded-xl font-semibold bg-black hover:bg-gray-800 active:bg-gray-900 transition-all text-white"
              >
                Guardar Todo
              </button>
              <button
                onClick={() => { setShowExtracted(false); setExtractedTasks([]); setExtractedIdeas([]); }}
                className="px-6 py-3 rounded-xl font-medium text-black dark:text-white bg-gray-200 dark:bg-[#48484a] hover:bg-gray-300 dark:hover:bg-[#58585a] transition-all border border-gray-300 dark:border-[#58585a]"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Unified list - Tasks and Ideas with Tree View */}
        <div className="space-y-4">
          {(() => {
            // Separate ideas, child tasks, and standalone tasks
            const ideas = pendingTasks.filter(t => t.type === 'idea');
            const childTasks = pendingTasks.filter(t => t.parent_idea_id);
            const standaloneTasks = pendingTasks.filter(t => t.type !== 'idea' && !t.parent_idea_id);
            
            // Group child tasks by parent idea
            const childrenByIdea: Record<string, Task[]> = {};
            childTasks.forEach(task => {
              if (task.parent_idea_id) {
                if (!childrenByIdea[task.parent_idea_id]) {
                  childrenByIdea[task.parent_idea_id] = [];
                }
                childrenByIdea[task.parent_idea_id].push(task);
              }
            });
            
            // Sort children by order_index
            Object.keys(childrenByIdea).forEach(ideaId => {
              childrenByIdea[ideaId].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            });

            return (
              <>
                {/* Ideas with their child tasks (tree view) */}
                {ideas.map((idea) => {
                  const children = childrenByIdea[idea.id] || [];
                  const hasChildren = children.length > 0;
                  const completedChildren = children.filter(c => c.completed).length;
                  const isIdeaSelected = selectedItem?.type === 'idea' && selectedItem?.id === idea.id;
                  const isCollapsed = collapsedIdeas.has(idea.id);
                  const isGenerating = generatingIdeaId === idea.id;
                  
                  const toggleCollapse = () => {
                    if (isGenerating) return;
                    setCollapsedIdeas(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(idea.id)) {
                        newSet.delete(idea.id);
                      } else {
                        newSet.add(idea.id);
                      }
                      return newSet;
                    });
                  };
                  
                  const isIdeaSwiping = swipingTaskId === idea.id;
                  const showIdeaDelete = isIdeaSwiping && swipeOffset < -50;
                  
                  return (
                    <div key={idea.id} className="relative mb-2 overflow-hidden rounded-2xl">
                      {/* Swipe background - delete */}
                      {!isIdeaSelected && (
                        <div className="absolute inset-0 flex">
                          <div className="flex-1" />
                          <div className={`flex-1 bg-black/90 dark:bg-white/90 flex items-center justify-end pr-6 transition-opacity rounded-r-2xl ${showIdeaDelete ? 'opacity-100' : 'opacity-0'}`}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </div>
                        </div>
                      )}
                      
                      {/* Idea card - swipeable, long-press for voice, click to toggle */}
                      <div 
                        onTouchStart={(e) => {
                          if (!isIdeaSelected && !isGenerating) {
                            handleTouchStart(e, idea.id);
                            handleLongPressStart('idea', idea.id);
                          }
                        }}
                        onTouchMove={(e) => !isIdeaSelected && !isGenerating && handleTouchMove(e)}
                        onTouchEnd={() => {
                          handleLongPressEnd();
                          if (!isIdeaSelected && !isGenerating) {
                            // Handle swipe end for ideas
                            if (swipeOffset < -100) {
                              deleteIdea(idea.id);
                            }
                            setSwipeOffset(0);
                            setSwipingTaskId(null);
                          }
                        }}
                        onTouchCancel={handleLongPressEnd}
                        onMouseDown={() => !isGenerating && handleLongPressStart('idea', idea.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onClick={() => {
                          if (!isIdeaSwiping && !isIdeaSelected && !isGenerating) {
                            if (hasChildren) {
                              toggleCollapse();
                            } else {
                              handleItemTap(idea, 'idea');
                            }
                          }
                        }}
                        style={{
                          transform: isIdeaSwiping && !isIdeaSelected ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                          transition: isIdeaSwiping ? 'none' : 'transform 0.3s ease-out',
                        }}
                        className={`relative rounded-2xl p-4 border border-gray-200 dark:border-[#38383a] dark: border-2 transition-all flex items-center gap-4 cursor-pointer overflow-hidden ${
                          isGenerating
                            ? 'border-black dark:border-white ring-2 ring-black dark:ring-white/30'
                            : isIdeaSelected 
                              ? 'border-black dark:border-white ring-2 ring-black dark:ring-white/30 scale-[1.02]' 
                              : 'border-[#c8d9cb]/50 dark:border-[#c8d9cb]/30 bg-gradient-to-r from-[#c8d9cb]/20 to-[#c8d9cb]/10 dark:from-[#c8d9cb]/10 dark:to-[#c8d9cb]/5'
                        }`}
                      >
                        {/* Animated gradient background when generating */}
                        {isGenerating && (
                          <div className="absolute inset-0 animate-gradient-flow opacity-80" />
                        )}
                        
                        {/* Minimal indicator line */}
                        <div className={`w-1 h-12 rounded-full flex-shrink-0 transition-all ${
                          isGenerating 
                            ? 'bg-black dark:bg-white animate-pulse' 
                            : isIdeaSelected
                              ? 'bg-black dark:bg-white'
                              : 'bg-gray-400 dark:bg-white0'
                        }`} />
                        <div className="relative z-10 flex-1 min-w-0">
                          <p className={`font-medium truncate ${isGenerating ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{idea.title}</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${isGenerating ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                              {isGenerating ? 'Generando plan...' : hasChildren ? `${completedChildren}/${children.length} pasos` : 'Idea'}
                            </p>
                            {hasChildren && !isGenerating && (
                              <svg 
                                className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        {!isIdeaSelected && !isGenerating && (
                          <button
                            onClick={(e) => { e.stopPropagation(); generateActionPlanInline(idea); }}
                            className="relative z-10 px-4 py-1.5 rounded-full bg-[#c8d9cb] hover:bg-[#b8c9bb] text-black text-sm font-semibold transition-all flex-shrink-0 shadow-sm hover:shadow-md active:scale-95"
                          >
                            Plan
                          </button>
                        )}
                        {isIdeaSelected && (
                          <button
                            onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                            className="relative z-10 w-10 h-10 rounded-full bg-gray-200 dark:bg-[#38383a] flex items-center justify-center transition-all"
                          >
                            <svg className="w-4 h-4 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* Child tasks with connecting line - collapsible */}
                      {hasChildren && !isCollapsed && (
                        <div className="relative ml-6 mt-2 animate-fade-in">
                          {/* Vertical connecting line */}
                          <div className="absolute left-5 top-0 bottom-4 w-0.5 bg-[#c8d9cb] animate-line-grow" />
                          
                          <div className="space-y-2">
                            {children.map((task, index) => {
                              const isLast = index === children.length - 1;
                              const priority = task.priority || 'medium';
                              const colors = priorityColors[priority];
                              const isStepSelected = selectedItem?.type === 'action-point' && selectedItem?.id === idea.id && selectedItem?.index === index;
                              
                              return (
                                <div key={task.id} className="relative flex items-center">
                                  {/* Horizontal connector */}
                                  <div className="absolute left-5 w-4 h-0.5 bg-[#c8d9cb]" style={{ top: '50%' }} />
                                  
                                  {/* Step number circle - clickable mic when selected */}
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isStepSelected && !processing) {
                                        // Toggle recording: start if not recording, stop if recording
                                        if (recording) {
                                          stopRecording();
                                        } else {
                                          startRecording();
                                        }
                                      }
                                    }}
                                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all overflow-hidden ${
                                    isStepSelected
                                      ? recording
                                        ? 'bg-[#c8d9cb] dark:bg-white text-black dark:text-black scale-125 ring-4 ring-[#c8d9cb]/50 dark:ring-white/30 cursor-pointer'
                                        : 'bg-[#c8d9cb] dark:bg-white text-black dark:text-black scale-110 ring-2 ring-[#c8d9cb]/50 dark:ring-white/30 cursor-pointer hover:scale-115 active:scale-105'
                                      : task.completed 
                                        ? 'bg-[#c8d9cb] dark:bg-white text-black dark:text-black' 
                                        : 'bg-white dark:bg-[#2c2c2e] border-2 border-[#c8d9cb] dark:border-white text-black dark:text-white'
                                  }`}>
                                    {/* Recording pulse rings - like main mic */}
                                    {isStepSelected && recording && (
                                      <>
                                        <div className="absolute inset-[-8px] rounded-full border-2 border-[#c8d9cb] dark:border-white/30 animate-ping" />
                                        <div className="absolute inset-[-4px] rounded-full border-2 border-[#c8d9cb] dark:border-white/50 animate-pulse" />
                                      </>
                                    )}
                                    
                                    {isStepSelected ? (
                                      recording ? (
                                        // Recording state - timer and stop icon like main mic
                                        <div className="relative flex flex-col items-center justify-center z-10">
                                          <span className="text-black text-xs font-medium tabular-nums">{formatTime(recordingTime)}</span>
                                          <div className="w-2.5 h-2.5 bg-black rounded-sm mt-0.5" />
                                        </div>
                                      ) : (
                                        // Ready to record - mic icon
                                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                        </svg>
                                      )
                                    ) : task.completed ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      index + 1
                                    )}
                                  </div>
                                  
                                  {/* Task card - long press to select, tap to edit inline */}
                                  <div 
                                    onTouchStart={() => !inlineEdit && handleLongPressStart('action-point', idea.id, index)}
                                    onTouchEnd={handleLongPressEnd}
                                    onTouchCancel={handleLongPressEnd}
                                    onMouseDown={() => !inlineEdit && handleLongPressStart('action-point', idea.id, index)}
                                    onMouseUp={handleLongPressEnd}
                                    onMouseLeave={handleLongPressEnd}
                                    className={`flex-1 ml-3 p-3 rounded-xl transition-all hover:shadow-md border-2 ${
                                      isStepSelected
                                        ? 'border-[#c8d9cb] ring-2 ring-[#c8d9cb]/50 bg-[#c8d9cb]'
                                        : task.completed 
                                          ? 'bg-white/50 dark:bg-[#2c2c2e]/50 border-transparent' 
                                          : `${colors.cardBg} ${colors.cardBgDark} border-white dark:border-[#38383a]/50`
                                    }`}
                                  >
                                    {/* Check if this step has a pending voice edit */}
                                    {pendingVoiceEdit?.taskId === task.id ? (
                                      // Preview mode - show new title with confirm/cancel
                                      <div className="space-y-2 animate-fade-in">
                                        <p className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                          {pendingVoiceEdit.originalTitle}
                                        </p>
                                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                                          {pendingVoiceEdit.newTitle}
                                        </p>
                                      </div>
                                    ) : inlineEdit?.taskId === task.id && inlineEdit?.field === 'title' ? (
                                      <input
                                        ref={inlineInputRef}
                                        type="text"
                                        value={inlineEditValue}
                                        onChange={(e) => setInlineEditValue(e.target.value)}
                                        onBlur={() => saveInlineEdit(task.id, 'title', inlineEditValue)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveInlineEdit(task.id, 'title', inlineEditValue);
                                          if (e.key === 'Escape') cancelInlineEdit();
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full font-medium text-sm text-gray-900 dark:text-white bg-transparent border-b-2 border-black dark:border-white outline-none animate-fade-in"
                                      />
                                    ) : (
                                      <p 
                                        onClick={() => !isStepSelected && handleItemTap(task, 'action-point', index)}
                                        className={`font-medium text-sm cursor-pointer transition-colors ${
                                          isStepSelected 
                                            ? 'text-black' 
                                            : task.completed 
                                              ? 'text-black/40 dark:text-white/40 line-through' 
                                              : 'text-black dark:text-white hover:text-black dark:hover:text-white'
                                        }`}
                                      >
                                        {task.title}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Confirm/Cancel buttons when pending edit, stop when recording, X when selected, checkbox otherwise */}
                                  {pendingVoiceEdit?.taskId === task.id ? (
                                    // Confirm/Cancel buttons for voice edit preview
                                    <div className="flex gap-1 ml-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); cancelVoiceEdit(); }}
                                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-[#38383a] hover:bg-gray-300 dark:hover:bg-[#48484a] text-gray-600 dark:text-gray-300 transition-all"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); confirmVoiceEdit(); }}
                                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : isStepSelected && recording ? (
                                    // Stop button when recording
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        stopRecording();
                                      }}
                                      className="ml-2 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-black dark:bg-white hover:opacity-80 transition-all"
                                    >
                                      <div className="w-3 h-3 bg-white dark:bg-black rounded-sm" />
                                    </button>
                                  ) : isStepSelected ? (
                                    // X button to deselect when selected (not recording)
                                    <button
                                      onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                                      className="ml-2 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-[#38383a] text-black dark:text-white hover:bg-gray-300 dark:hover:bg-[#48484a] transition-all"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toggleTask(task.id, task.completed)}
                                      className={`ml-2 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                                        task.completed 
                                          ? 'bg-black dark:bg-white text-white' 
                                          : 'border-2 border-gray-200 dark:border-gray-600 hover:border-black dark:border-white'
                                      }`}
                                    >
                                      {task.completed && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Standalone tasks (no parent idea) */}
                {standaloneTasks.map((task) => {
                  const priority = task.priority || 'medium';
                  const colors = priorityColors[priority];
                  const isBeingSwiped = swipingTaskId === task.id;
                  const showComplete = isBeingSwiped && swipeOffset > 50;
                  const showDelete = isBeingSwiped && swipeOffset < -50;
                  const isTaskSelected = selectedItem?.type === 'task' && selectedItem?.id === task.id;
                  
                  return (
                    <div key={task.id} className="relative overflow-hidden rounded-2xl">
                      {/* Swipe backgrounds */}
                      {!isTaskSelected && (
                        <div className="absolute inset-0 flex">
                          <div className={`flex-1 bg-black dark:bg-white flex items-center pl-6 transition-opacity ${showComplete ? 'opacity-100' : 'opacity-0'}`}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className={`flex-1 bg-black/90 dark:bg-white/90 flex items-center justify-end pr-6 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </div>
                        </div>
                      )}
                      
                      <div
                        onTouchStart={(e) => {
                          if (!isTaskSelected && !inlineEdit) {
                            handleTouchStart(e, task.id);
                            handleLongPressStart('task', task.id);
                          }
                        }}
                        onTouchMove={(e) => !isTaskSelected && !inlineEdit && handleTouchMove(e)}
                        onTouchEnd={() => {
                          handleLongPressEnd();
                          if (!isTaskSelected && !inlineEdit) handleTouchEnd(task);
                        }}
                        onTouchCancel={handleLongPressEnd}
                        onMouseDown={() => !inlineEdit && handleLongPressStart('task', task.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        style={{
                          transform: isBeingSwiped && !isTaskSelected ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                          transition: isBeingSwiped ? 'none' : 'transform 0.3s ease-out',
                        }}
                        className={`relative rounded-2xl p-4 border border-gray-200 dark:border-[#38383a] dark: border-2 flex items-center gap-4 group transition-all overflow-hidden ${
                          isTaskSelected
                            ? 'border-black dark:border-white ring-2 ring-black dark:ring-white/30 scale-[1.02]'
                            : `${colors.cardBg} ${colors.cardBgDark} border-gray-200 dark:border-[#38383a]/50 hover:`
                        }`}
                      >
                        {/* Animated gradient when recording/thinking */}
                        {isTaskSelected && recording && (
                          <div className="absolute inset-0 animate-gradient-flow opacity-80" />
                        )}
                        {/* Category icon - tap to change category */}
                        <div className="relative">
                          <div
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isTaskSelected) {
                                if (inlineEdit?.taskId === task.id && inlineEdit?.field === 'category') {
                                  cancelInlineEdit();
                                } else {
                                  startInlineEdit(task, 'category');
                                }
                              }
                            }}
                            onClick={(e) => {
                              if (isTaskSelected && !recording) {
                                e.stopPropagation();
                                startVoiceEditRecording();
                              }
                            }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden cursor-pointer ${
                              isTaskSelected 
                                ? recording 
                                  ? 'bg-black dark:bg-white scale-110 ring-2 ring-black dark:ring-white/30 animate-pulse'
                                  : 'bg-black dark:bg-white scale-110 ring-2 ring-black dark:ring-white/30 hover:scale-115 active:scale-105' 
                                : `bg-white/80 ring-2 ${colors.ring} hover:scale-105 active:scale-95`
                            }`}
                          >
                            {isTaskSelected ? (
                              recording ? (
                                // Recording animation - pulsing waves
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute w-8 h-8 rounded-full bg-white/30 dark:bg-black/30 animate-ping" />
                                  <svg className="w-6 h-6 text-white dark:text-black relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                  </svg>
                                </div>
                              ) : (
                                // Ready to record - mic icon
                                <svg className="w-6 h-6 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                </svg>
                              )
                            ) : (
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {(task.category || 'task').slice(0, 2)}
                              </span>
                            )}
                          </div>
                          {/* Inline category dropdown */}
                          {inlineEdit?.taskId === task.id && inlineEdit?.field === 'category' && (
                            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#2c2c2e] rounded-xl border border-gray-200 dark:border-[#38383a] shadow-xl z-50 overflow-hidden animate-fade-in min-w-[120px]">
                              {categories.map((cat) => (
                                <button
                                  key={cat}
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    saveInlineEdit(task.id, 'category', cat);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-gray-700 transition-colors ${task.category === cat ? 'bg-black dark:bg-white/10 text-black dark:text-white' : 'text-black dark:text-white'}`}
                                >
                                  {categoryLabels[cat] || cat}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Title and date - tap each to edit inline */}
                        <div className="flex-1 min-w-0">
                          {/* Title - inline editable */}
                          {inlineEdit?.taskId === task.id && inlineEdit?.field === 'title' ? (
                            <input
                              ref={inlineInputRef}
                              type="text"
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit(task.id, 'title', inlineEditValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(task.id, 'title', inlineEditValue);
                                if (e.key === 'Escape') cancelInlineEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full font-medium text-gray-900 dark:text-white bg-transparent border-b-2 border-black dark:border-white outline-none py-1 animate-fade-in"
                            />
                          ) : (
                            <p 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (!isTaskSelected && !isBeingSwiped) handleItemTap(task, 'task'); 
                              }}
                              className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-black dark:text-white transition-colors"
                            >
                              {task.title}
                            </p>
                          )}
                          {/* Date - inline editable */}
                          {inlineEdit?.taskId === task.id && inlineEdit?.field === 'date' ? (
                            <input
                              type="date"
                              value={inlineEditValue}
                              onChange={(e) => {
                                setInlineEditValue(e.target.value);
                                saveInlineEdit(task.id, 'date', e.target.value);
                              }}
                              onBlur={() => cancelInlineEdit()}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="text-sm text-black dark:text-white bg-transparent border-b-2 border-black dark:border-white outline-none py-1 animate-fade-in"
                            />
                          ) : (
                            <p 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (!isTaskSelected && !isBeingSwiped) startInlineEdit(task, 'date'); 
                              }}
                              className="text-sm text-gray-400 cursor-text hover:text-black dark:text-white transition-colors"
                            >
                              {task.due_date ? formatDueDate(task.due_date) : 'Sin fecha'}
                            </p>
                          )}
                        </div>
                        {isTaskSelected ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-[#38383a] text-black dark:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.completed); }}
                            className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:border-black dark:border-white flex items-center justify-center transition-colors bg-white/50 dark:bg-[#38383a]/50"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Completadas ({completedTasks.length})
              </h3>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3 px-4 mb-1 flex items-center gap-3 group hover:bg-white dark:hover:bg-gray-800/50 rounded-lg transition-all"
                >
                  <div className="w-1 h-6 bg-gray-200 dark:bg-[#38383a] rounded-full opacity-50" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-400 dark:text-gray-500 line-through truncate">{task.title}</p>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-black dark:hover:text-white transition-all p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state - clean, no message */}
        </div>
      </div>

      {/* Action Plan Modal */}
      {actionPlanIdea && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeActionPlanModal}
        >
          <div 
            className="bg-white dark:bg-[#2c2c2e] rounded-3xl p-6 w-full max-w-sm shadow-2xl my-auto max-h-[90vh] overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-10 bg-black dark:bg-white rounded-full" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plan</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{actionPlanIdea.title}</p>
              </div>
            </div>

            {/* Loading state */}
            {generatingPlan && (
              <div className="py-8 text-center">
                <div className="w-10 h-10 mx-auto mb-4 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">Generando plan de acción...</p>
              </div>
            )}

            {/* Action points with sequential reveal animation */}
            {!generatingPlan && actionPoints.length > 0 && (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4 animate-step-reveal" style={{ animationDelay: '0ms' }}>
                  Tu roadmap
                </p>
                
                {/* Timeline container - key forces re-animation on plan change */}
                <div key={planAnimationKey} className="relative ml-3 mb-4">
                  {/* Vertical line that grows */}
                  <div 
                    className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-[#c8d9cb] animate-line-grow"
                    style={{ animationDelay: '100ms', animationDuration: `${actionPoints.length * 200}ms` }}
                  />
                  
                  {/* Steps */}
                  <div className="space-y-3">
                    {actionPoints.map((point, i) => (
                      <div 
                        key={i} 
                        className="relative flex items-start gap-4 animate-step-reveal"
                        style={{ animationDelay: `${(i + 1) * 200}ms` }}
                      >
                        {/* Step number circle */}
                        <div className="relative z-10 w-6 h-6 rounded-full bg-black dark:bg-white text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-md">
                          {i + 1}
                        </div>
                        
                        {/* Step content */}
                        <div className="flex-1 pb-2">
                          <p className="font-medium text-gray-900 dark:text-white text-sm leading-snug">{point.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {point.time_estimate}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice-First Refinement */}
                <div className="border-t border-gray-200 dark:border-[#38383a] pt-4 mt-4">
                  {/* Chat messages - compact */}
                  {debateMessages.length > 0 && (
                    <div 
                      ref={debateChatRef}
                      className="max-h-24 overflow-y-auto mb-4 space-y-2"
                    >
                      {debateMessages.map((msg, i) => (
                        <div 
                          key={i}
                          className={`p-2 rounded-lg text-sm ${
                            msg.role === 'user' 
                              ? 'bg-black dark:bg-white/10 text-black dark:text-white ml-4' 
                              : 'bg-gray-100 dark:bg-[#38383a] text-black dark:text-white mr-4'
                          }`}
                        >
                          {msg.content}
                        </div>
                      ))}
                      {debating && (
                        <div className="bg-gray-100 dark:bg-[#38383a] p-2 rounded-lg text-sm text-gray-500 mr-4 animate-pulse">
                          Pensando...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voice-first: Big mic button centered */}
                  <div className="flex flex-col items-center mb-4">
                    <button
                      onClick={debateRecording ? stopDebateRecording : startDebateRecording}
                      disabled={debating}
                      className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                        debateRecording 
                          ? 'bg-black dark:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]' 
                          : 'bg-black dark:bg-white  hover:shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
                      }`}
                    >
                      {debateRecording && (
                        <>
                          <div className="absolute inset-[-6px] rounded-full border-2 border-black/50 dark:border-white/50 animate-ping" />
                          <div className="absolute inset-[-3px] rounded-full border-2 border-black/70 dark:border-white/70 animate-pulse" />
                        </>
                      )}
                      {debateRecording ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      )}
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {debateRecording ? 'Grabando... toca para parar' : 'Toca para ajustar con voz'}
                    </p>
                  </div>

                  {/* Quick action chips */}
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {[
                      { label: 'Más detalle', prompt: 'Dame más detalle en cada paso' },
                      { label: 'Menos pasos', prompt: 'Simplifica el plan con menos pasos' },
                      { label: 'Más rápido', prompt: 'Hazlo más rápido, menos tiempo total' },
                      { label: 'Primer paso', prompt: 'Enfócate solo en el primer paso concreto' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => {
                          setDebateInput(chip.prompt);
                          setTimeout(() => sendDebateMessage(), 50);
                        }}
                        disabled={debating}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#38383a] text-black dark:text-white hover:bg-black dark:bg-white/20 hover:text-black dark:text-white dark:hover:text-[#636366] transition-all disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Text input - secondary option */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={debateInput}
                      onChange={(e) => setDebateInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendDebateMessage()}
                      placeholder="O escribe tu ajuste..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#38383a] text-gray-900 dark:text-white text-sm focus:border-black dark:border-white focus:ring-1 focus:ring-black dark:ring-white/20 outline-none transition-all"
                      disabled={debating || debateRecording}
                    />
                    <button
                      onClick={sendDebateMessage}
                      disabled={!debateInput.trim() || debating}
                      className="px-3 py-2 rounded-xl bg-black dark:bg-white text-white disabled:opacity-50 transition-all hover:bg-[#333333]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={deployActionPlan}
                    className="flex-1 py-3 rounded-xl font-semibold text-white bg-black dark:bg-white hover:bg-[#333333] transition-all shadow-md flex items-center justify-center gap-2"
                  >
Crear Tareas
                  </button>
                  <button
                    onClick={closeActionPlanModal}
                    className="px-4 py-3 rounded-xl font-medium text-black dark:text-white bg-gray-100 dark:bg-[#38383a] hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}

            {/* No action points */}
            {!generatingPlan && actionPoints.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No se pudieron generar pasos de acción.</p>
                <button
                  onClick={closeActionPlanModal}
                  className="mt-4 px-6 py-2 rounded-xl font-medium text-black dark:text-white bg-gray-100 dark:bg-[#38383a] hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Install prompt for PWA */}
      <InstallPrompt />
    </main>
  );
}

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
