import { SupabaseClient } from '@supabase/supabase-js';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string | null;
}

export interface MilestoneData {
  id: string;
  title: string;
  description: string;
  icon: string; // SVG path
  achieved: boolean;
  achievedAt?: string;
  threshold: number;
  type: 'ideas' | 'tasks' | 'streak' | 'completed';
}

// Milestone definitions
export const MILESTONES: Omit<MilestoneData, 'achieved' | 'achievedAt'>[] = [
  // Ideas milestones
  {
    id: 'first-idea',
    title: 'Primera chispa',
    description: 'Capturaste tu primera idea',
    icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
    threshold: 1,
    type: 'ideas',
  },
  {
    id: 'idea-collector',
    title: 'Coleccionista',
    description: '10 ideas capturadas',
    icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
    threshold: 10,
    type: 'ideas',
  },
  {
    id: 'idea-fountain',
    title: 'Fuente de ideas',
    description: '50 ideas capturadas',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z',
    threshold: 50,
    type: 'ideas',
  },
  // Tasks milestones
  {
    id: 'first-task',
    title: 'Primer paso',
    description: 'Completaste tu primera tarea',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    threshold: 1,
    type: 'completed',
  },
  {
    id: 'task-doer',
    title: 'Ejecutor',
    description: '25 tareas completadas',
    icon: 'M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75',
    threshold: 25,
    type: 'completed',
  },
  {
    id: 'task-master',
    title: 'Maestro',
    description: '100 tareas completadas',
    icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0',
    threshold: 100,
    type: 'completed',
  },
  // Streak milestones
  {
    id: 'streak-3',
    title: 'En racha',
    description: '3 días seguidos',
    icon: 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
    threshold: 3,
    type: 'streak',
  },
  {
    id: 'streak-7',
    title: 'Semana perfecta',
    description: '7 días seguidos',
    icon: 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
    threshold: 7,
    type: 'streak',
  },
  {
    id: 'streak-30',
    title: 'Hábito formado',
    description: '30 días seguidos',
    icon: 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
    threshold: 30,
    type: 'streak',
  },
];

/**
 * Calculate user's streak from their activity
 */
export async function calculateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakData> {
  // Get all tasks/ideas with their creation dates
  const { data: items } = await supabase
    .from('tasks')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!items || items.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: null,
    };
  }

  // Get unique dates (YYYY-MM-DD)
  const uniqueDates = [...new Set(
    items.map(item => item.created_at.split('T')[0])
  )].sort().reverse(); // Most recent first

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: null,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Calculate current streak
  let currentStreak = 0;
  const lastActive = uniqueDates[0];
  
  // Only count streak if active today or yesterday
  if (lastActive === today || lastActive === yesterday) {
    currentStreak = 1;
    let checkDate = new Date(lastActive);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const expectedDate = checkDate.toISOString().split('T')[0];
      
      if (uniqueDates[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);
    
    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalDaysActive: uniqueDates.length,
    lastActiveDate: lastActive,
  };
}

/**
 * Get user's milestone progress
 */
export async function getMilestones(
  supabase: SupabaseClient,
  userId: string,
  streakData: StreakData
): Promise<MilestoneData[]> {
  // Get counts
  const [ideasRes, completedRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('type', 'idea'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('type', 'task')
      .eq('completed', true),
  ]);

  const ideasCount = ideasRes.count || 0;
  const completedCount = completedRes.count || 0;

  return MILESTONES.map(milestone => {
    let currentValue = 0;
    
    switch (milestone.type) {
      case 'ideas':
        currentValue = ideasCount;
        break;
      case 'completed':
        currentValue = completedCount;
        break;
      case 'streak':
        currentValue = streakData.currentStreak;
        break;
    }

    return {
      ...milestone,
      achieved: currentValue >= milestone.threshold,
    };
  });
}

/**
 * Check for newly achieved milestones
 */
export function getNewlyAchievedMilestones(
  milestones: MilestoneData[],
  previouslyAchieved: string[]
): MilestoneData[] {
  return milestones.filter(
    m => m.achieved && !previouslyAchieved.includes(m.id)
  );
}
