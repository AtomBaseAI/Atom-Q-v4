# Testing the Quiz Simulation

## 🧪 Pre-Flight Checklist

### 1. Verify Dependencies

Run this command to ensure everything is installed:

```bash
npm install
```

You should see output like:
```
added 3 packages, and audited XX packages in Xs
```

### 2. Verify tsx Installation

```bash
npx tsx --version
```

Expected output:
```
tsx v4.x.x
node vXX.XX.X
```

### 3. Validate TypeScript Files

```bash
npx tsx --check simulate/server-admin.ts
npx tsx --check simulate/server-user.ts
```

Both commands should complete without errors.

---

## 🚀 Testing the Admin

### Test 1: Start Admin with Default Settings

```bash
npm run admin
```

**Expected Output:**
```
======================================================================
🎮 QUIZ ADMIN TERMINAL
======================================================================

Activity Key: quiz-<random-hex>
Question Interval: 15 seconds

Connecting to wss://atomq-quiz-partykit-server.atombaseai.partykit.dev/party/quiz-<random-hex>...
✓ Connected to quiz server
✓ Admin privileges confirmed

 Live Users: 0 | Status: Waiting

========================================================================
📋 ADMIN MENU
========================================================================
1. Start Quiz
2. Show Connected Users
3. Show Leaderboard
4. Show Current Question Stats
5. Show Questions List
6. Set Question Interval
7. Show Activity Info
8. End Quiz
0. Exit
========================================================================

Enter your choice:
```

**Success Criteria:**
- ✅ No connection errors
- ✅ Activity key displayed
- ✅ Admin privileges confirmed
- ✅ Menu displayed
- ✅ Status shows "Waiting"

### Test 2: Start Admin with Custom Interval

```bash
npm run admin 20
```

**Expected Output:**
Same as Test 1, but with:
```
Question Interval: 20 seconds
```

---

## 👤 Testing the User

### Test 3: Start User

In a new terminal, run:

```bash
npm run user <activity-key> TestUser
```

Replace `<activity-key>` with the key from the admin terminal.

**Expected Output:**
```
======================================================================
🎮 QUIZ USER TERMINAL
======================================================================

Activity Key: quiz-<activity-key>
User: TestUser (<emoji>)

Connecting to wss://atomq-quiz-partykit-server.atombaseai.partykit.dev/party/quiz-<activity-key>...
✓ Connected to quiz server
✓ Joined lobby as TestUser

 Connected: TestUser <emoji> | Users: 2

⏳ Waiting for quiz to start...
   (The admin will start the quiz)
```

**Success Criteria:**
- ✅ No connection errors
- ✅ User joined successfully
- ✅ Status shows connected
- ✅ User count updated in admin terminal

### Test 4: Invalid Activity Key

```bash
npm run user invalid-key TestUser
```

**Expected Output:**
```
✗ Connection error
   Make sure the activity key is correct and the admin is running
```

**Success Criteria:**
- ✅ Clear error message
- ✅ Doesn't crash

---

## 🎮 Testing Quiz Flow

### Test 5: Start Quiz

1. Start admin (Terminal 1)
2. Start 1-2 users (Terminals 2-3)
3. In admin terminal, enter `1`

**Expected in Admin:**
```
🚀 Starting quiz...

🎯 Get Ready! Question 1/10
   Starting in 5 seconds...

⏳ Loading next question...

======================================================================
❓ Question 1/10
======================================================================
What is the capital of Japan?

Options:
  1. Seoul
  2. Beijing
  3. Tokyo
  4. Bangkok

⏱️  Time: 15 seconds
======================================================================
```

**Expected in Users:**
```
🎯 GET READY!
   Question 1/10
   Starting in 5 seconds...

⏳ Loading question...

❓ Question 1/10
======================================================================
What is the capital of Japan?

Options:
  1. Seoul
  2. Beijing
  3. Tokyo
  4. Bangkok

⏱️  Time Limit: 15 seconds
======================================================================

Enter your answer (1-4):
```

**Success Criteria:**
- ✅ All terminals show GET_READY
- ✅ All terminals show QUESTION_LOADER
- ✅ All terminals show QUESTION_START
- ✅ Question text matches
- ✅ Options displayed correctly

### Test 6: Submit Answer

When question appears in user terminal, type `3` and press Enter.

**Expected Output:**
```
🎯 Submitted answer: Option 3
✓ Answer confirmed!
   Score: XXX points
   Time taken: X.XX seconds

Responses: 1/2 (50.0%)
```

**Admin should see:**
```
Responses: 1/2 users | Options: [0 | 0 | 1 | 0]
```

**Success Criteria:**
- ✅ Answer submitted successfully
- ✅ Score calculated
- ✅ Time tracked
- ✅ Real-time stats update in admin

### Test 7: Answer Revealed

After timer expires:

**Expected in All Terminals:**
```
======================================================================
💡 ANSWER REVEALED
======================================================================
Correct Answer: Option 3 (Tokyo)

📊 Question Statistics:
   Total Responses: 2
   Option 1: 0 votes (0.0%)
   Option 2: 0 votes (0.0%)
   Option 3: 1 votes (100.0%)
   Option 4: 0 votes (0.0%)
======================================================================
```

**Success Criteria:**
- ✅ Correct answer revealed
- ✅ Statistics shown
- ✅ All terminals synchronized

### Test 8: Leaderboard Update

```
======================================================================
🏆 LEADERBOARD
======================================================================
  🥇 1. TestUser (😀) - XXX pts (YOU)
======================================================================
```

**Success Criteria:**
- ✅ Leaderboard displayed
- ✅ Scores correct
- ✅ Rankings shown

### Test 9: Complete Quiz

Let the quiz run through all 10 questions.

**Expected Final Output:**
```
======================================================================
🏁 QUIZ COMPLETED!
======================================================================

🏆 LEADERBOARD
======================================================================
  🥇 1. TestUser (😀) - XXXX pts (YOU)
======================================================================

📊 Your Final Score: XXXX points
   Questions Answered: 10

🎉 Thanks for playing!
```

**Success Criteria:**
- ✅ All 10 questions completed
- ✅ Final score calculated
- ✅ Quiz ends gracefully
- ✅ User terminal exits
- ✅ Admin shows WAITING_SCREEN

---

## 🪟 Windows-Specific Tests

### Test 10: Windows Batch Script

**Command Prompt:**
```cmd
admin.bat
```

**Expected:** Same as npm run admin

### Test 11: Windows User Script

**Command Prompt:**
```cmd
user.bat <activity-key> WinUser
```

**Expected:** Same as npm run user

### Test 12: PowerShell Scripts

```powershell
.\start-admin.ps1
.\start-user.ps1 <activity-key> PsUser
```

**Expected:** Same as above

---

## 🔧 Troubleshooting Tests

### Test 13: Multiple Users

Start 3-4 users simultaneously:

```bash
# Terminal 2
npm run user <key> Alice

# Terminal 3
npm run user <key> Bob

# Terminal 4
npm run user <key> Charlie
```

**Success Criteria:**
- ✅ All users connect
- ✅ Admin shows correct count (4)
- ✅ All users receive messages
- ✅ Leaderboard shows all players

### Test 14: Late Join

1. Start admin and quiz
2. After question 2, start a new user:
   ```bash
   npm run user <key> LateUser
   ```

**Success Criteria:**
- ✅ User joins during quiz
- ✅ User receives current state
- ✅ User can answer next questions

### Test 15: User Disconnect

1. Start quiz with 2 users
2. Close one user terminal (Ctrl+C)

**Expected in Admin:**
```
Live Users: 1 | Status: Active
```

**Success Criteria:**
- ✅ User count updates
- ✅ Quiz continues for remaining user
- ✅ No errors in admin

---

## 📊 Performance Tests

### Test 16: Quick Quiz

Start with 5-second questions:

```bash
npm run admin 5
```

**Success Criteria:**
- ✅ All phases complete in time
- ✅ No lag between phases
- ✅ Messages arrive in sync

### Test 17: Extended Quiz

Start with 30-second questions:

```bash
npm run admin 30
```

**Success Criteria:**
- ✅ Long timeouts work correctly
- ✅ No connection drops
- ✅ Stats update periodically

---

## ✅ Final Verification Checklist

After running all tests, verify:

- [ ] Admin starts without errors
- [ ] Users can connect and join
- [ ] Quiz starts successfully
- [ ] All 10 questions display
- [ ] Users can submit answers
- [ ] Real-time stats update
- [ ] Leaderboard updates correctly
- [ ] Quiz completes successfully
- [ ] Final results display
- [ ] Windows scripts work
- [ ] npm scripts work
- [ ] npx commands work
- [ ] Multiple users supported
- [ ] Late join works
- [ ] Disconnection handled
- [ ] No memory leaks
- [ ] No console errors
- [ ] Colors display correctly
- [ ] All messages received

---

## 🎯 Success Criteria

### Minimum Viable Product:
- ✅ Admin starts
- ✅ At least 1 user can connect
- ✅ Quiz can start
- ✅ At least 1 question displays
- ✅ Answer can be submitted
- ✅ Quiz completes

### Full Functionality:
- ✅ All minimum criteria
- ✅ Multiple users (3+)
- ✅ All 10 questions
- ✅ Real-time statistics
- ✅ Leaderboard updates
- ✅ Cross-platform (Windows/macOS/Linux)
- ✅ Multiple startup methods (npm, npx, scripts)

---

## 🐛 Known Issues & Workarounds

### Issue: Colors not showing in Windows CMD

**Workaround:** Use PowerShell instead, or enable ANSI support:
```cmd
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1
```

### Issue: PowerShell execution policy

**Workaround:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use `.cmd` / `.bat` files.

---

## 📝 Test Report Template

```
Date: <date>
Platform: <Windows/macOS/Linux>
Node Version: <version>
npm Version: <version>

Tests Run: <number>
Tests Passed: <number>
Tests Failed: <number>

Issues Found:
- <issue 1>
- <issue 2>

Notes:
- <any additional notes>
```

---

**Happy Testing! 🎉**
