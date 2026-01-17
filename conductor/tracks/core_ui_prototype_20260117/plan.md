# Plan: Core UI Prototype

## Phase 1: Project Setup & Layout
- [ ] Task: Initialize Next.js 16 Project
  - Create new Next.js app with TypeScript, Tailwind CSS, ESLint.
  - Install shadcn/ui and initialize.
  - Configure theme colors (Green/Orange) in `globals.css`.
  - [ ] Subtask: Verify project build and start.
- [ ] Task: Create App Layout
  - Implement `layout.tsx` with a common header/footer (if needed) or mobile-app-like shell.
  - Install `lucide-react` for icons.
- [ ] Task: Conductor - User Manual Verification "Phase 1: Project Setup & Layout" (Protocol in workflow.md)

## Phase 2: Home Screen (Mood Selection)
- [ ] Task: Create Mock Data
  - Define TypeScript interfaces for Mood, Ingredients, and Recipe.
  - Create `mock/data.ts` with sample cuisines, flavors, and initial recipes.
- [ ] Task: Implement Mood Selection UI
  - Create `components/mood-selector.tsx`.
  - Use shadcn/ui Cards for cuisines.
  - Use shadcn/ui Slider for flavor balance.
  - Implement state management for user selection.
- [ ] Task: Conductor - User Manual Verification "Phase 2: Home Screen" (Protocol in workflow.md)

## Phase 3: Recipe List & Detail Screens
- [ ] Task: Implement Recipe List Page
  - Create `app/recipes/page.tsx`.
  - Display mock recipes based on (simulated) query params or state.
  - Implement Recipe Card component.
- [ ] Task: Implement Recipe Detail Page
  - Create `app/recipes/[id]/page.tsx`.
  - Display full recipe details (Ingredients, Steps, Nutrition).
  - Implement "Cooked" or "Feedback" placeholder button.
- [ ] Task: Conductor - User Manual Verification "Phase 3: Recipe Screens" (Protocol in workflow.md)

## Phase 4: Navigation & Polish
- [ ] Task: Implement Navigation Flow
  - Connect Home -> Recipe List -> Recipe Detail using `next/link`.
  - Ensure back navigation works smoothly.
- [ ] Task: UI Polish & Responsive Check
  - Verify layout on mobile viewports.
  - Adjust spacing and typography.
- [ ] Task: Conductor - User Manual Verification "Phase 4: Navigation & Polish" (Protocol in workflow.md)
