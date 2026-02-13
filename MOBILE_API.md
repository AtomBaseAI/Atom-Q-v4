# Atom Q Mobile API Documentation

**Version:** 2.1.0
**Base URL:** `http://localhost:3000/api/mobile`
**Last Updated:** 2025-01-20

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Quiz Management](#quiz-management)
   - [Quiz List](#31-get-quiz-list)
   - [Quiz Metadata](#32-get-quiz-metadata)
   - [Quiz Details (Take Quiz)](#33-get-quiz-details-take-quiz)
   - [Save Quiz Answers](#34-save-quiz-answers)
   - [Submit Quiz](#35-submit-quiz)
   - [Quiz Results](#36-get-quiz-results)
   - [Quiz History](#37-get-quiz-history)
   - [Track Tab Switch](#38-track-tab-switch)
4. [Profile Management](#profile-management)
5. [Question Types & Answer Matching](#question-types--answer-matching)
6. [Quiz Settings Explained](#quiz-settings-explained)
7. [Error Handling](#error-handling)
8. [Integration Examples](#integration-examples)

---

## Overview

The Atom Q Mobile API provides comprehensive functionality for mobile applications to interact with the quiz platform. All endpoints use JWT-based authentication and return JSON responses with a consistent format.

### Key Features

- **Secure Authentication**: JWT tokens with 60-day expiry
- **Complete Quiz Management**: List, take, save, submit, and review quizzes
- **Multiple Question Types**: Multiple Choice, Multi-Select, True/False, Fill-in-the-Blank
- **Real-time Progress**: Auto-save functionality during quiz attempts
- **Detailed Results**: Comprehensive scoring with explanations
- **Answer Validation**: Sophisticated matching algorithms for each question type
- **Negative Marking**: Configurable penalty system for wrong answers
- **Quiz Constraints**: Time limits, max attempts, availability windows
- **Tab Switch Tracking**: Monitor and limit tab switches during quiz attempts

---

## Authentication

### 1.1 Login

**Endpoint:** `POST /api/mobile/auth/login`

**Description:** Authenticates a user with email and password, returning a JWT token and complete user profile information.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword123"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "uoid": "STU-2024-001",
      "phone": "+1 (555) 123-4567",
      "avatar": "https://example.com/avatar.jpg",
      "role": "USER",
      "isActive": true,
      "section": "A",
      "departmentId": "cl7xxxxxxxxxxxxx",
      "batchId": "cl7xxxxxxxxxxxxx",
      "campusId": "cl7xxxxxxxxxxxxx"
    }
  }
}
```

#### Error Responses

| Status | Message | Description |
|---------|----------|-------------|
| 400 | Email and password are required | Missing credentials |
| 401 | Invalid email or password | Wrong credentials |
| 403 | Your account has been disabled | Account inactive |
| 500 | Internal server error | Server error |

---

## Quiz Management

### 3.1 Get Quiz List

**Endpoint:** `GET /api/mobile/quiz`

**Description:** Retrieves all quizzes assigned to the authenticated user with attempt status and statistics.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "difficulty": "MEDIUM",
      "maxAttempts": 3,
      "startTime": "2024-01-01T10:00:00.000Z",
      "endTime": "2024-12-31T23:59:59.000Z",
      "questionCount": 10,
      "attempts": 2,
      "bestScore": 85.5,
      "lastAttemptDate": "2024-01-15T14:30:00.000Z",
      "canAttempt": true,
      "attemptStatus": "completed",
      "hasInProgress": false,
      "inProgressAttemptId": null
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|--------|------|-------------|
| id | string | Quiz unique identifier |
| title | string | Quiz title |
| description | string | Quiz description |
| timeLimit | number | Time limit in minutes (null = unlimited) |
| difficulty | string | EASY, MEDIUM, or HARD |
| maxAttempts | number | Maximum allowed attempts (null = unlimited) |
| startTime | string | ISO 8601 - Quiz availability start |
| endTime | string | ISO 8601 - Quiz availability end |
| questionCount | number | Total questions in quiz |
| attempts | number | Completed attempts count |
| bestScore | number | Best score achieved (0-100) or null |
| lastAttemptDate | string | ISO 8601 - Last attempt date or null |
| canAttempt | boolean | Whether user can start/resume quiz |
| attemptStatus | string | Status: not_started, in_progress, completed, not_started_yet, expired |
| hasInProgress | boolean | Active attempt exists |
| inProgressAttemptId | string | ID of in-progress attempt or null |

---

### 3.2 Get Quiz Metadata

**Endpoint:** `GET /api/mobile/quiz/:id/metadata`

**Description:** Retrieves quiz metadata without starting an attempt. Use this to check enrollment status, time constraints, attempt limits, and existing attempt information before starting a quiz.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "difficulty": "MEDIUM",
      "startTime": "2024-01-01T10:00:00.000Z",
      "endTime": "2024-12-31T23:59:59.000Z",
      "maxAttempts": 3,
      "showAnswers": true,
      "checkAnswerEnabled": false,
      "negativeMarking": false,
      "negativePoints": null,
      "randomOrder": false,
      "questionCount": 10,
      "campus": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "Massachusetts Institute of Technology",
        "shortName": "MIT"
      }
    },
    "enrollment": {
      "isEnrolled": true
    },
    "attempt": {
      "hasExistingAttempt": false,
      "existingAttemptId": "",
      "completedAttemptsCount": 2,
      "canAttempt": true,
      "timeStatus": "available",
      "reason": "Ready to attempt"
    },
    "tabSwitches": {
      "count": 0
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|--------|------|-------------|
| quiz.id | string | Quiz unique identifier |
| quiz.title | string | Quiz title |
| quiz.description | string | Quiz description |
| quiz.timeLimit | number | Time limit in minutes (null = unlimited) |
| quiz.difficulty | string | EASY, MEDIUM, or HARD |
| quiz.startTime | string | ISO 8601 - Quiz availability start |
| quiz.endTime | string | ISO 8601 - Quiz availability end |
| quiz.maxAttempts | number | Maximum allowed attempts (null = unlimited) |
| quiz.showAnswers | boolean | Show detailed answers after submission |
| quiz.checkAnswerEnabled | boolean | Real-time answer checking enabled |
| quiz.negativeMarking | boolean | Negative marking applied for wrong answers |
| quiz.negativePoints | number | Points to deduct per wrong answer |
| quiz.randomOrder | boolean | Questions are shuffled if true |
| quiz.questionCount | number | Total questions in quiz |
| enrollment.isEnrolled | boolean | User is enrolled in this quiz |
| attempt.hasExistingAttempt | boolean | In-progress attempt exists |
| attempt.existingAttemptId | string | ID of existing attempt or empty string |
| attempt.completedAttemptsCount | number | Number of completed attempts |
| attempt.canAttempt | boolean | Whether user can start the quiz |
| attempt.timeStatus | string | available, not_started, or expired |
| attempt.reason | string | Explanation of canAttempt status |
| tabSwitches.count | number | Tab switches for existing attempt |

#### Use Cases

1. **Pre-quiz validation**: Check if user can attempt quiz before loading questions
2. **Time window checks**: Display countdown until quiz becomes available
3. **Attempt limits**: Show remaining attempts to user
4. **Resume detection**: Check if there's an in-progress attempt to resume

---

### 3.3 Get Quiz Details (Take Quiz)

**Endpoint:** `GET /api/mobile/quiz/:id`

**Description:** Retrieves quiz questions and creates/resumes an attempt. Returns all quiz settings, questions with options, and current progress.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "showAnswers": false,
      "checkAnswerEnabled": false,
      "negativeMarking": false,
      "negativePoints": null,
      "questions": [
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "Amazon S3 Storage Classes",
          "content": "Which S3 class is for rarely accessed data?",
          "type": "MULTIPLE_CHOICE",
          "options": [
            { "id": "A", "text": "S3 Standard" },
            { "id": "B", "text": "S3 Standard-IA" },
            { "id": "C", "text": "S3 Glacier" },
            { "id": "D", "text": "S3 One Zone-IA" }
          ],
          "explanation": "S3 Glacier is for data archiving with long retrieval times.",
          "difficulty": "EASY",
          "order": 1,
          "points": 1
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "AWS Lambda Triggers",
          "content": "Select all services that can trigger Lambda:",
          "type": "MULTI_SELECT",
          "options": [
            { "id": "A", "text": "Amazon S3" },
            { "id": "B", "text": "Amazon DynamoDB" },
            { "id": "C", "text": "Amazon EC2" },
            { "id": "D", "text": "Amazon Kinesis" },
            { "id": "E", "text": "Amazon SNS" }
          ],
          "explanation": "Lambda can be triggered by S3, DynamoDB, Kinesis, SNS, and more.",
          "difficulty": "MEDIUM",
          "order": 2,
          "points": 2
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "EC2 Instance Types",
          "content": "T family instances are designed for burstable workloads.",
          "type": "TRUE_FALSE",
          "options": [
            { "id": "A", "text": "True" },
            { "id": "B", "text": "False" }
          ],
          "explanation": "T family provides burstable CPU performance.",
          "difficulty": "MEDIUM",
          "order": 3,
          "points": 1
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "VPC Subnets",
          "content": "You can launch ____ resources into a subnet.",
          "type": "FILL_IN_BLANK",
          "options": [],
          "explanation": "You can launch EC2 instances and RDS databases into subnets.",
          "difficulty": "EASY",
          "order": 4,
          "points": 1
        }
      ]
    },
    "timeRemaining": 1800,
    "startedAt": "2024-01-15T14:00:00.000Z",
    "answers": {
      "cl7xxxxxxxxxxxxxxxxxx": "C",
      "cl7xxxxxxxxxxxxxxxxxx": "[\"A\",\"B\",\"D\"]"
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|--------|------|-------------|
| attemptId | string | Unique attempt ID (save for submission) |
| quiz.id | string | Quiz ID |
| quiz.title | string | Quiz title |
| quiz.description | string | Quiz description |
| quiz.timeLimit | number | Time limit in minutes |
| quiz.showAnswers | boolean | Show detailed answers after submission |
| quiz.checkAnswerEnabled | boolean | Real-time answer checking enabled |
| quiz.negativeMarking | boolean | Negative marking applied for wrong answers |
| quiz.negativePoints | number | Points to deduct per wrong answer |
| quiz.randomOrder | boolean | Questions shuffled if enabled |
| quiz.questions[] | array | Array of question objects |
| timeRemaining | number | Seconds remaining in quiz |
| startedAt | string | ISO 8601 - Attempt start time |
| answers | object | Map of questionId -> saved answer |

---

### 3.4 Save Quiz Answers

**Endpoint:** `POST /api/mobile/quiz/:id/save`

**Description:** Saves quiz answers without submitting. Use for auto-saving progress during quiz. Supports partial saves.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
  "answers": {
    "cl7xxxxxxxxxxxxxxxxxx": "C",
    "cl7xxxxxxxxxxxxxxxxxx": "[\"A\",\"B\",\"D\"]",
    "cl7xxxxxxxxxxxxxxxxxx": "A"
  }
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Answers saved successfully",
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "saved": 2,
    "updated": 1,
    "total": 3,
    "savedAt": "2024-01-15T14:15:30.000Z"
  }
}
```

#### Behavior

- **Partial Saves**: Can save any subset of questions
- **Upsert Logic**: Creates new answers or updates existing ones
- **Validation**: Only saves valid question IDs from the quiz
- **Progress Tracking**: Returns count of saved vs updated answers

---

### 3.5 Submit Quiz

**Endpoint:** `POST /api/mobile/quiz/:id/submit`

**Description:** Submits all answers for grading. Calculates scores based on question type, applies negative marking if enabled, and returns final results.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
  "answers": {
    "cl7xxxxxxxxxxxxxxxxxx": "C",
    "cl7xxxxxxxxxxxxxxxxxx": "[\"A\",\"B\",\"D\"]",
    "cl7xxxxxxxxxxxxxxxxxx": "A",
    "cl7xxxxxxxxxxxxxxxxxx": "EC2 instances",
    "cl7xxxxxxxxxxxxxxxxxx": "7"
  }
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "score": 85.71,
    "totalPoints": 7,
    "timeTaken": 1250,
    "submittedAt": "2024-01-15T14:20:50.000Z",
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz"
    }
  }
}
```

---

### 3.6 Get Quiz Results

**Endpoint:** `GET /api/mobile/quiz/:id/result?attemptId={attemptId}`

**Description:** Retrieves detailed results for a submitted quiz attempt. Shows question-by-question breakdown with correct answers and explanations if `showAnswers` is enabled.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| attemptId | string | Yes | The attempt ID to view results for |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "negativeMarking": false,
      "negativePoints": null
    },
    "attempt": {
      "score": 85.71,
      "totalPoints": 7,
      "timeTaken": 1250,
      "startedAt": "2024-01-15T14:00:00.000Z",
      "submittedAt": "2024-01-15T14:20:50.000Z",
      "isAutoSubmitted": false
    },
    "showAnswers": true,
    "questions": [
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "title": "Amazon S3 Storage Classes",
        "content": "Which S3 class is for rarely accessed data?",
        "type": "MULTIPLE_CHOICE",
        "options": [
          { "id": "A", "text": "S3 Standard" },
          { "id": "B", "text": "S3 Standard-IA" },
          { "id": "C", "text": "S3 Glacier" },
          { "id": "D", "text": "S3 One Zone-IA" }
        ],
        "explanation": "S3 Glacier is for data archiving with long retrieval times.",
        "difficulty": "EASY",
        "order": 1,
        "points": 1,
        "correctAnswer": "C",
        "userAnswer": "C",
        "isCorrect": true,
        "pointsEarned": 1
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "title": "AWS Lambda Triggers",
        "content": "Select all services that can trigger Lambda:",
        "type": "MULTI_SELECT",
        "options": [
          { "id": "A", "text": "Amazon S3" },
          { "id": "B", "text": "Amazon DynamoDB" },
          { "id": "C", "text": "Amazon EC2" },
          { "id": "D", "text": "Amazon Kinesis" },
          { "id": "E", "text": "Amazon SNS" }
        ],
        "explanation": "Lambda can be triggered by S3, DynamoDB, Kinesis, SNS, and more.",
        "difficulty": "MEDIUM",
        "order": 2,
        "points": 2,
        "correctAnswer": ["A", "B", "D", "E"],
        "userAnswer": ["A", "B", "D"],
        "isCorrect": false,
        "pointsEarned": 0
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "title": "EC2 Instance Types",
        "content": "T family instances are designed for burstable workloads.",
        "type": "TRUE_FALSE",
        "options": [
          { "id": "A", "text": "True" },
          { "id": "B", "text": "False" }
        ],
        "explanation": "T family provides burstable CPU performance.",
        "difficulty": "MEDIUM",
        "order": 3,
        "points": 1,
        "correctAnswer": "A",
        "userAnswer": "A",
        "isCorrect": true,
        "pointsEarned": 1
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "title": "VPC Subnets",
        "content": "You can launch ____ resources into a subnet.",
        "type": "FILL_IN_BLANK",
        "options": [],
        "explanation": "You can launch EC2 instances and RDS databases into subnets.",
        "difficulty": "EASY",
        "order": 4,
        "points": 1,
        "correctAnswer": "EC2 instances",
        "userAnswer": "EC2 instances",
        "isCorrect": true,
        "pointsEarned": 1
      }
    ]
  }
}
```

#### Restricted Mode Response

If `showAnswers` is `false`, response only includes summary:

```json
{
  "success": true,
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "quizId": "cl7xxxxxxxxxxxxxxxxxx",
    "quizTitle": "AWS Fundamentals Quiz",
    "score": 85.71,
    "totalPoints": 7,
    "timeTaken": 1250,
    "startedAt": "2024-01-15T14:00:00.000Z",
    "submittedAt": "2024-01-15T14:20:50.000Z",
    "showAnswers": false
  }
}
```

---

### 3.7 Get Quiz History

**Endpoint:** `GET /api/mobile/quiz/:id/history`

**Description:** Retrieves complete attempt history for a specific quiz with statistics.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your AWS knowledge",
      "timeLimit": 30,
      "maxAttempts": 3,
      "showAnswers": true
    },
    "stats": {
      "totalAttempts": 3,
      "completedAttempts": 2,
      "inProgressAttempts": 1,
      "bestScore": 92.0,
      "averageScore": 84.35,
      "totalTimeTaken": 3200,
      "remainingAttempts": 1
    },
    "attempts": [
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "status": "SUBMITTED",
        "score": 92.0,
        "totalPoints": 7,
        "timeTaken": 1800,
        "startedAt": "2024-01-15T10:00:00.000Z",
        "submittedAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "isAutoSubmitted": false,
        "canViewResults": true
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "status": "SUBMITTED",
        "score": 76.7,
        "totalPoints": 7,
        "timeTaken": 1400,
        "startedAt": "2024-01-15T14:00:00.000Z",
        "submittedAt": "2024-01-15T14:23:20.000Z",
        "createdAt": "2024-01-15T14:00:00.000Z",
        "isAutoSubmitted": false,
        "canViewResults": true
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "status": "IN_PROGRESS",
        "score": null,
        "totalPoints": null,
        "timeTaken": null,
        "startedAt": "2024-01-15T16:00:00.000Z",
        "submittedAt": null,
        "createdAt": "2024-01-15T16:00:00.000Z",
        "isAutoSubmitted": false,
        "canViewResults": false
      }
    ]
  }
}
```

---

### 3.8 Track Tab Switch

**Endpoint:** `POST /api/mobile/quiz/:id/tab-switch`

**Description:** Records a tab switch event during quiz attempt. Tracks user tab switches and enforces maximum limit. When max tabs reached, quiz should be auto-submitted.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "attemptId": "cl7xxxxxxxxxxxxxxxxxx"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Tab switch recorded",
  "data": {
    "currentSwitches": 1,
    "maxSwitches": 3,
    "switchesRemaining": 2,
    "shouldAutoSubmit": false,
    "recordedAt": "2024-01-15T14:15:30.000Z"
  }
}
```

#### Max Limit Reached Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Maximum tab switches reached",
  "data": {
    "currentSwitches": 3,
    "maxSwitches": 3,
    "shouldAutoSubmit": true
  }
}
```

#### Response Fields

| Field | Type | Description |
|--------|------|-------------|
| currentSwitches | number | Current count of tab switches |
| maxSwitches | number | Maximum allowed tab switches (default: 3) |
| switchesRemaining | number | Remaining tab switches allowed |
| shouldAutoSubmit | boolean | Auto-submit quiz when true |
| recordedAt | string | ISO 8601 timestamp of tab switch |

#### Get Tab Switch History

**Endpoint:** `GET /api/mobile/quiz/:id/tab-switch?attemptId={attemptId}`

**Description:** Retrieves tab switch history for an attempt.

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "quizId": "cl7xxxxxxxxxxxxxxxxxx",
    "currentSwitches": 2,
    "maxSwitches": 3,
    "switchesRemaining": 1,
    "shouldAutoSubmit": false,
    "tabSwitches": [
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "timestamp": "2024-01-15T14:05:00.000Z"
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "timestamp": "2024-01-15T14:10:30.000Z"
      }
    ]
  }
}
```

#### Implementation Guidelines

1. **Detect tab switches**: Use visibility API or focus/blur events
2. **Throttle recording**: Don't record rapid switches (debounce for 2-3 seconds)
3. **Warn user**: Show warning when approaching limit (e.g., 1 remaining)
4. **Auto-submit**: When `shouldAutoSubmit` is true, submit quiz immediately
5. **Display count**: Show tab switch count to user during quiz

#### Example Implementation

```typescript
// Track tab visibility changes
let lastSwitchTime = 0;
const SWITCH_DEBOUNCE = 2000; // 2 seconds

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') {
    const now = Date.now();
    
    // Debounce rapid switches
    if (now - lastSwitchTime > SWITCH_DEBOUNCE) {
      lastSwitchTime = now;
      
      const response = await fetch(`/api/mobile/quiz/${quizId}/tab-switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attemptId: currentAttemptId
        })
      });
      
      const result = await response.json();
      
      if (result.data?.shouldAutoSubmit) {
        // Auto-submit quiz
        await submitQuiz();
      } else if (result.data?.switchesRemaining <= 1) {
        // Show warning
        showWarning(`Only ${result.data.switchesRemaining} tab switch(es) remaining!`);
      }
    }
  }
});
```

---

## Profile Management

### 4.1 View Profile

**Endpoint:** `GET /api/mobile/profile`

**Description:** Retrieves complete user profile with statistics and recent activity.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "uoid": "STU-2024-001",
      "phone": "+1 (555) 123-4567",
      "avatar": "https://example.com/avatar.jpg",
      "role": "USER",
      "section": "A",
      "createdAt": "2024-01-10T08:30:00.000Z",
      "department": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "Computer Science & Engineering"
      },
      "batch": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "2022-2026"
      },
      "campus": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "Massachusetts Institute of Technology",
        "shortName": "MIT"
      }
    },
    "stats": {
      "totalQuizAttempts": 15,
      "completedQuizzes": 12,
      "bestScore": 96.5
    },
    "recentActivity": [
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "quizId": "cl7xxxxxxxxxxxxxxxxxx",
        "quizTitle": "AWS Fundamentals Quiz",
        "score": 85.71,
        "submittedAt": "2024-01-15T14:20:50.000Z"
      }
    ]
  }
}
```

### 4.2 Update Profile

**Endpoint:** `PUT /api/mobile/profile`

**Description:** Updates user profile fields. Supports partial updates.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body Examples:**

```json
{
  "name": "Johnathan Doe",
  "phone": "+1 (555) 987-6543",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

#### Success Response (200 OK)

Returns the complete updated user object (same structure as View Profile).

---

## Question Types & Answer Matching

The Atom Q platform supports four question types, each with its own answer validation logic implemented identically in both web and mobile applications.

### 1. Multiple Choice (MULTIPLE_CHOICE)

**Description**: Single correct answer from multiple options.

**Question Structure**:
```json
{
  "type": "MULTIPLE_CHOICE",
  "options": [
    { "id": "A", "text": "Option A" },
    { "id": "B", "text": "Option B" },
    { "id": "C", "text": "Option C" },
    { "id": "D", "text": "Option D" }
  ]
}
```

**Correct Answer Storage**: Single option ID (e.g., `"C"`)

**User Answer Format**: String with option ID (e.g., `"C"`)

**Answer Matching Logic**:
```typescript
// Exact string match
isCorrect = (userAnswer === correctAnswer)

// Example:
// correctAnswer = "C"
// userAnswer = "C"
// isCorrect = true
```

**Scoring**:
- Correct: Award full points
- Wrong: 0 points (or negative marking if enabled)

### 2. Multi-Select (MULTI_SELECT)

**Description**: Multiple correct answers. User must select ALL correct options.

**Question Structure**:
```json
{
  "type": "MULTI_SELECT",
  "options": [
    { "id": "A", "text": "Amazon S3" },
    { "id": "B", "text": "Amazon DynamoDB" },
    { "id": "C", "text": "Amazon EC2" },
    { "id": "D", "text": "Amazon Kinesis" },
    { "id": "E", "text": "Amazon SNS" }
  ]
}
```

**Correct Answer Storage**: JSON array of option IDs
```json
["A", "B", "D", "E"]
```

**User Answer Format**: JSON string or Array
```json
// As string (stored in database):
"[\"A\",\"B\",\"D\",\"E\"]"

// As array (can be sent from client):
["A", "B", "D", "E"]
```

**Answer Matching Logic**:
```typescript
// Parse answers if stored as strings
const userArr = typeof userAnswer === 'string'
  ? JSON.parse(userAnswer)
  : userAnswer;

const correctArr = typeof correctAnswer === 'string'
  ? JSON.parse(correctAnswer)
  : correctAnswer;

// Sort both arrays for order-independent comparison
const userSorted = [...userArr].sort();
const correctSorted = [...correctArr].sort();

// Compare sorted arrays as JSON strings
isCorrect = (JSON.stringify(userSorted) === JSON.stringify(correctSorted));

// Example:
// correctAnswer = ["A", "B", "D", "E"]
// userAnswer = ["A", "D", "B", "E"]
// userSorted = ["A", "B", "D", "E"]
// correctSorted = ["A", "B", "D", "E"]
// isCorrect = true (order doesn't matter, but all must be selected)

// Partial match example:
// userAnswer = ["A", "B", "D"]
// isCorrect = false (missing "E")
```

**Important Rules**:
- **All correct options must be selected**
- **No wrong options allowed**
- **Order doesn't matter** (A,B,D = B,A,D = D,A,B)
- **Partial credit NOT awarded** - must be exact match

**Scoring**:
- All correct: Award full points
- Any wrong or missing: 0 points (or negative marking if enabled)

### 3. True/False (TRUE_FALSE)

**Description**: Boolean question with two options.

**Question Structure**:
```json
{
  "type": "TRUE_FALSE",
  "options": [
    { "id": "A", "text": "True" },
    { "id": "B", "text": "False" }
  ]
}
```

**Correct Answer Storage**: Option ID ("A" for True, "B" for False)

**User Answer Format**: String with option ID

**Answer Matching Logic**:
```typescript
// Exact string match
isCorrect = (userAnswer === correctAnswer)

// Example:
// correctAnswer = "A" (True)
// userAnswer = "A"
// isCorrect = true
```

**Scoring**:
- Correct: Award full points
- Wrong: 0 points (or negative marking if enabled)

### 4. Fill-in-the-Blank (FILL_IN_BLANK)

**Description**: Text input question where user types their answer.

**Question Structure**:
```json
{
  "type": "FILL_IN_BLANK",
  "content": "You can launch ____ resources into a subnet.",
  "options": []
}
```

**Correct Answer Storage**: String with correct text (e.g., `"EC2 instances"`)

**User Answer Format**: String with user's input

**Answer Matching Logic**:
```typescript
// Case-insensitive comparison
// Trim leading/trailing whitespace
isCorrect = (userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim());

// Example:
// correctAnswer = "EC2 instances"
// userAnswer = "EC2 Instances"
// isCorrect = true (case ignored)

// Example 2:
// correctAnswer = "EC2 instances"
// userAnswer = "  ec2 instances  "
// isCorrect = true (whitespace trimmed)

// Example 3:
// correctAnswer = "EC2 instances"
// userAnswer = "EC2 Instance"
// isCorrect = false (typo detected)
```

**Important Rules**:
- **Case-insensitive**: "EC2" = "ec2" = "Ec2"
- **Whitespace trimmed**: Leading/trailing spaces ignored
- **Exact match required**: No partial credit, must match exactly

**Scoring**:
- Correct: Award full points
- Wrong: 0 points (or negative marking if enabled)

---

## Quiz Settings Explained

### Core Settings

| Setting | Type | Description | Default |
|----------|------|-------------|----------|
| `timeLimit` | number (minutes) | Maximum time allowed for quiz | null (unlimited) |
| `maxAttempts` | number | Maximum attempts per user | null (unlimited) |
| `maxTabs` | number | Maximum tab switches allowed during quiz | 3 |
| `showAnswers` | boolean | Show detailed answers after submission | false |
| `checkAnswerEnabled` | boolean | Allow real-time answer checking | false |
| `negativeMarking` | boolean | Deduct points for wrong answers | false |
| `negativePoints` | number | Points to deduct per wrong answer | null |
| `randomOrder` | boolean | Shuffle question order | false |
| `startTime` | DateTime | Quiz availability start | null |
| `endTime` | DateTime | Quiz availability end | null |

### Settings Behavior

#### timeLimit

- **Value**: Minutes (e.g., 30 = 30 minutes)
- **null**: Unlimited time
- **Implementation**:
  - Server sends `timeRemaining` in seconds
  - Mobile app counts down from this value
  - When reaches 0, auto-submit or warn user
  - Server calculates: `timeRemaining = max(0, (timeLimit * 60) - timeElapsed)`

#### showAnswers

- **false**: Results API only shows score (no question details)
- **true**: Results API shows:
  - Each question's correct answer
  - User's answer
  - Whether correct/incorrect
  - Explanation text
  - Points earned

#### checkAnswerEnabled

- **false**: No real-time feedback during quiz
- **true**: Mobile app can implement instant feedback
  - API doesn't validate during quiz
  - Client-side optional feature
  - Must calculate answer matching client-side

#### negativeMarking

- **false**: Wrong answers = 0 points
- **true**: Wrong answers = -`negativePoints`
- **Example**:
  ```
  Question: 2 points
  Correct answer: Award +2 points
  Wrong answer: Deduct -0.5 points (if negativePoints = 0.5)
  ```

#### maxAttempts

- **null**: Unlimited retakes allowed
- **3**: User can attempt quiz 3 times
- **Enforcement**:
  - Checked before creating new attempt
  - Server returns error if: `completedAttempts >= maxAttempts`
  - Includes SUBMITTED attempts only

#### randomOrder

- **false**: Questions returned in database order
- **true**: Questions shuffled server-side
- **Note**: Question `order` field indicates display position

#### maxTabs

- **3**: Default maximum tab switches allowed
- **0**: Unlimited tab switches (disabled)
- **Enforcement**:
  - Track tab switches via visibility API or focus/blur events
  - Server returns `shouldAutoSubmit: true` when limit reached
  - Mobile app should auto-submit quiz when limit reached
  - Debounce rapid switches (recommended: 2-3 seconds)

---

## Scoring Mechanism

### Score Calculation Process

```
1. For each question:
   a. Get question points (default: 1.0)
   b. Get user's answer
   c. Get correct answer
   d. Match answers based on question type
   e. If correct:
      - Add question points to totalScore
      - pointsEarned = questionPoints
   f. If wrong AND negativeMarking = true:
      - Subtract negativePoints from totalScore
      - pointsEarned = -negativePoints
   g. If wrong AND negativeMarking = false:
      - pointsEarned = 0

2. Calculate total possible points:
   totalPossiblePoints = sum of all question points

3. Calculate percentage score:
   finalScore = (totalScore / totalPossiblePoints) * 100

4. Store results:
   - Save attempt with final score
   - Save each answer with isCorrect and pointsEarned
   - Record timeTaken (submittedAt - startedAt)
```

### Example Scoring

**Quiz Configuration**:
```
Question 1: MULTIPLE_CHOICE, 1 point
Question 2: MULTI_SELECT, 2 points
Question 3: TRUE_FALSE, 1 point
Question 4: FILL_IN_BLANK, 1 point
Total possible: 5 points
Negative marking: false
```

**User Answers**:
```
Question 1: Correct → +1 point
Question 2: Partial (missing 1 option) → 0 points
Question 3: Correct → +1 point
Question 4: Wrong → 0 points
```

**Score Calculation**:
```
totalScore = 1 + 0 + 1 + 0 = 2
totalPossiblePoints = 5
finalScore = (2 / 5) * 100 = 40.0%
```

**With Negative Marking** (negativePoints = 0.5):
```
Question 1: Correct → +1.0
Question 2: Wrong → -0.5
Question 3: Correct → +1.0
Question 4: Wrong → -0.5

totalScore = 1.0 + (-0.5) + 1.0 + (-0.5) = 1.0
totalPossiblePoints = 5
finalScore = (1.0 / 5) * 100 = 20.0%
```

---

## Error Handling

### Standard Error Format

All errors follow this structure:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

### HTTP Status Codes

| Code | Name | Description |
|------|-------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error |

### Common Errors & Solutions

| Error | Message | Solution |
|--------|----------|----------|
| Invalid or expired token | "Invalid or expired token" | Re-login |
| Quiz has not started yet | "Quiz has not started yet" | Wait until startTime |
| Quiz has expired | "Quiz has expired" | Quiz window closed |
| Maximum attempts reached | "Maximum attempts reached" | Show attempt history |
| Attempt not found | "Attempt not found" | Start new attempt |
| Quiz has already been submitted | "Quiz has already been submitted" | View results |

---

## Integration Examples

### Mobile App Quiz Flow

```
1. Login
   POST /api/mobile/auth/login
   → Save token securely
   → Cache user data

2. Get Quiz List
   GET /api/mobile/quiz
   → Display available quizzes
   → Show attempt status

3. Get Quiz Metadata (Optional)
   GET /api/mobile/quiz/:id/metadata
   → Check enrollment status
   → Verify time constraints
   → Check attempt limits
   → Check for in-progress attempt

4. Start Quiz
   GET /api/mobile/quiz/:id
   → Save attemptId
   → Cache questions locally
   → Start countdown timer

5. Take Quiz
   → Display questions
   → Track tab switches:
      POST /api/mobile/quiz/:id/tab-switch
   → Auto-save every 2 minutes:
      POST /api/mobile/quiz/:id/save
   → Update timer

6. Submit Quiz
   POST /api/mobile/quiz/:id/submit
   → Display score immediately

7. View Results
   GET /api/mobile/quiz/:id/result?attemptId=xxx
   → Show question breakdown
   → Display explanations

8. View History
   GET /api/mobile/quiz/:id/history
   → Show all attempts
   → Compare performance
```

### Auto-Save Implementation

```typescript
// Save answers periodically
const autoSaveInterval = setInterval(async () => {
  const response = await fetch('/api/mobile/quiz/:id/save', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      attemptId: currentAttemptId,
      answers: currentAnswers
    })
  });

  const result = await response.json();
  console.log(`Saved ${result.data.total} answers`);
}, 120000); // Every 2 minutes

// Clear on submit
clearInterval(autoSaveInterval);
```

### Timer Implementation

```typescript
// Countdown timer
let timeRemaining = quizData.timeRemaining;

const timer = setInterval(() => {
  timeRemaining--;

  if (timeRemaining <= 0) {
    // Auto-submit
    submitQuiz();
    clearInterval(timer);
  } else if (timeRemaining <= 60) {
    // Show warning at 1 minute
    showWarning("1 minute remaining!");
  }

  updateTimerDisplay(timeRemaining);
}, 1000);
```

---

## API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|---------|---------|
| `/api/mobile/auth/login` | POST | User authentication |
| `/api/mobile/profile` | GET | Get user profile & stats |
| `/api/mobile/profile` | PUT | Update user profile |
| `/api/mobile/quiz` | GET | List assigned quizzes |
| `/api/mobile/quiz/:id/metadata` | GET | Get quiz metadata (before starting) |
| `/api/mobile/quiz/:id` | GET | Start/resume quiz |
| `/api/mobile/quiz/:id/save` | POST | Save quiz answers |
| `/api/mobile/quiz/:id/submit` | POST | Submit quiz |
| `/api/mobile/quiz/:id/result` | GET | View quiz results |
| `/api/mobile/quiz/:id/history` | GET | View attempt history |
| `/api/mobile/quiz/:id/tab-switch` | POST | Record tab switch |
| `/api/mobile/quiz/:id/tab-switch` | GET | Get tab switch history |

---

**Document Version:** 2.1.0
**Last Updated:** 2025-01-20
**Platform:** Atom Q v4
**Compatibility:** iOS 12+, Android 8+
