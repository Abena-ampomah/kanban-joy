# Backend Setup Plan

## Status

I was unable to automatically create the backend on Supabase because I lack the necessary authorization token for the Supabase MCP.

## Instructions

To assume control of the backend or create a new one, please follow these steps:

1. **Authorize Supabase**: Ensure you have logged in to Supabase CLI or provided an access token.
2. **Create Project**: Create a new Supabase project or link an existing one.
    - If you have an existing project (ID: `xwzaxvgjsfkvqmptlpfi`), you can use it.
    - Otherwise, create a new project.
3. **Apply Migrations**:
    - Run `supabase db push` or manually apply the SQL files located in `supabase/migrations/` to your project's SQL Editor.
    - The latest migration `20260216102817_31223b27-c0e1-4b41-96a2-59e82c5de286.sql` contains the most up-to-date policies.
4. **Deploy Edge Functions**:
    - Deploy the functions in `supabase/functions/` using `supabase functions deploy`.
    - Functions include: `ai-chat`, `elevenlabs-scribe-token`, `summarize-notes`.
5. **Environment Variables**:
    - Update `.env` with your new `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Code Fixes Applied

I have reviewed the code and applied the following fixes:

- **AuthContext.tsx**: Fixed race conditions in session initialization and added error handling for profile data fetching.
- **AIChatbot.tsx**: improved the SSE (Server-Sent Events) stream reading logic to be more robust and handle potential errors during the chat stream.

The local development environment requires `npm install` to be run successfully. I encountered permission issues with the local npm cache which you may need to resolve using `sudo` or by fixing permissions on `~/.npm`.
