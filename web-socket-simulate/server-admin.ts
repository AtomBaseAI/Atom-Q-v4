/**
 * Quiz Admin Terminal Interface
 * Interactive CLI for managing quiz sessions
 */

import { WebSocket } from 'ws';
import * as readline from 'readline';
import { randomBytes } from 'crypto';

const WS_URL = 'https://atomq-quiz-partykit-server.atombaseai.partykit.dev'.replace(
  'https://',
  'wss://'
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearLine() {
  process.stdout.write('\x1b[2K');
}

function moveCursorUp(lines: number) {
  process.stdout.write(`\x1b[${lines}F`);
}

// 10 MCQ Questions
const QUESTIONS = [
  {
    id: 'q1',
    text: 'What is the capital of Japan?',
    options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
    correctAnswer: 2,
  },
  {
    id: 'q2',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 1,
  },
  {
    id: 'q3',
    text: 'What is the largest mammal in the world?',
    options: ['African Elephant', 'Blue Whale', 'Giraffe', 'Polar Bear'],
    correctAnswer: 1,
  },
  {
    id: 'q4',
    text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 1,
  },
  {
    id: 'q5',
    text: 'What is the chemical symbol for Gold?',
    options: ['Ag', 'Fe', 'Au', 'Cu'],
    correctAnswer: 2,
  },
  {
    id: 'q6',
    text: 'In which year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctAnswer: 2,
  },
  {
    id: 'q7',
    text: 'What is the smallest prime number?',
    options: ['0', '1', '2', '3'],
    correctAnswer: 2,
  },
  {
    id: 'q8',
    text: 'Which country has the largest population?',
    options: ['USA', 'India', 'China', 'Russia'],
    correctAnswer: 2,
  },
  {
    id: 'q9',
    text: 'What is the speed of light in km/s?',
    options: ['300,000', '150,000', '450,000', '100,000'],
    correctAnswer: 0,
  },
  {
    id: 'q10',
    text: 'Who painted the Mona Lisa?',
    options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'],
    correctAnswer: 2,
  },
];

interface User {
  id: string;
  nickname: string;
  avatar: string;
  role: string;
  status: string;
  joinedAt: number;
  totalScore: number;
}

class QuizAdmin {
  private activityKey: string;
  private questionInterval: number;
  private ws: WebSocket | null = null;
  private users: Map<string, User> = new Map();
  private currentQuestionIndex: number = 0;
  private currentQuestionStats: any = null;
  private quizStarted: boolean = false;
  private quizEnded: boolean = false;
  private rl: readline.Interface;
  private questionTimers: NodeJS.Timeout[] = [];

  constructor(questionInterval: number = 15) {
    // Generate a random activity key
    this.activityKey = 'quiz-' + randomBytes(4).toString('hex').toLowerCase();
    this.questionInterval = questionInterval;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    this.showBanner();
    log(`Activity Key: ${this.activityKey}`, 'bgBlue');
    log(`Question Interval: ${this.questionInterval} seconds\n`, 'cyan');

    // Connect to server
    await this.connect();

    // Join as admin
    this.joinLobby();

    // Wait a bit then show menu
    setTimeout(() => {
      this.showMenu();
      this.handleInput();
    }, 1000);
  }

  showBanner() {
    console.log('\n' + '='.repeat(70));
    log('🎮 QUIZ ADMIN TERMINAL', 'bright');
    log('='.repeat(70) + '\n');
  }

  showMenu() {
    console.log('\n' + '-'.repeat(70));
    log('📋 ADMIN MENU', 'bright');
    log('='.repeat(70));
    log('1. Start Quiz', 'green');
    log('2. Show Connected Users', 'cyan');
    log('3. Show Leaderboard', 'yellow');
    log('4. Show Current Question Stats', 'blue');
    log('5. Show Questions List', 'magenta');
    log('6. Set Question Interval', 'cyan');
    log('7. Show Activity Info', 'yellow');
    log('8. End Quiz', 'red');
    log('0. Exit', 'red');
    log('='.repeat(70) + '\n');
  }

  async connect(): Promise<void> {
    const wsUrl = `${WS_URL}/party/${this.activityKey}`;
    log(`Connecting to ${wsUrl}...`, 'cyan');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        log('✓ Connected to quiz server', 'green');
        resolve();
      };

      this.ws.onerror = (error) => {
        log('✗ Connection error', 'red');
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data.toString()));
      };

      this.ws.onclose = () => {
        log('\n⚠️  Disconnected from server', 'yellow');
        process.exit(0);
      };
    });
  }

  handleMessage(message: any) {
    switch (message.type) {
      case 'SYNC_TIME':
        // Ignore frequent sync messages
        break;

      case 'USER_UPDATE':
        this.updateUsers(message.payload.users || []);
        this.showLiveUsers();
        break;

      case 'ADMIN_CONFIRMED':
        log('\n✓ Admin privileges confirmed', 'bgGreen');
        break;

      case 'GET_READY':
        log(`\n🎯 Get Ready! Question ${message.payload.questionIndex}/${message.payload.totalQuestions}`, 'yellow');
        break;

      case 'QUESTION_LOADER':
        log('\n⏳ Loading next question...', 'cyan');
        break;

      case 'QUESTION_START':
        this.currentQuestionIndex = message.payload.questionIndex - 1;
        log(`\n${'='.repeat(70)}`, 'blue');
        log(`❓ Question ${message.payload.questionIndex}/${message.payload.totalQuestions}`, 'bright');
        log('='.repeat(70), 'blue');
        log(message.payload.question, 'bright');
        log('\nOptions:', 'cyan');
        message.payload.options.forEach((opt: string, idx: number) => {
          log(`  ${idx + 1}. ${opt}`);
        });
        log(`\n⏱️  Time: ${message.payload.duration} seconds`, 'yellow');
        break;

      case 'QUESTION_STATS_UPDATE':
        this.currentQuestionStats = message.payload;
        this.showQuestionStats();
        break;

      case 'SHOW_ANSWER':
        const qIndex = this.currentQuestionIndex;
        const question = QUESTIONS[qIndex];
        log(`\n${'='.repeat(70)}`, 'green');
        log(`💡 Answer Revealed`, 'bright');
        log('='.repeat(70), 'green');
        log(`Question: ${question.text}`);
        log(`Correct Answer: ${question.options[question.correctAnswer]} (Option ${question.correctAnswer + 1})`, 'green');
        log(`Total Responses: ${message.payload.questionStats?.totalResponses || 0}`);
        log('='.repeat(70), 'green');
        break;

      case 'LEADERBOARD_UPDATE':
        this.showLeaderboard(message.payload.leaderboard);
        break;

      case 'QUIZ_END':
        this.quizEnded = true;
        log('\n' + '='.repeat(70), 'bgGreen');
        log('🏁 QUIZ COMPLETED!', 'bright');
        log('='.repeat(70) + '\n', 'bgGreen');
        this.showLeaderboard(message.payload.finalLeaderboard);
        this.showMenu();
        break;

      case 'WAITING_SCREEN':
        log('\n⏸️  Waiting for next quiz...', 'yellow');
        break;

      default:
        log(`\n📩 Received: ${message.type}`, 'magenta');
    }
  }

  joinLobby() {
    const message = {
      type: 'JOIN_LOBBY',
      payload: {
        userId: 'admin',
        nickname: 'Game Master',
        avatar: '👑',
        activityKey: this.activityKey,
        role: 'ADMIN',
      },
    };
    this.ws?.send(JSON.stringify(message));
  }

  updateUsers(users: any[]) {
    this.users.clear();
    users.forEach((user: any) => {
      this.users.set(user.id, user);
    });
  }

  showLiveUsers() {
    const userCount = this.users.size;
    const usersList = Array.from(this.users.values())
      .filter(u => u.role !== 'ADMIN')
      .map(u => `  • ${u.nickname} (${u.avatar})`)
      .join('\n');

    clearLine();
    process.stdout.write(`\x1b[1A\x1b[2K`);
    process.stdout.write(
      `\r${colors.bgBlue} Live Users: ${userCount} ${colors.reset} | ` +
      `${colors.green}Status: ${this.quizStarted ? (this.quizEnded ? 'Ended' : 'Active') : 'Waiting'}${colors.reset}`
    );
  }

  showQuestionStats() {
    if (!this.currentQuestionStats) return;

    const stats = this.currentQuestionStats;
    process.stdout.write('\r\x1b[2K');
    process.stdout.write(
      `\r${colors.cyan}Responses: ${stats.totalResponses}/${stats.totalUsers} users | ` +
      `Options: [${stats.optionCounts.join(' | ')}]${colors.reset}`
    );
  }

  showConnectedUsers() {
    console.log('\n' + '='.repeat(70));
    log(`👥 Connected Users (${this.users.size})`, 'bright');
    log('='.repeat(70));

    if (this.users.size === 0) {
      log('  No users connected yet', 'yellow');
    } else {
      this.users.forEach((user, id) => {
        const roleColor = user.role === 'ADMIN' ? 'green' : 'cyan';
        log(`  • ${user.nickname} (${user.avatar}) - ${user.role}`, roleColor);
        log(`    ID: ${id} | Status: ${user.status} | Score: ${user.totalScore}`, 'cyan');
      });
    }
    console.log('='.repeat(70) + '\n');
    this.showMenu();
  }

  showLeaderboard(leaderboard: any[] = []) {
    console.log('\n' + '='.repeat(70));
    log('🏆 LEADERBOARD', 'bright');
    log('='.repeat(70));

    if (leaderboard.length === 0) {
      // Build from users map
      const users = Array.from(this.users.values())
        .filter(u => u.role !== 'ADMIN')
        .sort((a, b) => b.totalScore - a.totalScore);

      if (users.length === 0) {
        log('  No players yet', 'yellow');
      } else {
        users.forEach((user, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
          log(`  ${medal} ${idx + 1}. ${user.nickname} (${user.avatar}) - ${user.totalScore} pts`, 'cyan');
        });
      }
    } else {
      leaderboard.forEach((entry: any, idx: number) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
        log(`  ${medal} ${idx + 1}. ${entry.nickname} - ${entry.totalScore} pts`, 'cyan');
      });
    }

    console.log('='.repeat(70) + '\n');
    this.showMenu();
  }

  showQuestionsList() {
    console.log('\n' + '='.repeat(70));
    log('📚 QUIZ QUESTIONS', 'bright');
    log('='.repeat(70));

    QUESTIONS.forEach((q, idx) => {
      log(`\n${idx + 1}. ${q.text}`, 'bright');
      q.options.forEach((opt, oIdx) => {
        const isCorrect = oIdx === q.correctAnswer;
        const prefix = isCorrect ? '✓' : ' ';
        log(`   ${prefix} ${oIdx + 1}. ${opt}`, isCorrect ? 'green' : 'cyan');
      });
    });

    console.log('\n' + '='.repeat(70) + '\n');
    this.showMenu();
  }

  startQuiz() {
    if (this.quizStarted) {
      log('\n⚠️  Quiz already started!', 'yellow');
      this.showMenu();
      return;
    }

    if (this.users.size < 2) {
      log('\n⚠️  Wait for at least 1 player to join!', 'yellow');
      this.showMenu();
      return;
    }

    this.quizStarted = true;
    log('\n🚀 Starting quiz...', 'green');

    // Update question duration based on interval
    const questionsWithDuration = QUESTIONS.map(q => ({
      ...q,
      duration: this.questionInterval,
    }));

    const message = {
      type: 'START_QUIZ',
      payload: {
        activityKey: this.activityKey,
        questions: questionsWithDuration,
      },
    };

    this.ws?.send(JSON.stringify(message));
  }

  endQuiz() {
    log('\n🏁 Ending quiz...', 'yellow');
    this.quizEnded = true;
    // The server will handle QUIZ_END message
    this.showMenu();
  }

  showActivityInfo() {
    console.log('\n' + '='.repeat(70));
    log('ℹ️  ACTIVITY INFORMATION', 'bright');
    log('='.repeat(70));
    log(`Activity Key: ${this.activityKey}`, 'cyan');
    log(`Question Interval: ${this.questionInterval} seconds`, 'cyan');
    log(`Total Questions: ${QUESTIONS.length}`, 'cyan');
    log(`Connected Users: ${this.users.size}`, 'cyan');
    log(`Quiz Status: ${this.quizStarted ? (this.quizEnded ? 'Ended' : 'Active') : 'Not Started'}`, this.quizStarted ? 'green' : 'yellow');
    log(`Current Question: ${this.currentQuestionIndex + 1}/${QUESTIONS.length}`, 'cyan');
    console.log('='.repeat(70) + '\n');
    this.showMenu();
  }

  async setQuestionInterval() {
    const answer = await this.askQuestion('\nEnter question interval in seconds (default 15): ');
    const interval = parseInt(answer) || 15;

    if (interval < 5 || interval > 60) {
      log('⚠️  Interval must be between 5 and 60 seconds', 'yellow');
    } else {
      this.questionInterval = interval;
      log(`✓ Question interval set to ${interval} seconds`, 'green');
    }

    this.showMenu();
  }

  askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  async handleInput() {
    const answer = await this.askQuestion('Enter your choice: ');

    switch (answer.trim()) {
      case '1':
        this.startQuiz();
        break;
      case '2':
        this.showConnectedUsers();
        break;
      case '3':
        this.showLeaderboard();
        break;
      case '4':
        if (this.currentQuestionStats) {
          console.log('\n' + '='.repeat(70));
          log('📊 CURRENT QUESTION STATS', 'bright');
          log('='.repeat(70));
          log(`Question: ${this.currentQuestionIndex + 1}`, 'cyan');
          log(`Total Responses: ${this.currentQuestionStats.totalResponses}`, 'cyan');
          log(`Total Users: ${this.currentQuestionStats.totalUsers}`, 'cyan');
          log(`Response Rate: ${((this.currentQuestionStats.totalResponses / this.currentQuestionStats.totalUsers) * 100).toFixed(1)}%`, 'yellow');
          log(`\nOption Distribution:`, 'cyan');
          this.currentQuestionStats.optionCounts.forEach((count: number, idx: number) => {
            const percentage = this.currentQuestionStats.totalResponses > 0
              ? ((count / this.currentQuestionStats.totalResponses) * 100).toFixed(1)
              : '0.0';
            log(`  Option ${idx + 1}: ${count} votes (${percentage}%)`, 'magenta');
          });
          console.log('='.repeat(70) + '\n');
        } else {
          log('\n⚠️  No active question stats available', 'yellow');
        }
        this.showMenu();
        break;
      case '5':
        this.showQuestionsList();
        break;
      case '6':
        await this.setQuestionInterval();
        break;
      case '7':
        this.showActivityInfo();
        break;
      case '8':
        this.endQuiz();
        break;
      case '0':
        log('\n👋 Goodbye!', 'yellow');
        this.ws?.close();
        this.rl.close();
        process.exit(0);
        break;
      default:
        log('\n⚠️  Invalid choice. Please try again.', 'yellow');
        this.showMenu();
    }

    if (!this.quizEnded) {
      this.handleInput();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const interval = args[0] ? parseInt(args[0]) : 15;

  const admin = new QuizAdmin(interval);
  await admin.start();
}

main().catch(error => {
  log(`Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
