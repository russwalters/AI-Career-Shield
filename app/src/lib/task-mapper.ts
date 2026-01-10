/**
 * Task Mapper
 *
 * Maps user-described tasks to O*NET Detailed Work Activities (DWAs).
 * Uses Claude to semantically match free-form task descriptions to
 * standardized work activities for exposure scoring.
 */

import { getSupabaseAdmin } from './supabase';
import { getAnthropicClient } from './claude';

export interface UserTask {
  description: string;
  timePercent: number;
}

export interface DWAMapping {
  dwaId: string;
  dwaTitle: string;
  relevance: number; // 0.0 - 1.0 how relevant this DWA is to the task
}

export interface TaskMappingResult {
  taskDescription: string;
  timePercent: number;
  mappedDwas: DWAMapping[];
  confidence: number; // Overall confidence in the mapping
}

export interface MappingBatchResult {
  mappings: TaskMappingResult[];
  overallConfidence: number;
}

// Type definitions for Supabase query results
interface DWARow { dwa_id: string; dwa_title: string }
interface TaskWithDWALinks {
  task_id: string;
  task_dwa_links: Array<{ dwa_id: string }>;
}

/**
 * Fetch a relevant subset of DWAs for mapping context
 * If we have a matched occupation, prefer DWAs linked to that occupation's tasks
 */
async function getRelevantDWAs(socCode?: string): Promise<Array<{ dwaId: string; dwaTitle: string }>> {
  const supabase = getSupabaseAdmin();

  if (socCode) {
    // Get DWAs linked to this occupation's tasks
     
    const { data: occupationDwas } = await (supabase
      .from('tasks') as any)
      .select(`
        task_id,
        task_dwa_links!inner(dwa_id)
      `)
      .eq('soc_code', socCode)
      .limit(100) as { data: TaskWithDWALinks[] | null };

    if (occupationDwas && occupationDwas.length > 0) {
      const dwaIds = occupationDwas.flatMap(t =>
        t.task_dwa_links.map(link => link.dwa_id)
      );
      const uniqueDwaIds = [...new Set(dwaIds)];

       
      const { data: dwas } = await (supabase
        .from('detailed_work_activities') as any)
        .select('dwa_id, dwa_title')
        .in('dwa_id', uniqueDwaIds) as { data: DWARow[] | null };

      if (dwas && dwas.length > 0) {
        return dwas.map(d => ({ dwaId: d.dwa_id, dwaTitle: d.dwa_title }));
      }
    }
  }

  // Fallback: get a diverse sample of DWAs
   
  const { data: allDwas } = await (supabase
    .from('detailed_work_activities') as any)
    .select('dwa_id, dwa_title')
    .limit(500) as { data: DWARow[] | null };

  return (allDwas || []).map(d => ({ dwaId: d.dwa_id, dwaTitle: d.dwa_title }));
}

/**
 * Map a single user task to DWAs using Claude
 */
async function mapSingleTask(
  task: UserTask,
  availableDwas: Array<{ dwaId: string; dwaTitle: string }>,
  occupationContext?: string
): Promise<TaskMappingResult> {
  const client = getAnthropicClient();

  // Create DWA list for prompt
  const dwaList = availableDwas
    .map(d => `${d.dwaId}: ${d.dwaTitle}`)
    .join('\n');

  const prompt = `You are an expert at matching job tasks to O*NET Detailed Work Activities (DWAs).

Given this task description from a user:
"${task.description}"
${occupationContext ? `\nContext: This person works as a ${occupationContext}.` : ''}

Match this task to the most relevant DWAs from this list:
${dwaList}

Select 1-5 DWAs that best represent what this task involves. Consider:
1. The core activity being performed
2. The skills and knowledge required
3. The output or goal of the task

Return JSON only:
{
  "mappings": [
    {"dwa_id": "4.A.1.a.1", "relevance": 0.0-1.0},
    ...
  ],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of the mapping"
}

Relevance scores:
- 1.0: This DWA directly describes the task
- 0.7-0.9: Strongly related, covers major aspects
- 0.4-0.6: Partially related, covers some aspects
- Below 0.4: Only tangentially related`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return createFallbackMapping(task);
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createFallbackMapping(task);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      mappings: Array<{ dwa_id: string; relevance: number }>;
      confidence: number;
    };

    // Build mapping result with DWA titles
    const dwaMap = new Map(availableDwas.map(d => [d.dwaId, d.dwaTitle]));

    const mappedDwas: DWAMapping[] = parsed.mappings
      .filter(m => dwaMap.has(m.dwa_id))
      .map(m => ({
        dwaId: m.dwa_id,
        dwaTitle: dwaMap.get(m.dwa_id)!,
        relevance: Math.min(1, Math.max(0, m.relevance)),
      }))
      .sort((a, b) => b.relevance - a.relevance);

    return {
      taskDescription: task.description,
      timePercent: task.timePercent,
      mappedDwas,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
    };
  } catch (error) {
    console.error('Task mapping failed:', error);
    return createFallbackMapping(task);
  }
}

/**
 * Create a fallback mapping when AI fails
 */
function createFallbackMapping(task: UserTask): TaskMappingResult {
  return {
    taskDescription: task.description,
    timePercent: task.timePercent,
    mappedDwas: [],
    confidence: 0.3, // Low confidence indicates mapping needs review
  };
}

/**
 * Map multiple tasks in a single batch request for efficiency
 */
async function mapTasksBatch(
  tasks: UserTask[],
  availableDwas: Array<{ dwaId: string; dwaTitle: string }>,
  occupationContext?: string
): Promise<TaskMappingResult[]> {
  const client = getAnthropicClient();

  // Create task list
  const taskList = tasks
    .map((t, i) => `${i + 1}. "${t.description}" (${t.timePercent}% of time)`)
    .join('\n');

  // Create DWA list (truncate if too long)
  const dwaList = availableDwas
    .slice(0, 300) // Limit to avoid token limits
    .map(d => `${d.dwaId}: ${d.dwaTitle}`)
    .join('\n');

  const prompt = `You are an expert at matching job tasks to O*NET Detailed Work Activities (DWAs).

Given these tasks from a user${occupationContext ? ` who works as a ${occupationContext}` : ''}:
${taskList}

Match each task to relevant DWAs from this list:
${dwaList}

For each task, select 1-5 DWAs that best represent what the task involves.

Return JSON only:
{
  "task_mappings": [
    {
      "task_index": 1,
      "mappings": [
        {"dwa_id": "4.A.1.a.1", "relevance": 0.0-1.0},
        ...
      ],
      "confidence": 0.0-1.0
    },
    ...
  ]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return tasks.map(t => createFallbackMapping(t));
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return tasks.map(t => createFallbackMapping(t));
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      task_mappings: Array<{
        task_index: number;
        mappings: Array<{ dwa_id: string; relevance: number }>;
        confidence: number;
      }>;
    };

    // Build mapping results
    const dwaMap = new Map(availableDwas.map(d => [d.dwaId, d.dwaTitle]));
    const resultMap = new Map<number, TaskMappingResult>();

    for (const taskMapping of parsed.task_mappings) {
      const taskIndex = taskMapping.task_index - 1; // Convert to 0-indexed
      if (taskIndex < 0 || taskIndex >= tasks.length) continue;

      const task = tasks[taskIndex];
      const mappedDwas: DWAMapping[] = taskMapping.mappings
        .filter(m => dwaMap.has(m.dwa_id))
        .map(m => ({
          dwaId: m.dwa_id,
          dwaTitle: dwaMap.get(m.dwa_id)!,
          relevance: Math.min(1, Math.max(0, m.relevance)),
        }))
        .sort((a, b) => b.relevance - a.relevance);

      resultMap.set(taskIndex, {
        taskDescription: task.description,
        timePercent: task.timePercent,
        mappedDwas,
        confidence: Math.min(1, Math.max(0, taskMapping.confidence)),
      });
    }

    // Return results in order, with fallbacks for missing mappings
    return tasks.map((task, index) =>
      resultMap.get(index) || createFallbackMapping(task)
    );
  } catch (error) {
    console.error('Batch task mapping failed:', error);
    return tasks.map(t => createFallbackMapping(t));
  }
}

/**
 * Main function: Map user tasks to DWAs
 */
export async function mapUserTasks(
  tasks: UserTask[],
  options?: {
    socCode?: string;
    occupationTitle?: string;
    useBatch?: boolean;
  }
): Promise<MappingBatchResult> {
  const { socCode, occupationTitle, useBatch = true } = options || {};

  if (tasks.length === 0) {
    return { mappings: [], overallConfidence: 0 };
  }

  // Get relevant DWAs for context
  const availableDwas = await getRelevantDWAs(socCode);

  if (availableDwas.length === 0) {
    console.error('No DWAs found for mapping');
    return {
      mappings: tasks.map(t => createFallbackMapping(t)),
      overallConfidence: 0,
    };
  }

  let mappings: TaskMappingResult[];

  if (useBatch && tasks.length > 1 && tasks.length <= 10) {
    // Batch processing for efficiency
    mappings = await mapTasksBatch(tasks, availableDwas, occupationTitle);
  } else {
    // Process individually (for single task or large batches)
    mappings = await Promise.all(
      tasks.map(task => mapSingleTask(task, availableDwas, occupationTitle))
    );
  }

  // Calculate overall confidence
  const totalTimeWeight = tasks.reduce((sum, t) => sum + t.timePercent, 0);
  const weightedConfidence = mappings.reduce((sum, m) =>
    sum + (m.confidence * m.timePercent), 0
  );
  const overallConfidence = totalTimeWeight > 0
    ? weightedConfidence / totalTimeWeight
    : 0;

  return {
    mappings,
    overallConfidence,
  };
}

/**
 * Convert task mapping results to the format expected by exposure calculator
 */
export function toExposureFormat(mappings: TaskMappingResult[]): Array<{
  description: string;
  timePercent: number;
  dwaIds: string[];
  confidence: number;
}> {
  return mappings.map(m => ({
    description: m.taskDescription,
    timePercent: m.timePercent,
    dwaIds: m.mappedDwas.map(d => d.dwaId),
    confidence: m.confidence,
  }));
}
