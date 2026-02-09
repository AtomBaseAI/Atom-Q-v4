# Mobile API Documentation

This document provides comprehensive documentation for the mobile APIs.

## Base URL
```
http://localhost:3000/api/mobile
```

## Authentication
All API endpoints (except login) require Bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication

### Login
**Endpoint:** `POST /api/mobile/auth/login`

**Description:** Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "avatar": null,
      "phone": null,
      "isActive": true,
      "uoid": "",
      "departmentId": null,
      "batchId": null,
      "section": "A",
      "campusId": null
    }
  }
}
```

**Error Responses:**
- `400` - Email and password are required
- `401` - Invalid email or password
- `403` - Your account has been disabled
- `500` - Internal server error

---

## 2. Quiz Management

### Get Quiz List
**Endpoint:** `GET /api/mobile/quiz`

**Description:** Get list of quizzes assigned to the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "difficulty": "MEDIUM",
      "maxAttempts": 3,
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-12-31T23:59:59Z",
      "questionCount": 10,
      "attempts": 2,
      "bestScore": 85.5,
      "lastAttemptDate": "2024-01-15T14:30:00Z",
      "canAttempt": true,
      "attemptStatus": "completed",
      "hasInProgress": false,
      "inProgressAttemptId": null
    }
  ]
}
```

**Quiz Status Values:**
- `not_started` - User hasn't attempted the quiz
- `in_progress` - User has an active attempt
- `completed` - User has completed the quiz
- `not_started_yet` - Quiz hasn't started yet
- `expired` - Quiz has ended

---

### Take Quiz (Get Questions)
**Endpoint:** `GET /api/mobile/quiz/:id`

**Description:** Get quiz questions to start or continue taking a quiz. Creates a new attempt if none exists.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` - Quiz ID

**Response:**
```json
{
  "success": true,
  "data": {
    "attemptId": "clxxxxxx",
    "quiz": {
      "id": "clxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "showAnswers": false,
      "checkAnswerEnabled": false,
      "negativeMarking": false,
      "negativePoints": null,
      "questions": [
        {
          "id": "clxxxxxx",
          "title": "Amazon S3 Storage Classes",
          "content": "Which S3 storage class is designed for data that is rarely accessed?",
          "type": "MULTIPLE_CHOICE",
          "options": [
            "Standard",
            "Standard-IA",
            "Glacier",
            "One Zone-IA"
          ],
          "explanation": "Glacier is designed for data archiving with long retrieval times.",
          "difficulty": "EASY",
          "order": 1,
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

**Question Types:**
- `MULTIPLE_CHOICE` - Single correct answer
- `MULTI_SELECT` - Multiple correct answers
- `TRUE_FALSE` - True or False
- `FILL_IN_BLANK` - Text input

---

### Submit Quiz
**Endpoint:** `POST /api/mobile/quiz/:id/submit`

**Description:** Submit quiz answers for grading.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` - Quiz ID

**Request Body:**
```json
{
  "attemptId": "clxxxxxx",
  "answers": {
    "question_id_1": "option_A",
    "question_id_2": ["option_A", "option_B"],
    "question_id_3": "true",
    "question_id_4": "answer text"
  }
}
```

**Answer Format:**
- `MULTIPLE_CHOICE`: String (e.g., "option_A")
- `MULTI_SELECT`: JSON string or Array (e.g., `["option_A", "option_B"]`)
- `TRUE_FALSE`: String (e.g., "true" or "false")
- `FILL_IN_BLANK`: String (e.g., "answer text")

**Response:**
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

---

## 3. Profile Management

### View Profile
**Endpoint:** `GET /api/mobile/profile`

**Description:** Get current user's profile and statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "uoid": "",
      "phone": "+1234567890",
      "avatar": "https://example.com/avatar.jpg",
      "role": "USER",
      "section": "A",
      "createdAt": "2024-01-01T00:00:00Z",
      "department": {
        "id": "clxxxxxx",
        "name": "Computer Science"
      },
      "batch": {
        "id": "clxxxxxx",
        "name": "2022-2026"
      },
      "campus": {
        "id": "clxxxxxx",
        "name": "Test Seed Organization",
        "shortName": "TSO"
      }
    },
    "stats": {
      "totalQuizAttempts": 5,
      "completedQuizzes": 4,
      "bestScore": 95.0
    },
    "recentActivity": [
      {
        "id": "clxxxxxx",
        "quizId": "clxxxxxx",
        "quizTitle": "AWS Fundamentals Quiz",
        "score": 85.5,
        "submittedAt": "2024-01-15T14:30:00Z"
      }
    ]
  }
}
```

---

### Edit Profile
**Endpoint:** `PUT /api/mobile/profile`

**Description:** Update current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+9876543210",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Note:** All fields are optional. Include only the fields you want to update.

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Updated",
    "uoid": "",
    "phone": "+9876543210",
    "avatar": "https://example.com/new-avatar.jpg",
    "role": "USER",
    "section": "A",
    "createdAt": "2024-01-01T00:00:00Z",
    "department": {
      "id": "clxxxxxx",
      "name": "Computer Science"
    },
    "batch": {
      "id": "clxxxxxx",
      "name": "2022-2026"
    },
    "campus": {
      "id": "clxxxxxx",
      "name": "Test Seed Organization",
      "shortName": "TSO"
    }
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (no access)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing the APIs

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword"
  }'
```

**Get Quiz List:**
```bash
curl http://localhost:3000/api/mobile/quiz \
  -H "Authorization: Bearer <your_token>"
```

**Take Quiz:**
```bash
curl http://localhost:3000/api/mobile/quiz/<quiz_id> \
  -H "Authorization: Bearer <your_token>"
```

**Submit Quiz:**
```bash
curl -X POST http://localhost:3000/api/mobile/quiz/<quiz_id>/submit \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "attemptId": "<attempt_id>",
    "answers": {
      "question_id_1": "option_A"
    }
  }'
```

**View Profile:**
```bash
curl http://localhost:3000/api/mobile/profile \
  -H "Authorization: Bearer <your_token>"
```

**Edit Profile:**
```bash
curl -X PUT http://localhost:3000/api/mobile/profile \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "+1234567890"
  }'
```

---

## Mobile App Integration Tips

1. **Token Storage:** Store the JWT token securely on the device (e.g., using Keychain on iOS or Keystore on Android)

2. **Token Refresh:** The token is valid for 60 days. Implement a mechanism to refresh the token or re-login when expired.

3. **Auto-refresh:** When taking a quiz, periodically call the GET quiz endpoint to get updated time remaining.

4. **Offline Mode:** Consider caching quiz data locally and syncing answers when the connection is restored.

5. **Error Handling:** Implement proper error handling for all API calls, especially for network issues and expired tokens.

6. **Quiz Timer:** Implement a client-side timer based on the `timeRemaining` field from the quiz API.

7. **Progress Saving:** The quiz API preserves partial answers, so users can continue their quiz later.

---

## Sample Test Credentials

Based on the seeded data:

**Admin User:**
- Email: `admin@atomcode.dev`
- Password: `admin@atomcode.dev`

**Sample Users:**
- Email: `seedtestuser1@test.org` to `seedtestuser20@test.org`
- Password: `testuser123`
