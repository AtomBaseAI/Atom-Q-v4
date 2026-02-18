# Quick Start Guide - Windows

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies

Open Command Prompt or PowerShell and run:

```cmd
npm install
```

### Step 2: Start Admin (Terminal 1)

**Command Prompt:**
```cmd
admin.bat
```

**PowerShell:**
```powershell
.\start-admin.ps1
```

**Or using npm (both):**
```cmd
npm run admin
```

Note the **Activity Key** displayed (e.g., `quiz-a1b2c3d4`)

### Step 3: Start Users (Terminals 2, 3, 4)

Replace `<activity-key>` with the key from Step 2.

**Command Prompt:**
```cmd
user.bat <activity-key> Alice
user.bat <activity-key> Bob
user.bat <activity-key> Charlie


**PowerShell:**
```powershell
.\start-user.ps1 <activity-key> Alice
.\start-user.ps1 <activity-key> Bob
.\start-user.ps1 <activity-key> Charlie
```

**Or using npm (both):**
```cmd
npm run user quiz-d4f67fe3 Alice


npm run user <activity-key> Alice
npm run user <activity-key> Bob
npm run user <activity-key> Charlie
```

### Step 4: Start Quiz

In the **Admin terminal**, press `1` and Enter.

### Step 5: Answer Questions

In each **User terminal**, type option number (1-4) and press Enter.

---

## 📁 Windows Scripts Available

| Script | Type | Command |
|--------|------|---------|
| `admin.bat` | Batch | `admin.bat` |
| `admin.cmd` | CMD | `admin.cmd` |
| `start-admin.ps1` | PowerShell | `.\start-admin.ps1` |
| `user.bat` | Batch | `user.bat <key> <name>` |
| `user.cmd` | CMD | `user.cmd <key> <name>` |
| `start-user.ps1` | PowerShell | `.\start-user.ps1 <key> <name>` |

---

## 💡 All Platforms Commands (Work on Windows Too)

```cmd
npm install
npm run admin
npm run user <activity-key> Alice
```

These work on Windows, macOS, and Linux!

---

## 🔧 Troubleshooting

### PowerShell Execution Policy Error

If you get error about running scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use `admin.cmd` / `user.cmd` instead.

### "tsx" or "npx" Not Found

```cmd
npm install
```

### Colors Not Showing in CMD

Use PowerShell instead for better color support.

---

## 🎯 Example Session

### Terminal 1 (Admin)
```cmd
C:\my-project> admin.bat

========================================================================
Starting Quiz Admin...
========================================================================

======================================================================
🎮 QUIZ ADMIN TERMINAL
======================================================================

Activity Key: quiz-a1b2c3d4e5
Question Interval: 15 seconds

✓ Connected to quiz server
✓ Admin privileges confirmed

Live Users: 0 | Status: Waiting

Enter your choice:
```

### Terminal 2 (User)
```cmd
C:\my-project> user.bat quiz-a1b2c3d4e5 Alice

========================================================================
Starting Quiz User...
========================================================================

======================================================================
🎮 QUIZ USER TERMINAL
======================================================================

Activity Key: quiz-a1b2c3d4e5
User: Alice (😀)

✓ Connected to quiz server
✓ Joined lobby as Alice

⏳ Waiting for quiz to start...
```

---

**That's it! You're ready to quiz! 🎉**
