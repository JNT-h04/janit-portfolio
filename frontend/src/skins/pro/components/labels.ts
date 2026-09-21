import type { Project } from '../../../data/projects'

/**
 * How heavy the model is. The cyberpunk side calls this a "threat level";
 * here it is described the way an engineer would say it out loud.
 */
export const COMPLEXITY: Record<Project['threat'], string> = {
  LOW: 'Lightweight',
  MED: 'Moderate compute',
  HIGH: 'Heavy compute',
}
