# Quiz Terminal Simulation

Interactive terminal-based quiz simulation with admin and user interfaces.

**Cross-Platform Support:** Works on Windows, macOS, and Linux using npm/npx.

---

## 📋 Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **WebSocket server** running (deployed at: `https://atomq-quiz-partykit-server.atombaseai.partykit.dev`)

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `ws` - WebSocket library
- `tsx` - TypeScript executor (runs .ts files directly)

---

### Step 2: Start the Admin (Terminal 1)

#### Option A: Using npm scripts (Recommended for all platforms)

```bash
# Start admin with default 15-second question interval
npm run admin

# Or specify custom interval (e.g., 10 seconds)
npm run admin 10
```

#### Option B: Using npx directly (All platforms)

```bash
npx tsx simulate/server-admin.ts

# Or with custom interval
npx tsx simulate/server-admin.ts 20
```

#### Option C: Windows Only

**Batch/CMD:**
```cmd
admin.bat

# Or with custom interval
admin.bat 20
```

**PowerShell:**
```powershell
.\start-admin.ps1

# Or with custom interval
.\start-admin.ps1 20
```

The admin will display:
- **Activity Key** - Share this with users
- **Question Interval** - Time per question
- **Live User Count** - Updates in real-time

---

### Step 3: Start Users (Terminal 2, 3, 4, ...)

Replace `<activity-key>` with the key shown by the admin.

#### Option A: Using npm scripts (Recommended for all platforms)

```bash
# User 1
npm run user <activity-key> Alice

# User 2
npm run user <activity-key> Bob

# User 3
npm run user <activity-key> Charlie
```

#### Option B: Using npx directly (All platforms)

```bash
# User 1
npx tsx simulate/server-user.ts <activity-key> Alice

# User 2
npx tsx simulate/server-user.ts <activity-key> Bob

# User 3
npx tsx simulate/server-user.ts <activity-key> Charlie user-charlie-123
```

#### Option C: Windows Only

**Batch/CMD:**
```cmd
user.bat quiz-a1b2c3d4 Alice
user.bat quiz-a1b2c3d4 Bob
user.bat quiz-a1b2c3d4 Charlie
```

**PowerShell:**
```powershell
.\start-user.ps1 quiz-a1b2c3d4 Alice
.\start-user.ps1 quiz-a1b2c3d4 Bob
.\start-user.ps1 quiz-a1b2c3d4 Charlie
```

---

### Step 4: Start the Quiz

In the **Admin terminal**, select option `1` and press Enter.

### Step 5: Answer Questions

In each **User terminal**, type the option number (1-4) when a question appears.

---

## 🎮 NPM Scripts Available

| Command | Description | Example |
|---------|-------------|---------|
| `npm run admin` | Start admin terminal | `npm run admin` |
| `npm run user` | Start user terminal | `npm run user quiz-key Alice` |
| `npm run admin:node` | Start admin (compiled) | `npm run admin:node` |
| `npm run user:node` | Start user (compiled) | `npm run user:node quiz-key Alice` |
| `npm run build:simulate` | Compile simulate scripts | `npm run build:simulate` |

---

## 🪟 Windows-Specific Instructions

### Using Command Prompt (cmd.exe)

```cmd
REM Navigate to project directory
cd path\to\my-project

REM Install dependencies
npm install

REM Start admin (Terminal 1)
admin.bat

REM Start users (Terminals 2, 3, 4)
user.bat quiz-a1b2c3d4 Alice
user.bat quiz-a1b2c3d4 Bob
user.bat quiz-a1b2c3d4 Charlie
```

### Using PowerShell

```powershell
# Navigate to project directory
cd path\to\my-project

# Install dependencies
npm install

# Start admin (Terminal 1)
.\start-admin.ps1

# Start users (Terminals 2, 3, 4)
.\start-user.ps1 quiz-a1b2c3d4 Alice
.\start-user.ps1 quiz-a1b2c3d4 Bob
.\start-user.ps1 quiz-a1b2c3d4 Charlie
```

**PowerShell Note:** If you get execution policy errors, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Using Git Bash / WSL on Windows

You can use the same commands as Linux/macOS:

```bash
npm run admin
npm run user <activity-key> Alice
```

---

## 🍎 macOS / Linux Instructions

```bash
# Install dependencies
npm install

# Start admin (Terminal 1)
npm run admin

# Start users (Terminals 2, 3, 4)
npm run user <activity-key> Alice
npm run user <activity-key> Bob
npm run user <activity-key> Charlie
```

---

## 🎮 Admin Features

### Menu Options

1. **Start Quiz** - Begin the quiz session
2. **Show Connected Users** - View all connected participants
3. **Show Leaderboard** - Display current rankings
4. **Show Current Question Stats** - View real-time question statistics
5. **Show Questions List** - View all 10 quiz questions
6. **Set Question Interval** - Change time per question (5-60 seconds)
7. **Show Activity Info** - Display session details
8. **End Quiz** - Manually end the quiz
0. **Exit** - Close the admin terminal

### Real-time Displays

- **Live Users** - Shows connected user count in header
- **Status Bar** - Displays quiz status (Waiting/Active/Ended)
- **Question Stats** - Real-time response counts during questions
- **Question Flow** - Shows quiz phases (Get Ready → Question → Answer → Leaderboard)

### Quiz Flow

When you start the quiz, the server automatically runs through:

1. **GET READY** (5 seconds) - Prepare for question
2. **QUESTION LOADER** (5 seconds) - Load next question
3. **QUESTION START** (configurable, default 15s) - Users answer
4. **QUESTION STATS** (real-time) - Show response counts
5. **SHOW ANSWER** (3 seconds) - Reveal correct answer
6. **LEADERBOARD** (5 seconds) - Update rankings
7. **Repeat** for all 10 questions
8. **QUIZ END** - Show final results
9. **WAITING SCREEN** - Ready for next session

---

## 👤 User Features

### Terminal Experience

- **Join Lobby** - Connect to activity with nickname
- **Status Bar** - Shows connection status and user count
- **Question Display** - Clear question and options
- **Answer Input** - Type number (1-4) to submit answer
- **Live Updates** - See response counts in real-time
- **Answer Confirmation** - Immediate feedback on submission
- **Leaderboard** - View rankings after each question
- **Final Results** - See complete quiz results

### Answering Questions

When a question appears:

```
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

Enter your answer (1-4): 3
```

Type your answer and press Enter. You'll see:

```
🎯 Submitted answer: Option 3
✓ Answer confirmed!
   Score: 950 points
   Time taken: 1.23 seconds
```

### Live Statistics

While waiting for other users, you'll see:

```
Responses: 3/5 (60.0%)
```

---

## 📚 Quiz Questions (10 MCQs)

The quiz includes these questions:

1. **Capital of Japan** - Geography
2. **Red Planet** - Astronomy
3. **Largest Mammal** - Biology
4. **Romeo and Juliet** - Literature
5. **Chemical Symbol for Gold** - Chemistry
6. **WWII End Year** - History
7. **Smallest Prime Number** - Mathematics
8. **Largest Population** - Geography
9. **Speed of Light** - Physics
10. **Mona Lisa Painter** - Art

Each question has 4 options, with the correct answer shown in green in the admin view.

---

## 🎯 Scoring System

Points are calculated based on:
- **Correctness** - Only correct answers get points
- **Speed** - Faster answers get more points
- **Time Bonus** - Bonus for quick responses

---

## 💡 Usage Examples

### Example 1: Single Player Test (All Platforms)

**Terminal 1 (Admin):**
```bash
npm run admin
```
Note the activity key (e.g., `quiz-a1b2c3d4`)

**Terminal 2 (User):**
```bash
npm run user quiz-a1b2c3d4 Alice
```

Wait for quiz to start, answer questions, see results!

### Example 2: Multi-Player Competition (Windows CMD)

**Terminal 1 (Admin):**
```cmd
admin.bat 20
```
Wait for users to join, then start quiz.

**Terminal 2:**
```cmd
user.bat quiz-a1b2c3d4 SpeedyGonzalez
```

**Terminal 3:**
```cmd
user.bat quiz-a1b2c3d4 Einstein
```

**Terminal 4:**
```cmd
user.bat quiz-a1b2c3d4 Sherlock
```

### Example 3: Custom Timing

Start admin with 30-second questions:
```bash
npm run admin 30
```

Or quick 10-second rounds:
```bash
npm run admin 10
```

---

## 🔧 Advanced Features

### Admin Commands

**View Connected Users:**
```
Enter your choice: 2
```
Shows all users with their status and scores.

**Check Question Stats:**
```
Enter your choice: 4
```
Shows detailed statistics for the current question.

**Change Timing:**
```
Enter your choice: 6
Enter question interval in seconds (default 15): 20
```

### User Experience

- **Random Avatar** - Each user gets a random emoji avatar
- **Custom User ID** - Optional third parameter for custom ID
- **Answer Validation** - Invalid answers are rejected with clear messages
- **Time Tracking** - Shows time taken for each answer

---

## 📊 Real-Time Features

### Admin Sees:
- ✅ Users joining/leaving in real-time
- ✅ Live response counts during questions
- ✅ Answer distribution (which options users chose)
- ✅ Response rate percentage
- ✅ Updated leaderboard after each question

### Users See:
- ✅ Connection status
- ✅ Number of users in session
- ✅ Question timer
- ✅ Live response counts (after answering)
- ✅ Answer confirmation with score
- ✅ Leaderboard updates
- ✅ Final rankings

---

## 🎨 Color Coding

- 🟢 **Green** - Success, correct answers, positive feedback
- 🔴 **Red** - Errors, time's up, exit
- 🟡 **Yellow** - Warnings, timers, waiting states
- 🔵 **Blue** - Information, options, neutral content
- 🟣 **Magenta** - Actions, submissions, highlights

---

## 🐛 Troubleshooting

### Common Issues

#### "tsx: command not found" or "npx: command not found"

**Solution:**
```bash
npm install
```

#### "Cannot find module 'ws'"

**Solution:**
```bash
npm install
```

#### Connection Issues

**Problem:** User can't connect
```
✗ Connection error
   Make sure the activity key is correct and the admin is running
```

**Solution:**
- Verify admin is running
- Check activity key matches exactly (case-sensitive)
- Ensure you're using the correct command

#### Quiz Won't Start

**Problem:** Admin can't start quiz

**Solution:**
- Wait for at least 1 player to join
- Check user count in status bar
- Ensure players are connected (not just joined)

#### Questions Not Appearing

**Problem:** Users don't see questions

**Solution:**
- Check admin has started quiz
- Verify user is still connected
- Look for error messages in terminals

#### Windows PowerShell Execution Policy Error

**Problem:** Running `.ps1` files gives execution policy error

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use `.cmd` / `.bat` files instead.

#### Terminal Colors Not Showing (Windows)

**Problem:** Colors don't display properly in Windows CMD

**Solution:**
- Use PowerShell instead of CMD for better color support
- Or enable ANSI support in CMD (Windows 10+):
  ```cmd
  reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1
  ```

---

## 📝 Tips

1. **Test with Multiple Terminals** - Open 3-4 terminals to simulate real competition
2. **Adjust Timing** - Use longer intervals for first-time testing
3. **Watch Live Stats** - As admin, use option 4 to see detailed question stats
4. **Compare Scores** - After quiz, compare final leaderboards across terminals
5. **Custom Names** - Use fun nicknames for better experience
6. **Use npm scripts** - They work consistently across all platforms

---

## 🔨 Development

### Compile Scripts for Production

If you want to compile TypeScript to JavaScript:

```bash
npm run build:simulate
```

This creates compiled files in `dist/simulate/`:
- `dist/simulate/server-admin.js`
- `dist/simulate/server-user.js`

Then run with:

```bash
npm run admin:node
npm run user:node quiz-key Alice
```

### File Structure

```
simulate/
├── server-admin.ts      # Admin TypeScript source
├── server-user.ts       # User TypeScript source
├── admin.bat            # Windows batch script for admin
├── admin.cmd            # Windows CMD script for admin
├── start-admin.ps1      # PowerShell script for admin
├── user.bat             # Windows batch script for user
├── user.cmd             # Windows CMD script for user
├── start-user.ps1       # PowerShell script for user
├── demo.sh              # Demo instructions (Unix)
└── README.md            # This file
```

---

## 🎉 Have Fun!

This simulation provides a complete quiz experience with real-time interaction, scoring, and leaderboards. Perfect for:
- Testing the WebSocket server
- Demonstrating quiz functionality
- Learning about real-time applications
- Having fun with friends in the same room!

---

## 📦 Package Scripts Reference

All commands work on Windows, macOS, and Linux:

```bash
# Install dependencies
npm install

# Start admin (15s default)
npm run admin

# Start admin (custom interval)
npm run admin 20

# Start user
npm run user <activity-key> <nickname>

# Start user with custom ID
npm run user <activity-key> <nickname> <user-id>

# Compile scripts
npm run build:simulate

# Run compiled admin
npm run admin:node

# Run compiled user
npm run user:node <activity-key> <nickname>
```

---

**Server URL:** `https://atomq-quiz-partykit-server.atombaseai.partykit.dev`
**Quiz Questions:** 10
**Default Question Time:** 15 seconds
**Min/Max Question Time:** 5-60 seconds
**Platforms:** Windows, macOS, Linux

For questions or issues, check the terminal output for detailed error messages.
