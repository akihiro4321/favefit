# FaveFit Project Context

## Overview
FaveFit is an AI-powered meal planning application that uses Mastra v1.0 agents to generate personalized 14-day meal plans. It optimizes for user nutrition goals, taste preferences, and market prices while offering features like "cheat days" and "boredom prevention."

## Tech Stack
- **Framework:** Next.js 16.1.3 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 3.4, Radix UI (shadcn/ui compatible)
- **AI Engine:** Mastra v1.0 (`@mastra/core`)
- **LLM:** Google Gemini models (via Mastra)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Authentication
- **Observability:** Langfuse
- **Testing:** Vitest

## Key Commands
| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server (local:3000) |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests using Vitest |
| `npm run studio` | Start the Mastra development studio (for debugging agents) |

## Architecture & Agents
The core AI logic resides in `src/mastra/` and utilizes specific agents for distinct tasks:

| Agent Name | Role | Defined In |
|---|---|---|
| **Nutrition Planner** | Calculates nutritional goals (BMR/TDEE) | `src/mastra/agents/nutrition-planner.ts` |
| **Plan Generator** | Creates the 14-day meal plan | `src/mastra/agents/plan-generator.ts` |
| **Recipe Creator** | Generates detailed recipe instructions | `src/mastra/agents/recipe-creator.ts` |
| **Menu Adjuster** | Suggests alternatives based on fridge items | `src/mastra/agents/menu-adjuster.ts` |
| **Preference Learner** | Learns from user feedback | `src/mastra/agents/preference-learner.ts` |
| **Boredom Analyzer** | Analyzes plan variety for refreshes | `src/mastra/agents/boredom-analyzer.ts` |

**Data Flow:**
1.  **User Input:** Goals & Preferences (Onboarding).
2.  **Mastra Agents:** Process inputs, query tools (e.g., `calculateMacroGoals`), and generate JSON data.
3.  **Firestore:** Stores User profiles (`users/{userId}`), Plans (`plans/{planId}`), and History.
4.  **Langfuse:** Traces agent execution and tool usage.

## Directory Structure
- `src/app/` - Next.js App Router pages and API routes.
- `src/components/` - React UI components (shadcn/ui in `ui/`).
- `src/lib/` - Shared utilities.
    - `db/` - Firestore client and repositories.
    - `services/` - Business logic layers.
- `src/mastra/` - Mastra configuration, agents, tools, and workflows.
- `docs/` - Detailed project documentation (Design, User Flow, etc.).
- `public/` - Static assets.

## Development Conventions
- **Styling:** Use Tailwind CSS utility classes.
- **Components:** Functional components with TypeScript interfaces.
- **AI Logic:** Keep AI logic within `src/mastra` to maintain separation of concerns.
- **State Management:** React Server Components (RSC) where possible, client components for interactivity.

## Environment Setup
Required environment variables in `.env.local`:
- Firebase Config (`NEXT_PUBLIC_FIREBASE_...`)
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` (Optional for tracing)
