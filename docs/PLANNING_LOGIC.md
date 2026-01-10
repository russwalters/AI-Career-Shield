# Planning & Recommendation System

This document explains how AI Career Shield generates career recommendations and personalized action plans.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Risk Scoring Methodology](#risk-scoring-methodology)
3. [Career Recommendation Engine](#career-recommendation-engine)
4. [Action Plan Generation](#action-plan-generation)
5. [Data Sources](#data-sources)
6. [Key Files Reference](#key-files-reference)

---

## System Overview

The planning system works in three stages:

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Assessment    │ ──▶ │  Career Recommender  │ ──▶ │  Plan Generator │
│  (Risk Score)   │     │  (Alternative Paths) │     │  (90-Day Plan)  │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                         │                          │
        ▼                         ▼                          ▼
   User's tasks            Lower-risk careers         Weekly milestones
   mapped to DWAs          with skills overlap        with learning tasks
```

---

## Risk Scoring Methodology

### Core Concept: Detailed Work Activities (DWAs)

Risk scores are calculated based on **Detailed Work Activities** from the O*NET database. There are 2,087 DWAs that describe atomic work tasks across all occupations.

Each DWA has a pre-scored AI exposure rating (0-100):
- **0-30**: Low exposure (significant human elements required)
- **31-60**: Medium exposure (AI assists but humans essential)
- **61-100**: High exposure (AI can perform most/all)

### Scoring Process

**File:** `src/lib/exposure-calculator.ts`

1. **Task Extraction**: During assessment, Claude extracts the user's daily tasks from conversation
2. **DWA Mapping**: Each task is mapped to relevant DWAs using semantic similarity
3. **Time Weighting**: Tasks are weighted by the percentage of time spent on each
4. **Score Calculation**:

```typescript
// Time-weighted average of task exposure scores
let weightedSum = 0;
let totalWeight = 0;

for (const task of taskScores) {
  const weight = task.timePercent / 100;
  weightedSum += task.exposureScore * weight;
  totalWeight += weight;
}

const riskScore = Math.round(weightedSum / totalWeight);
```

### Score Adjustments

**Mapping Confidence Adjustment:**
```typescript
// Lower mapping confidence pulls score toward 50 (uncertain)
const adjustedScore = avgScore * mappingConfidence + 50 * (1 - mappingConfidence);
```

**Scenario Modeling:**
- **Slow AI adoption**: Only high-exposure tasks automated (conservative estimate)
- **Rapid AI adoption**: All tasks face accelerated automation (pessimistic estimate)

```typescript
// Slow scenario dampens medium/low exposure impact
const slowFactor = task.category === 'high' ? 1.0 :
                   task.category === 'medium' ? 0.6 : 0.3;

// Rapid scenario boosts all scores
const rapidFactor = task.category === 'high' ? 1.2 :
                    task.category === 'medium' ? 1.1 : 1.0;
```

### Protected vs. Vulnerable Skills

Skills are categorized by pattern matching against task descriptions:

**Protected Skills (low automation exposure):**
| Pattern | Skill Category |
|---------|----------------|
| leadership, manage, supervise | Leadership & Management |
| negotiate, persuade, influence | Negotiation & Persuasion |
| creative, design, innovate | Creative Problem Solving |
| empathy, emotional, counsel | Emotional Intelligence |
| strategic, strategy, planning | Strategic Thinking |
| relationship, client, stakeholder | Relationship Building |
| complex decision, judgment | Complex Decision Making |
| physical, hands-on, manual | Physical/Manual Skills |

**Vulnerable Skills (high automation exposure):**
| Pattern | Skill Category |
|---------|----------------|
| data entry, typing, input | Data Entry |
| schedule, calendar | Scheduling & Coordination |
| research, gather information | Information Research |
| report, document, summarize | Report Generation |
| routine, repetitive | Routine Processing |
| calculate, compute, analysis | Data Analysis |
| translate, transcribe | Translation & Transcription |
| sort, organize, file | Information Organization |

---

## Career Recommendation Engine

**File:** `src/lib/career-recommender.ts`

### Recommendation Criteria

Careers are recommended based on three factors:

1. **Lower AI Risk Score** - Must have lower exposure than current role
2. **Skills Overlap** - Must match at least 40% of current skills
3. **Growth Outlook** - Preference for growing fields

### Skills Matching Algorithm

```typescript
function calculateSkillsMatch(currentSkills, targetSkills) {
  let totalMatchScore = 0;
  let totalPossible = 0;

  for (const [elementId, targetSkill] of targetSkills) {
    const currentSkill = currentSkills.get(elementId);
    totalPossible += targetSkill.value;

    if (currentSkill) {
      // Match ratio based on skill level comparison
      const matchRatio = Math.min(currentSkill.value / targetSkill.value, 1);
      totalMatchScore += targetSkill.value * matchRatio;

      if (matchRatio >= 0.7) {
        overlapping.push(targetSkill.name);  // Can transfer this skill
      } else if (targetSkill.value >= 3) {
        toLearn.push(targetSkill.name);       // Needs improvement
      }
    } else if (targetSkill.value >= 3) {
      toLearn.push(targetSkill.name);         // New skill needed
    }
  }

  return Math.round((totalMatchScore / totalPossible) * 100);
}
```

### Ranking Formula

Candidates are sorted by weighted combination:

```typescript
// 60% weight on risk reduction, 40% on skills match
const score = (riskReduction * 0.6) + (skillsMatch * 0.4);
```

### Growth & Salary Estimation

Currently uses O*NET Job Zones as proxy:

| Job Zone | Growth Outlook | Salary Range |
|----------|----------------|--------------|
| 5 | High | $80,000 - $150,000+ |
| 4 | High | $55,000 - $100,000 |
| 3 | Moderate | $40,000 - $70,000 |
| 2 | Low | $30,000 - $50,000 |
| 1 | Low | $25,000 - $40,000 |

> **Note:** In production, this would integrate BLS employment projections and wage data.

---

## Action Plan Generation

**File:** `src/lib/plan-generator.ts`

### Plan Structure

Each 90-day plan contains:
- **6 milestones** (one every 2 weeks)
- **3-4 tasks per milestone**
- **Success criteria** for each milestone
- **Resource links** (courses, videos, articles)

### Generation Process

1. **AI-Powered Generation**: Claude creates personalized plan based on:
   - Current role and risk score
   - Target career details
   - Skills to learn
   - Skills that transfer

```typescript
const prompt = `Create a detailed 90-day action plan for this career transition.

## Current Situation
- Current Role: ${assessment.jobTitle}
- AI Risk Score: ${assessment.riskScore}/100
- Protected Skills: ${assessment.protectedSkills.join(', ')}
- Vulnerable Skills: ${assessment.vulnerableSkills.join(', ')}

## Target Career
- Target Role: ${targetCareer.title}
- Target Risk Score: ${targetCareer.riskScore}/100
- Skills to Learn: ${targetCareer.skillsToLearn.join(', ')}
- Applicable Current Skills: ${targetCareer.currentSkillsApplicable.join(', ')}

## Requirements
- 6 two-week milestones
- 3-4 specific, actionable tasks each
- Mix of learning, networking, and practical application
- Realistic time estimates (5-10 hours/week)
- Free resources where possible
`;
```

2. **Fallback Plan**: If AI generation fails, uses template-based plan:

```
Week 2:  Research & Assessment
Week 4:  Foundation Skills (primary skill)
Week 6:  Skill Development (secondary skill)
Week 8:  Networking & Visibility
Week 10: Advanced Application
Week 12: Transition Preparation
```

### Task Types

Each task includes:
- **title**: Short task name
- **description**: What to do and why
- **estimatedHours**: Time commitment (typically 2-8 hours)
- **resourceUrl**: Link to learning resource (optional)
- **resourceType**: `video` | `course` | `article` | `practice` | `networking`
- **completed**: Progress tracking boolean

### Resource Selection Philosophy

The system prioritizes:
1. **Free resources first** (YouTube, free courses, documentation)
2. **Community resources** (meetups, open source projects)
3. **Practical application** (portfolio projects, contributions)

> **Note:** The current implementation generates resource recommendations but does not maintain a curated database of learning resources. This is a future enhancement opportunity.

### Progress Tracking

```typescript
function calculatePlanProgress(milestones: Milestone[]): number {
  const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedTasks = milestones.reduce(
    (sum, m) => sum + m.tasks.filter(t => t.completed).length,
    0
  );
  return Math.round((completedTasks / totalTasks) * 100);
}
```

---

## Data Sources

### O*NET Database

**Location:** `/data/onet/db_30_1_text/`

| Table | Records | Purpose |
|-------|---------|---------|
| `occupations` | 923 | SOC codes and titles |
| `alternate_titles` | ~58,000 | Job title variations |
| `tasks` | ~19,000 | Task statements per occupation |
| `detailed_work_activities` | 2,087 | Atomic work activities (scoring unit) |
| `skills` | ~35,000 | Skill requirements per occupation |
| `task_dwa_links` | - | Maps tasks to DWAs |

### DWA AI Exposure Scores

**Table:** `dwa_ai_exposure`

Pre-scored exposure ratings for all 2,087 DWAs. Scoring methodology:
- Considers current AI capabilities (LLMs, computer vision, robotics)
- Accounts for regulatory/safety constraints
- Includes confidence intervals

### Database Functions

**`calculate_occupation_risk(p_soc_code)`**

PostgreSQL function that:
1. Gets all DWAs linked to an occupation's tasks
2. Averages their exposure scores
3. Returns risk score and breakdown percentages

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/exposure-calculator.ts` | Calculate AI exposure scores from task mappings |
| `src/lib/career-recommender.ts` | Find and rank alternative career paths |
| `src/lib/plan-generator.ts` | Generate and manage 90-day action plans |
| `src/lib/task-mapper.ts` | Map user task descriptions to DWAs |
| `src/lib/occupation-matcher.ts` | Match job titles to O*NET occupations |
| `src/app/api/plan/route.ts` | Plan API endpoints (POST/GET/PATCH) |
| `src/app/api/assessment/route.ts` | Assessment processing and storage |

---

## API Endpoints

### POST /api/plan

Generate new action plan.

**Request:**
```json
{
  "targetSocCode": "15-1252.00"  // Optional: specific career target
}
```

**Response:**
```json
{
  "success": true,
  "planId": "uuid",
  "plan": {
    "targetCareer": "Software Developers",
    "targetRiskScore": 45,
    "currentRiskScore": 78,
    "skillsToLearn": ["Programming", "Systems Analysis"],
    "milestones": [...],
    "progress": 0
  }
}
```

### GET /api/plan

Retrieve user's current plan.

### PATCH /api/plan

Update task completion status.

**Request:**
```json
{
  "planId": "uuid",
  "milestoneWeek": 2,
  "taskIndex": 0,
  "completed": true
}
```

---

## Future Enhancements

1. **BLS Integration**: Real employment projections and wage data
2. **Resource Database**: Curated, validated learning resources
3. **Skills Verification**: Integration with LinkedIn Skills or certifications
4. **Mentor Matching**: Connect users with professionals in target careers
5. **Company-Specific Plans**: Tailored for internal career mobility
