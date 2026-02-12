
## Overview

- The client fetches an active attempt (or creates/resumes one) and receives: quiz metadata, list of questions, current `attemptId`, `timeRemaining`, and any saved `answers`.
- Questions are rendered incrementally for performance; answers are saved locally and to a persistence store.
- Multi-select answers are stored as arrays on the client but encoded as a pipe-separated string (e.g. "A|B") for submission (this matches existing web code). The mobile API accepts both arrays and JSON strings—see samples.
- If `quiz.checkAnswerEnabled` is true, the client supports an instant check feature: showing the correct answer and explanation locally and locking that question (preventing changes).
- When time expires or the user finishes, the client submits answers to the submit endpoint and navigates to the result page.

## Key fields (question object)

Each question object sent to the client has these fields:
- `id` (string)
- `title` (string)
- `content` (string, rich HTML/text)
- `type` (enum): `MULTIPLE_CHOICE`, `MULTI_SELECT`, `TRUE_FALSE`, `FILL_IN_BLANK`
- `options` (array of strings)
- `correctAnswer` (string): for `MULTI_SELECT` uses pipe-separated values (e.g. `"A|B"`) in this codebase; for `MULTIPLE_CHOICE` it can be an index string or option value depending on quiz setup; for `FILL_IN_BLANK` it's the expected text.
- `explanation` (string)
- `points` (number)

Server-side responses may wrap these under `quiz.questions` or `data.quiz.questions` depending on API variant.

## Endpoints (web component -> mobile API mapping)

- Web component fetch URL (used in `page.tsx`):
  - GET `/api/user/quiz/{id}/attempt` — returns attempt, quiz, timeRemaining, and saved answers.
  - POST `/api/user/quiz/{id}/submit` — submit final answers.

- Mobile-compatible API (documented in `MOBILE_API.md`):
  - GET `/api/mobile/quiz/{id}` — Take/continue quiz (returns `attemptId`, `quiz`, `timeRemaining`, `answers`).
  - POST `/api/mobile/quiz/{id}/submit` — Submit quiz (body contains `attemptId` and `answers`).

The web component's payloads and the `MOBILE_API.md` payloads match in structure; adapt client encoding rules below when talking to `/api/mobile/*` endpoints.

## Fetching an attempt (GET)

- Purpose: start or resume a quiz attempt. The server returns an `attemptId`, `quiz` with `questions`, `timeRemaining`, `startedAt`, and optionally `answers` (saved so far).

Sample mobile GET response (successful):

```json
{
  "success": true,
  "data": {
    "attemptId": "clxxxxxx",
    "quiz": {
      "id": "clq1",
      "title": "Sample Quiz",
      "timeLimit": 30,
      "showAnswers": false,
      "checkAnswerEnabled": true,
      "questions": [
        {
          "id": "q1",
          "title": "S3 classes",
          "content": "Which S3 storage class is designed for rare access?",
          "type": "MULTIPLE_CHOICE",
          "options": ["Standard","Standard-IA","Glacier","One Zone-IA"],
          "correctAnswer": "2",
          "explanation": "Glacier is meant for archiving",
          "points": 1
        }
      ]
    },
    "timeRemaining": 1800,
    "startedAt": "2024-01-15T14:00:00Z",
    "answers": {}
  }
}
```

Notes:
- `timeRemaining` is returned in seconds. Client computes the timer and periodically updates local store.
- `options` can be an array or stored as a JSON string on the DB; server normalizes to an array before returning.

## Answer encoding rules (client-side)

- `MULTIPLE_CHOICE`: send one string value. Many systems use option indices (e.g. "0"/"1"), or the option label. The current web component sends the option string (value), and for rendering uses equality with `currentQuestion.correctAnswer` to highlight.
- `TRUE_FALSE`: send string "true" or "false".
- `FILL_IN_BLANK`: send plain string with the user's text answer.
- `MULTI_SELECT`: client keeps answers as `string[]` while user is selecting. When submitting, the web component converts arrays to a pipe-separated string: `['A','B']` -> `"A|B"`.
  - The mobile API accepts either an array or a JSON-string. For compatibility, prefer arrays in mobile requests. The server code in this project accepts pipe-separated string as well, so both are supported.

  ## Admin quiz settings

  The quiz object returned from the server includes administrative settings that control availability, scoring, and runtime behavior. These fields are present in the web admin UI and must be respected by mobile clients and server logic:

  - `startTime` (ISO datetime|null): When the quiz becomes available. If now < `startTime`, clients should show the quiz as `not_started_yet` and prevent attempts.
  - `endTime` (ISO datetime|null): When the quiz expires. After this, attempts should be blocked or treated as `expired`.
  - `timeLimit` (number|null): Duration in minutes for the attempt. The server returns `timeRemaining` (seconds) derived from this and the attempt's `startedAt` timestamp; clients use it to drive the countdown.
  - `negativeMarking` (boolean): Whether wrong answers cause negative deduction.
  - `negativePoints` (number|null): Points to subtract for incorrect answers (per-question or per-policy).
  - `randomOrder` (boolean): If true, the server may shuffle `quiz.questions` or `quiz.questions[*].options`. When shuffling options, the server MUST return `correctAnswer` that matches the shuffled representation (prefer returning the option value, not an index) so clients can render and check correctly.
  - `maxAttempts` (number|null): Max attempts allowed per user. The server enforces this and returns attempt status and `canAttempt` boolean in list endpoints.
  - `showAnswers` (boolean): Whether final answers/explanations can be shown after submission (or during attempt if allowed). Controls `canShowAnswers` on the client.
  - `checkAnswerEnabled` (boolean): Whether the instant check feature is enabled for users during attempt.
  - `difficulty` (string|null): Quiz difficulty metadata (informational).
  - `status` (string): Administrative status (e.g., `published`, `draft`, `archived`) used by admin UI and possibly by attempt creation rules.

  How settings affect client behavior and server responsibilities:

  - Availability: Client should prevent starting an attempt when `startTime` is in the future or `endTime` is past; server should enforce the same on attempt creation and submission.
  - Timing: Clients must use `timeLimit` to present a timer. Server calculates `timeRemaining` at fetch and should validate elapsed time at submit.
  - Randomization: If `randomOrder` is true, the server is responsible for generating and storing the randomized order for each attempt so scoring maps correctly. Mobile clients must assume question/option order returned by the API is canonical.
  - Negative marking: Server performs grading and applies `negativePoints` when `negativeMarking` is true. Clients may optionally show potential negative consequences in the UI but must not perform final scoring.
  - Max attempts: Server must reject new attempts exceeding `maxAttempts`. Mobile endpoints should return the user's attempt history or `canAttempt: false`.

  Sample quiz object with admin settings included:

  ```json
  {
    "id": "clq1",
    "title": "Sample Quiz",
    "description": "Admin-configured sample",
    "timeLimit": 30,
    "startTime": "2026-02-12T09:00:00Z",
    "endTime": "2026-02-12T11:00:00Z",
    "negativeMarking": true,
    "negativePoints": 0.25,
    "randomOrder": true,
    "maxAttempts": 3,
    "showAnswers": false,
    "checkAnswerEnabled": true,
    "difficulty": "MEDIUM",
    "status": "published",
    "questions": [
      {
        "id": "q1",
        "content": "Which S3 storage class is designed for rare access?",
        "type": "MULTIPLE_CHOICE",
        "options": ["Glacier","Standard","Standard-IA","One Zone-IA"],
        "correctAnswer": "Glacier",
        "explanation": "Glacier is meant for long-term archival storage.",
        "points": 1
      }
    ]
  }
  ```

  Notes about `correctAnswer` when `randomOrder` is enabled:

  - Prefer returning the correct answer as the option value (string) rather than an index. This avoids ambiguity when the server or client shuffles options.
  - If the server returns index-based `correctAnswer`, it must correspond to the order in `options` as returned for that attempt.

  Client and server should agree on these fields to ensure consistent timing, grading, and UX across web and mobile clients.

Client example conversion (web):
- Before submit: `multiSelectAnswers[questionId] = ["Option A","Option C"]`
- Convert to finalAnswers: `finalAnswers[questionId] = "Option A|Option C"`

Mobile-friendly suggestion: when calling `/api/mobile/quiz/{id}/submit`, send `answers` where multi-select answers are arrays to make intent explicit. Example below.

## Submitting answers (POST)

Request body (web component current behavior):

```json
{
  "attemptId": "clxxxxxx",
  "answers": {
    "q1": "Glacier",
    "q2": "true",
    "q3": "A|C"
  }
}
```

Mobile-friendly request (array for multi-select):

```json
{
  "attemptId": "clxxxxxx",
  "answers": {
    "q1": "Glacier",
    "q2": "true",
    "q3": ["A","C"]
  }
}
```

Sample submit response (successful):

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "attemptId": "clxxxxxx",
    "score": 85.5,
    "totalPoints": 10,
    "timeTaken": 1200,
    "submittedAt": "2024-01-15T14:30:00Z",
    "quiz": {
      "id": "clxxxxxx",
      "title": "AWS Fundamentals Quiz"
    }
  }
}
```

Server-side responsibilities when receiving submission:
- Validate `attemptId` and that it belongs to the current user.
- Parse `answers` where multi-select answers may be arrays, JSON strings, or pipe-separated strings.
- Grade answers according to question `type` and `correctAnswer`.
  - For `MULTI_SELECT` the server should normalize both the stored `correctAnswer` (pipe-separated or array) and user's answer to sets and compare accordingly (exact-match, subset, or apply scoring rules depending on business logic).
- Apply negative marking if configured.
- Store the attempt as `COMPLETED`, persist answers and score, and return result.

## Instant answer checking (client behavior)

- Enabled when `quiz.checkAnswerEnabled === true` and `canShowAnswers` is set (server may control whether answers are allowed to be shown).
- Client `handleCheckAnswer(questionId)` toggles `showAnswer` state and adds the question id to `checkedAnswers` set.
- When a question is checked:
  - The UI highlights the correct option(s) using `currentQuestion.correctAnswer`.
  - The answer is locked for edits (the `checkedAnswers` set prevents changes).
  - The explanation (if present) is shown.
- This is a client-side operation: there is no separate `check` API in the current codebase. If server-side verification is required, add an endpoint like `POST /api/mobile/quiz/{id}/check` which accepts `questionId` and `answer` and returns correctness and explanation.

## Time handling and auto-submit

- Server returns `timeRemaining` in seconds at attempt fetch.
- Client starts a local countdown and periodically persists the remaining time to local progress store.
- When `timeRemaining` reaches 0, the client auto-submits using the same submit endpoint with the current answers and `attemptId`.
- The server on submit must verify the time window and accept the submission (or mark late/invalid based on policy).

## Error handling & edge cases

- If the GET attempt endpoint returns no active attempt (404), the client navigates back to the quiz list.
- Validate question data on the server: missing `id`, `content`, or `type` should cause the server to omit that question and log an error.
- Normalize `options` on the server — it may be stored as JSON string in DB. Always return an array to the client.
- For `MULTI_SELECT`, normalize both client and server to sets to avoid ordering differences.

## Implementation notes / tips for mobile clients

- Use GET `/api/mobile/quiz/{id}` to fetch an attempt. Expect `data.attemptId`, `data.quiz`, `data.timeRemaining`, and `data.answers`.
- Keep multi-select answers as arrays in mobile requests for clarity. Server will accept arrays or pipe-separated strings.
- For instant answer checking, the web component checks locally using `correctAnswer` and locks the UI; mobile clients can replicate the same UX without extra endpoints.
- Make sure to send the `Authorization: Bearer <token>` header for mobile endpoints.

## Quick examples

1) Start/resume attempt (mobile):

Request:
GET /api/mobile/quiz/clq1
Headers: `Authorization: Bearer <token>`

Response: see "Fetching an attempt" section sample JSON above.

2) Submit (mobile preferred format with arrays for multi-select):

POST /api/mobile/quiz/clq1/submit
Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
Body:
```json
{
  "attemptId": "clattempt1",
  "answers": {
    "q1": "Glacier",
    "q2": "true",
    "q3": ["Option A","Option C"]
  }
}
```

Response: see "Submitting answers" sample JSON above.

## Conclusion

This document maps the web component behavior in `src/app/(q)/user/quiz/[id]/take/page.tsx` to the mobile API in `MOBILE_API.md`, details encoding rules (especially for `MULTI_SELECT`), describes client-side instant-check logic, and provides request/response samples for mobile clients.

If you want, I can:
- Add a `POST /api/mobile/quiz/{id}/check` endpoint spec and server implementation for server-side immediate checking.
- Update `MOBILE_API.md` with the exact JSON shapes from the web routes.
- Create a compact client example (JS/TS) for a mobile app that fetches attempt, renders questions, checks answers locally, and submits.
