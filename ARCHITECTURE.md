# Adit Scribe - Architecture & Tech Stack Document

## What is Adit Scribe?

Adit Scribe is an AI-powered clinical documentation platform built for dental and ophthalmology practices. It allows clinicians to record patient encounters, automatically transcribes the audio, and generates structured clinical notes (SOAP format) using AI. The platform has both a web application and a mobile app.

---

## High-Level Architecture

```
                        +------------------+
                        |   Web Browser    |
                        |  (Next.js App)   |
                        +--------+---------+
                                 |
                                 v
+------------------+    +--------+---------+    +------------------+
|   Mobile App     |--->|   Next.js API    |<---|   PostgreSQL     |
|  (Expo/React     |    |   (Backend)      |    |   Database       |
|   Native)        |    +--------+---------+    +------------------+
+------------------+             |
                                 v
                        +--------+---------+
                        |     Redis        |
                        |   (Job Queue)    |
                        +--------+---------+
                                 |
                                 v
                        +--------+---------+
                        |  BullMQ Workers  |
                        |  (Background)    |
                        +--------+---------+
                              /        \
                             v          v
                    +-----------+  +-----------+
                    | ElevenLabs|  |  OpenAI   |
                    | (Audio to |  | (Text to  |
                    |   Text)   |  |   SOAP    |
                    +-----------+  |   Note)   |
                                   +-----------+
                                        |
                                        v
                               +-----------+
                               |  AWS S3   |
                               | (Audio    |
                               |  Storage) |
                               +-----------+
```

---

## How the Core Flow Works

Here is the end-to-end journey of a recording becoming a clinical note:

### Step 1: Recording
The clinician opens the app (web or mobile), selects an encounter type (e.g., "Dental Exam" or "Eye Exam"), optionally enters patient initials, and starts recording audio of the patient encounter.

### Step 2: Upload
When the recording stops, the audio file is uploaded to AWS S3 cloud storage. A new "Encounter" record is created in the database.

### Step 3: Transcription (Background)
A background worker picks up the job from a Redis queue, downloads the audio from S3, and sends it to the **ElevenLabs Scribe API**. ElevenLabs returns the full text transcription with word-level timestamps. This is stored in the database.

### Step 4: Note Generation (Background)
Another background worker takes the transcription text and sends it to **OpenAI GPT-4o** with medical scribe guidelines. GPT-4o returns a structured SOAP note with sections like Chief Complaint, History of Present Illness, Assessment & Plan, etc. Each section includes "evidence links" that map back to specific timestamps in the transcript.

### Step 5: Review & Edit
The clinician reviews the generated note in a rich text editor. They can:
- Edit any section inline
- Click on evidence links to hear the exact audio segment
- Play back the full recording with synchronized transcript highlighting
- Switch between paragraph and bullet point formatting

### Step 6: Sign
When satisfied, the clinician signs the note. This locks it as read-only, records the timestamp and signer, and creates a version history entry.

---

## Tech Stack Breakdown

### Web Application

| Technology | Version | What It Does |
|-----------|---------|-------------|
| Next.js | 16.1.6 | The main web framework - handles both the website pages and the backend API |
| React | 19.2.3 | UI rendering library |
| TypeScript | 5.x | Adds type safety to JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS framework for styling |
| Tiptap | 3.19.0 | Rich text editor used for editing clinical notes |
| shadcn/ui | - | Pre-built UI components (buttons, cards, dialogs, etc.) |
| Lucide React | 0.563.0 | Icon library |
| Sonner | 2.0.7 | Toast notification popups |

### Mobile Application

| Technology | Version | What It Does |
|-----------|---------|-------------|
| Expo | 54.0.33 | React Native framework for building the iOS/Android app |
| React Native | 0.81.5 | Cross-platform mobile UI framework |
| Expo Router | 6.0.23 | File-based navigation for mobile screens |
| Expo AV | 16.0.8 | Audio recording and playback on mobile |
| Expo Secure Store | 15.0.8 | Encrypted storage for auth tokens on device |
| Zustand | 5.0.11 | Lightweight state management for mobile |

### Backend & Database

| Technology | Version | What It Does |
|-----------|---------|-------------|
| PostgreSQL | - | Main database storing all data (users, encounters, notes, etc.) |
| Prisma | 7.3.0 | Database toolkit/ORM - translates TypeScript code into SQL queries |
| Redis | - | In-memory data store used as the job queue backend |
| BullMQ | 5.67.3 | Job queue system that manages background transcription and note generation |

### AI Services

| Service | What It Does |
|---------|-------------|
| ElevenLabs Scribe API | Converts audio recordings to text with word-level timestamps |
| OpenAI GPT-4o | Generates structured SOAP clinical notes from transcription text |

### Authentication

| Technology | Version | What It Does |
|-----------|---------|-------------|
| NextAuth.js | 5.0.0-beta.30 | Handles web login sessions (cookie-based) |
| bcryptjs | 3.0.3 | Securely hashes passwords |
| jose | 5.x | Creates and verifies JWT tokens for mobile auth |

### Cloud & Storage

| Service | What It Does |
|---------|-------------|
| AWS S3 | Stores uploaded audio files in the cloud |
| Railway | Cloud hosting platform where the app is deployed |

---

## Database Schema (What Data is Stored)

### User
Stores clinician accounts.
- Name, email, hashed password
- Role: CLINICIAN, ADMIN, or SUPER_ADMIN
- Specialty and license number
- MFA (multi-factor auth) settings

### Encounter
Represents a single patient visit/recording session.
- Linked to a User
- Encounter type: General, Dental Exam, Dental Procedure, Eye Exam, Eye Procedure, Follow-up, Initial Consult, Emergency, Telehealth
- Status tracking: RECORDING -> UPLOADING -> TRANSCRIBING -> GENERATING_NOTE -> REVIEW -> COMPLETED (or ERROR)
- Audio file reference (S3 key and URL)
- Duration in seconds
- Optional patient initials

### Transcription
The text output from audio processing.
- Full text of what was said
- Segments array with timestamps (e.g., "Patient reports pain at 0:32-0:35")
- Confidence score
- Processing time in milliseconds

### ClinicalNote
The AI-generated (and human-edited) clinical document.
- Structured SOAP content (JSON with sections)
- Raw text content for search
- Evidence links mapping note sections to transcript timestamps
- Status: DRAFT -> REVIEW -> FINAL -> SIGNED (or AMENDED)
- Version number (increments with each edit)
- LLM metadata (which model, token counts)
- Signed timestamp and signer

### NoteHistory
Version control for notes - every edit creates a history entry.
- Full content snapshot
- Version number
- Who made the change
- Change type: GENERATED, EDITED, or SIGNED

### UserPreference
Per-user settings.
- Default note type (SOAP, etc.)
- Theme preference
- Note format: paragraph or bulleted
- Which SOAP sections to show/hide

---

## API Endpoints

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | Web login/logout/session management |
| `/api/mobile-auth` | POST | Mobile login - returns JWT token |
| `/api/mobile-auth` | GET | Verify mobile token, get user profile |

### Encounters (Recordings)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/encounters` | POST | Create new encounter (starts transcription) |
| `/api/encounters` | GET | List all encounters for the user |
| `/api/encounters/[id]` | GET | Get specific encounter details |
| `/api/encounters/[id]` | DELETE | Delete an encounter and its audio |

### Clinical Notes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notes` | GET | List notes with search/filter |
| `/api/notes/[id]` | GET | Get a specific note with transcription |
| `/api/notes/[id]` | PATCH | Update note content (auto-versions) |
| `/api/notes/[id]` | DELETE | Delete a note |

### Upload & Audio
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload/presigned` | POST | Upload audio file, get S3 storage key |
| `/api/audio/[...path]` | GET | Serve audio files (local dev fallback) |

### Dashboard
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard` | GET | Get stats: total encounters, notes this week, pending review |

---

## Authentication System

### Web (Browser)
1. User enters email/password on login page
2. NextAuth.js verifies credentials against the database (bcrypt password check)
3. A secure session cookie is set in the browser
4. All subsequent requests include this cookie automatically
5. Middleware checks for valid session on protected pages

### Mobile (App)
1. User enters email/password in the mobile app
2. App sends credentials to `/api/mobile-auth`
3. Server validates and returns a JWT token (valid for 30 days)
4. Token is stored in the device's encrypted keychain (Expo Secure Store)
5. Every API request includes the token in the `Authorization: Bearer <token>` header
6. If the token expires (401 response), the user is automatically logged out

---

## Background Worker System

The app uses **BullMQ** (a Node.js job queue) with **Redis** to process audio in the background. This means the user doesn't have to wait - they can close the app and come back later.

### Transcription Worker
- **Concurrency**: 3 jobs at once
- **What it does**: Downloads audio from S3, sends to ElevenLabs, stores result
- **Retry**: Up to 3 attempts with exponential backoff (5 second base delay)
- **On success**: Automatically enqueues note generation job

### Note Generation Worker
- **Concurrency**: 2 jobs at once
- **What it does**: Takes transcription text, sends to GPT-4o, stores SOAP note
- **Retry**: Up to 3 attempts with 10 second base delay
- **On success**: Updates encounter status to REVIEW

### Job Retention
- Completed jobs kept for 24 hours
- Failed jobs kept for 7 days (for debugging)

---

## Project Structure

```
AI Scribe/
|
|-- src/                          # Web application source code
|   |-- app/                      # Next.js pages and routes
|   |   |-- (auth)/               # Login and register pages
|   |   |-- (dashboard)/          # Protected pages (dashboard, notes, record, settings)
|   |   |-- api/                  # Backend API endpoints
|   |   |-- layout.tsx            # Root page layout
|   |
|   |-- components/               # Reusable UI components
|   |   |-- auth/                 # Login/register forms
|   |   |-- layout/               # Sidebar, header
|   |   |-- notes/                # Note editor, toolbar, audio player
|   |   |-- recording/            # Audio visualizer, timer, upload progress
|   |   |-- settings/             # Preferences form
|   |   |-- ui/                   # Base UI components (button, card, dialog, etc.)
|   |
|   |-- lib/                      # Core utilities
|   |   |-- auth.ts               # NextAuth configuration
|   |   |-- prisma.ts             # Database client
|   |   |-- storage.ts            # S3/local file storage
|   |   |-- queue.ts              # BullMQ queue setup
|   |   |-- redis.ts              # Redis connection
|   |
|   |-- workers/                  # Background job processors
|   |   |-- transcription.worker.ts
|   |   |-- note-generation.worker.ts
|   |   |-- index.ts              # Worker entry point
|   |
|   |-- actions/                  # Server actions (form submissions)
|   |-- hooks/                    # React hooks (audio player, encounter status)
|   |-- types/                    # TypeScript type definitions
|   |-- providers/                # Context providers (query, session, theme)
|
|-- mobile/                       # Mobile app source code
|   |-- app/                      # Expo Router screens
|   |   |-- (auth)/               # Login screen
|   |   |-- (tabs)/               # Tab screens (dashboard, record, notes, settings)
|   |-- components/               # Mobile UI components
|   |-- hooks/                    # Mobile hooks (audio recorder)
|   |-- lib/                      # Mobile utilities (API client, auth store)
|
|-- prisma/
|   |-- schema.prisma             # Database schema definition
|   |-- migrations/               # Database migration files
|
|-- docker-entrypoint.sh          # Docker startup script
|-- Dockerfile                    # Web server container
|-- Dockerfile.worker             # Worker container
|-- next.config.ts                # Next.js configuration
|-- package.json                  # Dependencies
```

---

## Deployment Architecture (Railway)

The app runs on **Railway** with 4 services:

| Service | What It Runs | Docker Image |
|---------|-------------|-------------|
| **Web** | Next.js app (frontend + API) | Dockerfile |
| **Worker** | BullMQ background processors | Dockerfile.worker |
| **PostgreSQL** | Database | Railway managed |
| **Redis** | Job queue backend | Railway managed |

**Deployment URL**: `https://web-production-a70db.up.railway.app`

### How Deployment Works
1. Code is pushed to the repository
2. Railway builds Docker images
3. Web service runs database migrations (`prisma migrate deploy`)
4. Web service starts Next.js server on port 3000
5. Worker service starts the BullMQ workers
6. Both services connect to the same PostgreSQL and Redis instances

---

## Environment Variables

The app needs these environment variables configured:

### Required
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `AUTH_SECRET` | Secret key for signing auth tokens |
| `AUTH_URL` | Base URL of the web app |
| `OPENAI_API_KEY` | OpenAI API key for note generation |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for transcription |

### Storage (S3)
| Variable | Purpose |
|----------|---------|
| `AWS_REGION` | AWS region (e.g., us-east-1) |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `S3_BUCKET_NAME` | S3 bucket for audio files |

### Optional
| Variable | Purpose |
|----------|---------|
| `AUTH_TRUST_HOST` | Set to "true" for Railway/Docker |
| `NEXT_PUBLIC_APP_URL` | Public URL for the web app |
| `EXPO_PUBLIC_API_URL` | API URL for the mobile app |
| `SENDGRID_API_KEY` | Email service (if email features used) |

---

## Key Screens

### Web App
1. **Login** - Email/password authentication
2. **Dashboard** - Stats overview (total encounters, notes this week, pending review) + recent notes
3. **Record** - Audio recording with live waveform visualization, encounter type selector
4. **Notes List** - Searchable, filterable list of all clinical notes with status badges
5. **Note Editor** - Split-view with SOAP note editor on left, transcript on right, audio player at bottom
6. **Settings** - Note format preferences (paragraph vs. bullet), visible SOAP sections

### Mobile App
1. **Login** - Same credentials as web
2. **Dashboard** - Stats cards + recent notes list
3. **Record** - Audio recording with visualizer, encounter type picker
4. **Notes List** - Scrollable list with search and status filters
5. **Note Detail** - Read-only note view with processing status polling
6. **Settings** - Preferences + logout

---

## SOAP Note Structure

The AI generates notes in SOAP (Subjective, Objective, Assessment, Plan) format with these sections:

| Section | What It Contains |
|---------|-----------------|
| Chief Complaint | Why the patient is visiting |
| History of Present Illness | Detailed description of the current problem |
| Past Medical History | Previous conditions, surgeries, hospitalizations |
| Medications | Current medications and dosages |
| Social History | Lifestyle factors (smoking, alcohol, occupation) |
| Family History | Medical conditions in the family |
| Review of Systems | Systematic symptom review by body system |
| Physical Exam | Findings from the physical examination |
| Assessment & Plan | Diagnosis and treatment plan |

Each section includes **evidence links** - clickable references that jump to the exact moment in the audio recording where that information was mentioned.

---

## Security Features

- **Password Hashing**: All passwords hashed with bcrypt (never stored in plain text)
- **JWT Tokens**: Mobile auth tokens are cryptographically signed and expire after 30 days
- **Secure Storage**: Mobile tokens stored in device encrypted keychain
- **Role-Based Access**: Users can only see their own data
- **Session Management**: Web sessions managed by NextAuth with secure cookies
- **CORS Headers**: API routes configured to accept cross-origin requests from the mobile app

---

## Branding

| Element | Value |
|---------|-------|
| App Name | Adit Scribe |
| Primary Color (Orange) | `#F4891F` |
| Hover Orange | `#d97a1a` |
| Navy (Headings) | `#002D42` |
| Tagline | AI-Powered Clinical Documentation for Dental & Ophthalmology Practices |
| Logo Style | "Adit" in navy + "Scribe" in orange with Stethoscope icon |
