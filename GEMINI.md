# Zupiq Web (Frontend)

## Tech Stack
- **Framework**: React 19 (TypeScript)
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand (implied by `store/` directory)
- **Backend Services**: Supabase (Postgres, Auth, Storage), Firebase (Analytics/Notifications)
- **UI Components**: Lucide React (Icons), Motion (Animations), Recharts (Charts)
- **Math Rendering**: KaTeX

## Development Workflow
- **Start Dev Server**: `npm run dev` (uses `vite --force`)
- **Type Check**: `npm run lint` (runs `tsc --noEmit`)
- **Build**: `npm run build`

## Architectural Mandates

### 1. Visual Table System
- **Rendering**: Use the `VisualTable` component.
- **Internationalization**: Always wrap text in `SafeText` to prevent KaTeX crashes with non-Latin scripts (e.g., Khmer).
- **Data Parsing**: Use `parseJsonSafe` when retrieving table data from the database to handle potential double-serialization.

### 2. Subscription & Entitlements
- **Access Control**: DO NOT check plan names (e.g., `plan === 'pro'`). Use centralized entitlement checks (e.g., `canAccess(user, 'knowledge_maps')`).
- **Plan Tiers**:
  - `free`: Scholar ($0)
  - `core`: Builder ($5)
  - `pro`: Architect ($9.99)
- **Normalization**: Maintain a normalized subscription object independent of the billing provider (Stripe/RevenueCat).

### 3. Quiz System
- **Separation of Concerns**: Keep Quizzes (templates), Attempts (user sessions), and Evaluations (grading) as separate records.
- **Grading Logic**: Use deterministic grading (exact match) for MCQs/Numeric before falling back to AI grading for written answers.
- **Data Integrity**: Always store raw AI outputs and raw user answers for auditing and debugging.

## Coding Standards
- **Component Structure**: Keep components small and focused. Use hooks for logic.
- **Typing**: Strict TypeScript. Avoid `any`. Define interfaces in `types/`.
- **Styling**: Prefer Tailwind utility classes.
- **Error Handling**: Graceful fallbacks for AI generation and data parsing.

## Key Directories
- `components/ui/`: Reusable primitive components.
- `hooks/`: Domain-specific logic (e.g., `useQuiz`, `useAuth`).
- `lib/`: Third-party service initializations and core utilities.
- `pages/`: Main application views.
- `store/`: Global state using Zustand.
- `types/`: Shared TypeScript definitions.
