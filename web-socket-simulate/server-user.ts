/**
 * Quiz User Terminal Interface
 * Interactive CLI for quiz participants
 */

import { WebSocket } from 'ws';
import * as readline from 'readline';

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
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearLine() {
  process.stdout.write('\x1b[2K');
}

interface Question {
  id: string;
  text: string;
  options: string[];
  duration: number;
  questionIndex: number;
  totalQuestions: number;
}

class QuizUser {
  private activityKey: string;
  private userId: string;
  private nickname: string;
  private ws: WebSocket | null = null;
  private rl: readline.Interface;
  private currentQuestion: Question | null = null;
  private currentQuestionStartTime: number = 0;
  private canAnswer: boolean = false;
  private hasAnswered: boolean = false;
  private totalScore: number = 0;
  private questionCount: number = 0;
  private avatar: string;
  private connected: boolean = false;

  constructor(activityKey: string, userId: string, nickname: string) {
    this.activityKey = activityKey;
    this.userId = userId;
    this.nickname = nickname;
    this.avatar = this.getRandomAvatar();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  getRandomAvatar(): string {
    const avatars = ['😀', '😎', '🚀', '🎮', '🎯', '🌟', '💡', '🔥', '⭐', '🎪'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  async start() {
    this.showBanner();
    log(`Activity Key: ${this.activityKey}`, 'bgBlue');
    log(`User: ${this.nickname} (${this.avatar})\n`, 'cyan');

    // Connect to server
    await this.connect();

    // Join lobby
    this.joinLobby();

    log('\n⏳ Waiting for quiz to start...', 'yellow');
    log('   (The admin will start the quiz)\n', 'cyan');
  }

  showBanner() {
    console.log('\n' + '='.repeat(70));
    log('🎮 QUIZ USER TERMINAL', 'bright');
    log('='.repeat(70) + '\n');
  }

  async connect(): Promise<void> {
    const wsUrl = `${WS_URL}/party/${this.activityKey}`;
    log(`Connecting to ${wsUrl}...`, 'cyan');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        log('✓ Connected to quiz server', 'green');
        resolve();
      };

      this.ws.onerror = (error) => {
        log('✗ Connection error', 'red');
        log('   Make sure the activity key is correct and the admin is running', 'yellow');
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
        const userCount = message.payload.users?.length || 0;
        this.showStatus(userCount);
        break;

      case 'ADMIN_CONFIRMED':
        // Not applicable for regular users
        break;

      case 'GET_READY':
        log('\n' + '='.repeat(70), 'yellow');
        log(`🎯 GET READY!`, 'bright');
        log(`   Question ${message.payload.questionIndex}/${message.payload.totalQuestions}`, 'bright');
        log(`   Starting in ${message.payload.duration} seconds...`, 'cyan');
        log('='.repeat(70) + '\n', 'yellow');
        this.canAnswer = false;
        this.hasAnswered = false;
        break;

      case 'QUESTION_LOADER':
        log('⏳ Loading question...\n', 'cyan');
        break;

      case 'QUESTION_START':
        this.currentQuestion = message.payload;
        this.currentQuestionStartTime = Date.now();
        this.canAnswer = true;
        this.hasAnswered = false;
        this.showQuestion();
        this.promptForAnswer();
        break;

      case 'QUESTION_STATS_UPDATE':
        this.showLiveStats(message.payload);
        break;

      case 'ANSWER_CONFIRMED':
        this.hasAnswered = true;
        log(`\n✓ Answer confirmed!`, 'green');
        log(`   Score: ${message.payload.score} points`, 'green');
        log(`   Time taken: ${message.payload.timeSpent.toFixed(2)} seconds`, 'cyan');
        break;

      case 'SHOW_ANSWER':
        this.canAnswer = false;
        log('\n' + '='.repeat(70), 'magenta');
        log(`💡 ANSWER REVEALED`, 'bright');
        log('='.repeat(70), 'magenta');
        log(`Correct Answer: Option ${message.payload.correctAnswer + 1}`, 'green');

        const stats = message.payload.questionStats;
        if (stats) {
          log(`\n📊 Question Statistics:`, 'cyan');
          log(`   Total Responses: ${stats.totalResponses}`, 'cyan');
          if (stats.optionCounts) {
            stats.optionCounts.forEach((count: number, idx: number) => {
              const percentage = stats.totalResponses > 0
                ? ((count / stats.totalResponses) * 100).toFixed(1)
                : '0.0';
              log(`   Option ${idx + 1}: ${count} votes (${percentage}%)`, 'cyan');
            });
          }
        }
        log('='.repeat(70) + '\n', 'magenta');
        break;

      case 'LEADERBOARD_UPDATE':
        this.showLeaderboard(message.payload.leaderboard);
        break;

      case 'QUIZ_END':
        log('\n' + '='.repeat(70), 'bgGreen');
        log('🏁 QUIZ COMPLETED!', 'bright');
        log('='.repeat(70) + '\n', 'bgGreen');
        this.showLeaderboard(message.payload.finalLeaderboard);
        log(`\n📊 Your Final Score: ${this.totalScore} points`, 'bgGreen');
        log(`   Questions Answered: ${this.questionCount}`, 'cyan');
        log('\n🎉 Thanks for playing!', 'yellow');
        this.ws?.close();
        this.rl.close();
        process.exit(0);
        break;

      case 'WAITING_SCREEN':
        log('\n⏸️  Quiz finished. Waiting for next session...\n', 'yellow');
        break;

      default:
        log(`\n📩 Received: ${message.type}`, 'magenta');
    }
  }

  joinLobby() {
    const message = {
      type: 'JOIN_LOBBY',
      payload: {
        userId: this.userId,
        nickname: this.nickname,
        avatar: this.avatar,
        activityKey: this.activityKey,
        role: 'PLAYER',
      },
    };
    this.ws?.send(JSON.stringify(message));
    log(`✓ Joined lobby as ${this.nickname}`, 'green');
  }

  showStatus(userCount: number) {
    clearLine();
    process.stdout.write(`\r${colors.bgBlue} Connected: ${this.nickname} ${this.avatar} | Users: ${userCount}${colors.reset}`);
  }

  showQuestion() {
    if (!this.currentQuestion) return;

    console.log('\n' + '='.repeat(70));
    log(`❓ Question ${this.currentQuestion.questionIndex}/${this.currentQuestion.totalQuestions}`, 'bright');
    log('='.repeat(70));
    log(this.currentQuestion.text, 'bright');
    log('\nOptions:', 'cyan');
    this.currentQuestion.options.forEach((opt, idx) => {
      log(`  ${idx + 1}. ${opt}`);
    });
    log(`\n⏱️  Time Limit: ${this.currentQuestion.duration} seconds`, 'yellow');
    log('='.repeat(70) + '\n');
  }

  showLiveStats(stats: any) {
    if (this.hasAnswered) {
      const responseRate = ((stats.totalResponses / stats.totalUsers) * 100).toFixed(1);
      process.stdout.write('\r\x1b[2K');
      process.stdout.write(
        `\r${colors.cyan}Responses: ${stats.totalResponses}/${stats.totalUsers} (${responseRate}%)${colors.reset}`
      );
    }
  }

  showLeaderboard(leaderboard: any[] = []) {
    console.log('\n' + '='.repeat(70));
    log('🏆 LEADERBOARD', 'bright');
    log('='.repeat(70));

    if (leaderboard.length === 0) {
      log('  No scores yet', 'yellow');
    } else {
      leaderboard.forEach((entry: any, idx: number) => {
        const isMe = entry.userId === this.userId;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
        const prefix = isMe ? '→ ' : '   ';
        const color = isMe ? 'green' : 'cyan';
        log(`${prefix}${medal} ${idx + 1}. ${entry.nickname} - ${entry.totalScore} pts ${isMe ? '(YOU)' : ''}`, color);
      });
    }

    console.log('='.repeat(70) + '\n');
  }

  promptForAnswer() {
    if (!this.canAnswer || !this.currentQuestion) return;

    const question = `\nEnter your answer (1-${this.currentQuestion.options.length}): `;

    // Use a separate readline interface for the answer prompt
    const answerRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const timer = setTimeout(() => {
      if (!this.hasAnswered && this.canAnswer) {
        answerRl.close();
        log('\n⏰ Time\'s up!', 'red');
      }
    }, this.currentQuestion.duration * 1000);

    answerRl.question(question, (answer) => {
      clearTimeout(timer);

      if (!this.canAnswer) {
        answerRl.close();
        return;
      }

      const answerNum = parseInt(answer.trim());

      if (isNaN(answerNum) || answerNum < 1 || answerNum > this.currentQuestion!.options.length) {
        log('\n⚠️  Invalid answer. Please enter a number between 1 and ' + this.currentQuestion!.options.length, 'yellow');
        // Reprompt
        answerRl.close();
        if (this.canAnswer) {
          this.promptForAnswer();
        }
        return;
      }

      // Submit answer
      const timeSpent = (Date.now() - this.currentQuestionStartTime) / 1000;
      this.submitAnswer(answerNum - 1, timeSpent);

      answerRl.close();
    });
  }

  submitAnswer(answer: number, timeSpent: number) {
    if (!this.currentQuestion || !this.canAnswer) return;

    this.canAnswer = false;
    this.hasAnswered = true;
    this.questionCount++;

    const message = {
      type: 'SUBMIT_ANSWER',
      payload: {
        userId: this.userId,
        questionId: this.currentQuestion.id,
        answer: answer,
        timeSpent: timeSpent,
        activityKey: this.activityKey,
      },
    };

    this.ws?.send(JSON.stringify(message));

    log(`\n🎯 Submitted answer: Option ${answer + 1}`, 'magenta');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log('Usage: bun run server-user.ts <activity-key> <nickname> [user-id]', 'yellow');
    log('\nExample:', 'cyan');
    log('  bun run server-user.ts quiz-a1b2c3d4 Alice', 'cyan');
    log('  bun run server-user.ts quiz-a1b2c3d4 Bob user-123', 'cyan');
    log('\nNote: Run the admin first to get the activity key', 'yellow');
    process.exit(1);
  }

  const activityKey = args[0];
  const nickname = args[1];
  const userId = args[2] || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const user = new QuizUser(activityKey, userId, nickname);
  await user.start();
}

main().catch(error => {
  log(`Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
