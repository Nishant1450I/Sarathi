# Sarathi Learning Library Expansion: PRD and Build Prompt

Prepared for the Sarathi AI student portal, October 2026

## 1. Overview

The Learning Library (`/student/resources`) currently shows only a handful of resources, all of them text-based (documentation, handbooks, interactive tutorials). Students who open the page see about six cards, 0 in progress, 0 completed, and no video. This feels empty and does not help students close the skill gaps that the Skill Gap Analysis page identifies.

This project expands the library to a credible size, adds video content, and adds free YouTube content that students can watch inside Sarathi and track like any other resource.

## 2. Goals and Non-Goals

### Goals

- Grow the catalog from roughly 6 resources to at least 80, covering all five existing domains: Frontend & Web, Backend & System Design, AI & Machine Learning, Cloud & DevOps, and Cybersecurity.
- Add a new resource type, **Video**, and a **YouTube** source, with in-app playback and progress tracking.
- Include at least 30 free video resources (single videos and full playlists/courses) from well-known free educators.
- Make recommendations in the "Recommended for You" tab smarter by linking resources to the student's detected skill gaps.
- Keep every link working: add a validation script so dead resources are caught before deployment.

### Non-Goals

- No downloading, re-hosting, or scraping of YouTube video files. Playback uses only the official YouTube embed.
- No paid-course marketplace or payments.
- No user-uploaded content in this phase.
- No change to the visual design system (Tailwind v4 and Lucide only, per project rules).

## 3. Users and Problems

| User | Problem today | Outcome we want |
| --- | --- | --- |
| Student with identified skill gaps | Library has too few resources and nothing for their target role | Finds at least 3 relevant resources per gap, including a video option |
| Visual learner | No video content at all | Can watch a course without leaving Sarathi |
| Student on a tight budget | Unclear what is free | Every item clearly labelled FREE, with a Free Only filter that works |
| Student returning later | Progress is only per-card status | Sees "Continue watching" and playlist progress |

## 4. Scope

### 4.1 Content expansion

Target catalog (minimum counts, can exceed):

| Domain | Documentation / articles | Interactive / handbooks | Video (YouTube) | Total |
| --- | --- | --- | --- | --- |
| Frontend & Web | 6 | 4 | 8 | 18 |
| Backend & System Design | 5 | 4 | 8 | 17 |
| AI & Machine Learning | 5 | 4 | 7 | 16 |
| Cloud & DevOps | 5 | 3 | 7 | 15 |
| Cybersecurity | 4 | 4 | 6 | 14 |
| **Total** | **25** | **19** | **36** | **80** |

Topic ideas per domain (use these as the starting list, then pick the best free source for each):

- **Frontend & Web:** HTML and CSS fundamentals, modern JavaScript, React, TypeScript, Next.js, accessibility, web performance, Tailwind CSS, testing with Vitest.
- **Backend & System Design:** Node.js and Express, REST API design, SQL and database design, authentication and JWT, system design basics, caching, message queues, Python backend basics, API security.
- **AI & Machine Learning:** Python for data, NumPy and pandas, machine learning fundamentals, deep learning basics, prompt engineering, LLM application basics, MLOps introduction, data visualization.
- **Cloud & DevOps:** Linux and shell, Git and GitHub, Docker, Kubernetes basics, CI/CD with GitHub Actions, AWS/Azure/GCP fundamentals, Terraform basics, monitoring and logging.
- **Cybersecurity:** Security fundamentals, OWASP Top 10, networking basics, secure coding, cryptography basics, ethical hacking intro, incident response basics.

**Good free video sources to draw from** (the build must verify each specific video or playlist URL before adding it, not assume it exists): freeCodeCamp.org, CS50 (Harvard), Traversy Media, Fireship, Programming with Mosh, Net Ninja, Web Dev Simplified, Academind, TechWorld with Nana, KodeKloud, Hussein Nasser, ByteByteGo, Gaurav Sen, StatQuest, 3Blue1Brown, sentdex, Corey Schafer, NetworkChuck, David Bombal, The Cyber Mentor, and official channels such as Google Cloud Tech, AWS, Microsoft Developer, and the React and Next.js channels. Prefer channels with long-lived, regularly updated content and include a mix of English and (where good ones exist) Hindi-language resources, since many Indian students benefit from them.

### 4.2 New resource types

- `video`: a single YouTube video.
- `playlist`: a YouTube playlist or full course (for example, a multi-hour freeCodeCamp course split into chapters).
- Existing types (`documentation`, `handbook`, `interactive`) stay as they are.

### 4.3 In-app video player

- Clicking a video card opens a modal (reuse the existing `Modal` component) with the YouTube embed using `youtube-nocookie.com`.
- Use the official YouTube IFrame Player API so the app can detect play, pause, and end events.
- Show title, channel name, duration, level, tags, and an "Open on YouTube" link as a fallback.
- If the embed fails or is blocked, show a friendly message and the external link.
- For playlists, show a simple list of videos on the side with a checkmark for watched items.

### 4.4 Progress tracking

- Reuse `resource_progress`. Mark a video as **In Progress** when playback starts and **Completed** when the video ends or the student reaches 90% watched.
- For playlists, store the index of the last watched video and the set of completed items.
- Add a **Continue watching** row at the top of the "In Progress" tab.
- The three stat cards (In Progress, Completed Learning, Saved in My List) must update immediately.

### 4.5 Filters and discovery

- Add a **Format** filter: All, Documentation, Video, Playlist, Interactive, Handbook.
- Keep the existing domain chips, level dropdown, Free Only toggle, and search. Search must cover title, provider/channel, and tags.
- Add a sort control: Recommended, Newest, Shortest, Longest.
- Add pagination or a "Load more" button (12 items per page) since the catalog will grow.

### 4.6 Recommendations

- "Recommended for You" should rank resources by overlap with the student's detected skill gaps and target role from `StudentContext`.
- Each recommended card shows a short reason, for example "Recommended because you have a gap in TypeScript".
- If the student has not taken an assessment, show popular beginner resources for their target domain and a prompt to take the assessment.

### 4.7 Admin and maintenance

- Resources live in a seed file (`server/src/data/seeds/`) so the catalog is version-controlled and re-seedable without wiping user bookmarks or progress.
- Seeding must be idempotent: use a stable `id`/slug per resource and upsert.
- A validation script `npm run validate:resources` checks every URL (HTTP status for docs, YouTube oEmbed for videos), required fields, duplicate slugs, and valid domain and level values. It must fail the build if any resource is broken.

## 5. Data Model

Inspect the existing `learning_resources` table first and extend it with migrations rather than recreating it. Expected additions (adjust names to match the existing conventions):

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | text, unique | Stable identifier used by the seed upsert |
| `resource_type` | text | documentation, handbook, interactive, video, playlist |
| `source` | text | web, youtube |
| `youtube_video_id` | text, nullable | Set for videos |
| `youtube_playlist_id` | text, nullable | Set for playlists |
| `channel_name` | text, nullable | Shown as "by ..." |
| `thumbnail_url` | text, nullable | Use the standard `i.ytimg.com` thumbnail pattern |
| `duration_minutes` | integer | Approximate; playlists use the total |
| `language` | text | English, Hindi, etc. |
| `is_free` | integer (0/1) | Must be 1 for all items added in this phase |
| `skill_tags` | JSON text | Used for gap matching |
| `domain` | text | One of the five existing domains |
| `level` | text | Beginner, Intermediate, Advanced |
| `last_verified_at` | text | Set by the validation script |

A new table `resource_playlist_items` (resource\_id, position, video\_id, title, duration\_minutes) holds the chapters of a playlist. Extend `resource_progress` with `last_position_seconds` and `completed_item_ids` (JSON) if not already there.

## 6. API Changes

- `GET /api/resources`: add query params `type`, `domain`, `level`, `free`, `q`, `sort`, `page`, `pageSize`. Return total count for pagination.
- `GET /api/resources/recommended`: ranked list with a `reason` for each item, based on the authenticated student's gaps and target role.
- `GET /api/resources/:id`: full detail including playlist items.
- `POST /api/resources/:id/progress`: accept `status`, `lastPositionSeconds`, and `completedItemIds`.
- Existing bookmark endpoints stay unchanged.
- All endpoints remain authenticated, use parameterized SQL, and validate input with Zod.

## 7. Compliance and Safety

- Use only the official YouTube embed or links. Do not download, cache, or re-serve video files.
- Show the channel name and always provide an "Open on YouTube" link.
- Use `youtube-nocookie.com` for embeds, and add the needed domains to the Helmet content-security policy (`frame-src` for youtube-nocookie.com and youtube.com, `img-src` for i.ytimg.com, `script-src` for the YouTube IFrame API). Do not loosen the policy beyond that.
- Only include free content. Do not include affiliate links.
- Do not copy descriptions verbatim from sources. Write a short original summary (one or two sentences) for each resource.
- Respect any resource whose owner disallows embedding: fall back to a link-out card.

## 8. Acceptance Criteria

1. The library contains at least 80 active resources, with at least 10 per domain and at least 36 video or playlist items.
2. Every resource has all required fields, a working URL, a level, a domain, tags, and an original summary.
3. Video cards open an in-app player; playback starts, pauses, and ends without console errors.
4. Starting a video sets the status to In Progress; finishing it sets Completed; the stat cards update without a refresh.
5. Progress and bookmarks persist per user after logout and login, and are isolated between users.
6. The Format filter, domain chips, level, Free Only, search, and sort all work together.
7. "Recommended for You" shows gap-based reasons for a student with assessment data and sensible defaults for one without.
8. `npm run validate:resources` passes and is part of the pre-deploy checklist.
9. Re-running the seed does not duplicate resources or erase bookmarks and progress.
10. Existing tests still pass, and new tests cover the filters, the progress API, recommendations, and seed idempotency. TypeScript, lint, and `npm run build` pass.
11. The page works on mobile widths, with keyboard navigation and accessible labels for the player modal.
12. With demo mode off, nothing in this feature depends on demo data.

## 9. Success Metrics

- Share of active students who open at least one resource in their first week.
- Number of resources started and completed per student per month.
- Click-through from Skill Gap Analysis to the Learning Library.
- Percentage of skill gaps that have at least three matching resources (target: 100%).
- Broken-link rate (target: 0 at each release).

## 10. Phasing

| Phase | Work | Result |
| --- | --- | --- |
| 1 | Schema migration, seed format, validation script | Foundation ready |
| 2 | Seed 80+ resources across domains | Library looks full |
| 3 | Video player modal and progress tracking | Videos watchable in-app |
| 4 | Filters, sorting, pagination | Easy to browse |
| 5 | Gap-based recommendations | Personalized |
| 6 | Tests, accessibility pass, docs, changelog | Ready to ship |

## 11. Risks and Open Questions

- **Dead or removed videos.** Mitigated by the validation script; run it before every release and on a schedule.
- **Embeds disabled by some channels.** Mitigated by the link-out fallback.
- **Content quality and freshness.** Prefer well-known creators and note a "last verified" date.
- **Content-security policy.** Verify the YouTube embed works with production Helmet settings, not only in development.
- **Offline or restricted networks** (some colleges block YouTube). Cards must still work as links, and the page must not break if the YouTube script fails to load.
- **Open question:** should the placement cell or admin be able to add resources later through an admin UI? Out of scope here, but the seed format should make this easy.

---

# Build Prompt (paste into Antigravity, Claude Code, or your AI coding tool)

```text
You are a senior full-stack engineer working on the Sarathi AI repository
(React + Vite + TypeScript + Tailwind v4 frontend; Node.js + Express 5 +
node:sqlite backend). Read SARATHI_AI_PROJECT_CONTEXT.md and
SARATHI_FEATURE_INVENTORY.md first and follow their conventions.

TASK
Expand the Student "Learning Library" (/student/resources) from a few
resources to a full catalog of at least 80 free resources, add video
support, and add free YouTube content with in-app playback and progress
tracking. The full requirements are in the PRD "Sarathi Learning Library
Expansion". Implement all of it, in the phases below.

STEP 0: DISCOVER BEFORE YOU CODE
- Open package.json (root and server) and confirm the real versions of
  React, React Router, TypeScript, and Vitest. Do not assume; some docs
  disagree.
- Read: src/pages/student/ResourcesPage.tsx, server/src/routes/
  resourceRoutes.js, the resource service, server/src/data/schema.js, the
  existing seed files for learning_resources, and the tests that cover
  resources. Summarize what exists in a short note before changing anything.
- Confirm how resource_bookmarks and resource_progress work today.

PHASE 1: SCHEMA, SEED FORMAT, VALIDATION
- Add a migration (bump the schema version) that extends learning_resources
  with: slug (unique), resource_type, source, youtube_video_id,
  youtube_playlist_id, channel_name, thumbnail_url, duration_minutes,
  language, is_free, skill_tags (JSON), last_verified_at. Create
  resource_playlist_items. Extend resource_progress with
  last_position_seconds and completed_item_ids if missing. Keep existing
  rows and user progress intact.
- Create an idempotent seed (upsert by slug) in server/src/data/seeds/
  that never deletes bookmarks or progress.
- Create `npm run validate:resources`: checks required fields, duplicate
  slugs, valid domain/level/type values, and that every URL works (HTTP
  check for web links, YouTube oEmbed check for video/playlist IDs). It
  exits non-zero on any failure. If the sandbox has no internet, make the
  network check skippable with a flag and tell me clearly which checks
  were NOT run.

PHASE 2: CONTENT (80+ RESOURCES)
- Domains: Frontend & Web, Backend & System Design, AI & Machine Learning,
  Cloud & DevOps, Cybersecurity. Minimum 10 per domain, at least 36 video
  or playlist items, all free, a mix of Beginner/Intermediate/Advanced.
- Use official docs and free courses plus YouTube content from reputable
  channels (freeCodeCamp.org, CS50, Traversy Media, Fireship, Programming
  with Mosh, Net Ninja, TechWorld with Nana, KodeKloud, ByteByteGo,
  StatQuest, 3Blue1Brown, Corey Schafer, NetworkChuck, The Cyber Mentor,
  Google Cloud Tech, and similar).
- CRITICAL: Do NOT invent video IDs, playlist IDs, or URLs. Only include
  a YouTube resource if you have verified that the ID exists (via web
  access, the YouTube oEmbed endpoint, or a link I provided). If you
  cannot verify, list those resources in a file
  docs/RESOURCES_TO_VERIFY.md with the topic and suggested channel, and
  leave them out of the seed. Be honest about how many are verified.
- Write an original one or two sentence summary per item; do not copy
  descriptions from the source. Add skill_tags that match the skill names
  used in domainsCatalog.ts so gap-based recommendations work.

PHASE 3: VIDEO PLAYER AND PROGRESS
- Add a VideoPlayerModal component (reuse the existing Modal, keep files
  under 300 lines, split into subcomponents). Use the official YouTube
  IFrame Player API with youtube-nocookie.com. No downloading or
  re-hosting of video.
- Handle play, pause, and ended events: start -> In Progress; ended or
  90% watched -> Completed; save last position. For playlists, show the
  chapter list with watched checkmarks and resume at the last item.
- Fallbacks: if the embed or the API script fails, show a clear message
  and an "Open on YouTube" link. The page must not crash if YouTube is
  blocked.
- Update helmet CSP in server config minimally: frame-src for
  youtube-nocookie.com and youtube.com, img-src for i.ytimg.com,
  script-src for the YouTube IFrame API. Test with production settings.
- Stat cards (In Progress, Completed, Saved) update instantly.

PHASE 4: FILTERS, SORT, PAGINATION
- Add a Format filter (All, Documentation, Video, Playlist, Interactive,
  Handbook) and a sort control (Recommended, Newest, Shortest, Longest).
- Search must cover title, provider/channel, and tags.
- Server-side filtering and pagination (12 per page, Load more) via
  GET /api/resources with query params; validate with Zod; parameterized
  SQL only.
- Video cards show a thumbnail, a play icon, the channel name, and
  duration, using Tailwind v4 and Lucide only. No new UI libraries.

PHASE 5: RECOMMENDATIONS
- Implement GET /api/resources/recommended ranked by overlap between
  skill_tags and the student's detected skill gaps and target role.
  Return a short reason string per item (for example "Recommended because
  you have a gap in TypeScript"). With no assessment data, return popular
  beginner items for the target domain.

PHASE 6: TESTS AND QUALITY
- Add backend tests (node --test) for: filtering and pagination, progress
  updates, per-user isolation, recommendations, and seed idempotency.
  Add client tests (Vitest) for the filters and the player modal states.
- Run and report results of: npx tsc -b, npm run lint, npm test,
  npm run test:client, npm run validate:seeds, npm run validate:resources,
  npm run build. Paste real output summaries. If something could not be
  run, say so; never claim a check passed unless you ran it.
- Update CHANGELOG.md and SARATHI_FEATURE_INVENTORY.md.

RULES
- Preserve demo mode and the 'candidate' to 'student' role translation.
- Never trust client-side roles; keep all endpoints authenticated.
- Do not install heavy UI libraries. Keep components under 300 lines.
- Do not store or serve YouTube video files. Only official embeds/links.
- Do not commit secrets. Do not break existing tests.
- Work phase by phase. After each phase, stop with a short summary of what
  changed, files touched, and test results, then continue.

DELIVERABLE
A working expanded Learning Library, a verified seed with 80+ resources
(or an honest count plus docs/RESOURCES_TO_VERIFY.md for the rest), all
tests green, and a final report listing what is done, what is unverified,
and any follow-ups.
```

## 12. Tips for Using This

- Paste the prompt together with the three project context files (project context, feature inventory, and changelog) so the tool follows your conventions.
- Ask the tool to do one phase at a time and check the result before moving on.
- The most common failure is invented YouTube links. The prompt tells the tool not to guess, but still click through a sample of ten or so videos yourself before deploying.
- If you already have a list of videos or playlists you like, give the tool those links directly; that is more reliable than asking it to find them.
