# Student Information System User Manual

Welcome! This project is a Svelte based Student Information System that uses Supabase for authentication and data storage. This guide explains how to set up the application and describes the main features available to users.

## 1. Installation

1. Install Node.js (version 18 or later is recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create an `.env` file in the project root with your Supabase credentials. At minimum, define:
   ```bash
   PUBLIC_SUPABASE_URL=your-supabase-url
   PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   If you use Supabase Edge Functions, also provide the service role key:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## 2. Development workflow

Start a development server with hot reloading:
```bash
npm run dev
```
Visit `http://localhost:5173` in your browser to view the app. Any code changes will reload automatically.

Run unit tests with:
```bash
npm test
```
Lint and format the project using:
```bash
npm run lint
npm run format
```

## 3. Building for production

Create an optimized production build:
```bash
npm run build
```
Preview the build locally:
```bash
npm run preview
```
Deploy the build output with a supported SvelteKit adapter for your target environment.

## 4. Basic usage

### Sign Up
1. Navigate to `/signup`.
2. Fill in your name, email, password and select a role (student, instructor or admin).
3. Submit the form to create your account.

### Login
1. Navigate to `/login`.
2. Enter your email and password, then press **Log In**.
3. On success you will be redirected to `/private/home`.

### Logout
Visit `/logout` to end your session and return to the login screen.

## 5. Role specific features

- **Students** can view their enrolled courses, assignment grades and progress charts.
- **Instructors** can see teaching courses and charts about student enrollment and assignments.
- **Admins** can manage courses and users through the staff and students pages, including creating new student accounts.

Navigate through the private routes under `/private/*` to access functionality according to your role.

## 6. Troubleshooting

- If the application cannot connect to Supabase, verify the values in your `.env` file.
- Check the terminal running `npm run dev` for error messages.
- When creating users through the admin pages, ensure your logged‑in account has the admin role so the Supabase functions can authorize the request.

For additional details on the codebase, see the inline comments in the source files. Enjoy using the Student Information System!
