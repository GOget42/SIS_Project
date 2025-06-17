# Development Setup

These instructions help you run and develop the project locally.

## Prerequisites

- Node.js >= 18
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Installing Dependencies

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
PUBLIC_SUPABASE_URL=<your-supabase-url>
PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> # for edge functions
```

## Running the App

Start the SvelteKit dev server:

```bash
npm run dev
```

## Running Tests

Vitest is used for testing:

```bash
npm test
```

## Building for Production

```bash
npm run build
```
