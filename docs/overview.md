# Project Overview

This Student Information System (SIS) manages students, courses, staff and enrollments. The web interface is built using SvelteKit and TailwindCSS while Supabase provides the database and authentication layer.

## Features

- Authentication with Supabase.
- Separate dashboards for students, instructors and admins.
- CRUD operations for courses, students, enrollments and staff.
- Supabase Edge Functions for managing users (`create-user` and `delete-user`).
- Unit tests using Vitest and Testing Library.

## Directory Structure

- `src/` – SvelteKit source code.
- `supabase/` – Supabase configuration and edge functions.
- `docs/` – Project documentation.
