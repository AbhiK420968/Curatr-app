# 🗺️ Curatr App — Project Context

**Type**: React Native Mobile App (Expo 51)  
**Stack**: Expo / React Native · TypeScript · expo-router (file-based routing) · Clerk (auth) · Supabase (database) · Puter.js (free AI via Gemini)

---

## 📁 Project Structure

```
e:\Curatr_app\
├── app/                        # expo-router pages
│   ├── _layout.tsx             # Root layout — ClerkProvider + AuthProvider + ItineraryProvider
│   ├── index.tsx               # Splash/redirect — sends to onboarding or (tabs)
│   ├── onboarding.tsx          # First-launch onboarding carousel
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # Sign-in screen
│   │   └── signup.tsx          # Sign-up screen
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tab navigator (Home, Explore, Trips, Create, Profile)
│   │   ├── index.tsx           # Home/Dashboard screen
│   │   ├── explore.tsx         # Explore screen
│   │   ├── trips.tsx           # Trips list (upcoming + past)
│   │   ├── create.tsx          # Trip creation wizard (multi-step)
│   │   ├── profile.tsx         # User profile with stats, badges, friends
│   │   └── splitwise.tsx       # Group expense tracker
│   └── trip/
│       ├── [id].tsx            # Trip detail page
│       ├── create.tsx          # Trip creation entry
│       ├── generate.tsx        # Multi-step AI itinerary generator wizard
│       ├── generate-result.tsx # Result before saving
│       ├── itinerary-result.tsx# Detailed itinerary viewer (day-by-day, map)
│       └── import.tsx          # Import trip from text
├── services/
│   ├── supabase.ts             # Supabase client (SUPABASE_URL + ANON_KEY must be set)
│   ├── authService.ts          # Auth helper (delegates to Supabase auth — TO BE UPDATED for Clerk)
│   ├── tripService.ts          # Trip CRUD — currently via backend api.ts; to be migrated to Supabase
│   ├── friendsService.ts       # Friends / social — Supabase
│   ├── puterItineraryService.ts# AI itinerary generation via Puter.js (free Gemini)
│   ├── api.ts                  # Legacy Axios client pointing to Express backend (port 5000)
│   ├── map-html.ts             # Generates HTML for embedded map with OSRM routes
│   └── shareUtils.ts           # Share trip helpers
├── contexts/
│   ├── AuthContext.tsx         # AuthProvider & useAuth hook (to be updated for Clerk)
│   └── itinerary-context.tsx   # ItineraryProvider for generated trips
├── constants/
│   ├── colors.ts               # Design tokens: Colors
│   ├── typography.ts           # FontFamily, FontSize
│   ├── spacing.ts              # Spacing, BorderRadius, Shadows
│   └── index.ts                # Re-exports everything
├── types/                      # Shared TypeScript types (Itinerary, etc.)
├── assets/                     # Images, fonts
└── app.json                    # Expo app config
```

---

## 🔑 Key Tech Decisions

| Area | Decision |
|---|---|
| **Auth** | Clerk (`@clerk/clerk-expo`) — email/password + social OAuth |
| **Database** | Supabase (Postgres) — trips, friends, profiles tables |
| **AI** | Puter.js → free Google Gemini (no API key needed) |
| **Maps** | Embedded WebView with OpenStreetMap + OSRM routing |
| **Routing** | expo-router (file-based, like Next.js App Router) |
| **Currency** | ₹ rupee throughout the app |
| **State** | React Context (AuthContext, ItineraryContext) |

---

## 🗄️ Supabase Tables (Target Schema)

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | matches Clerk user ID |
| email | text | |
| name | text | |
| avatar_url | text | |
| travel_preferences | jsonb | travelStyles, budget, etc. |
| created_at | timestamptz | |

### `trips`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text | Clerk user ID |
| destination | text | |
| duration | int | days |
| itinerary_data | jsonb | full AI-generated itinerary |
| status | text | 'upcoming' or 'past' |
| created_at | timestamptz | |

### `friends` (optional)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text | requester Clerk ID |
| friend_id | text | recipient Clerk ID |
| status | text | 'pending' / 'accepted' |

---

## 🔧 Auth Flow

1. App opens → `app/index.tsx` checks Clerk session
2. No session → redirect to `/onboarding` → `/login` or `/signup`
3. Session exists → redirect to `/(tabs)`
4. Profile page reads user data from `useUser()` Clerk hook
5. Trip data stored in Supabase `trips` table, keyed by Clerk `userId`

---

## ⚙️ Env Variables Needed

| Key | Where |
|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env` (Clerk dashboard → API Keys) |
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (Supabase dashboard → Settings → API) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` (Supabase dashboard → Settings → API) |

---

## 📅 Last Session (March 2026)
- Integrated Clerk for authentication (replacing Supabase auth)
- Set up real Supabase database connection
- Auth screens (login/signup) wired to Clerk
- Profile screen reads from Clerk `useUser()` hook
- Trip data CRUD via Supabase `trips` table
