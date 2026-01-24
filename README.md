# Atom Q - v4

A modern, full-featured quiz and assessment platform built with Next.js, TypeScript, Prisma, and shadcn/ui.

## Features

- **User Management**: Admin and user roles with comprehensive access controls
- **Quiz System**: Create, manage, and take quizzes with various question types
- **Assessment Platform**: Advanced assessments with enrollment and submission tracking
- **Question Management**: Organize questions in groups, report issues, and import/export
- **Real-time Analytics**: Comprehensive dashboards for performance analysis
- **Multi-campus Support**: Manage multiple campuses, batches, and departments
- **Registration Codes**: Control user access with time-limited registration codes
- **Rich Text Editor**: Beautiful content creation with TipTap editor
- **Responsive Design**: Mobile-first UI with dark mode support
- **Rate Limiting**: Built-in security with login attempt limiting

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Database**: Prisma ORM (SQLite dev, PostgreSQL prod recommended)
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Authentication**: NextAuth.js v4
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Text Editor**: TipTap
- **File Processing**: PapaParse (CSV), XLSX, Archiver

## Getting Started

### Prerequisites

- Node.js 18+
- Bun or npm
- A database (SQLite for dev, PostgreSQL for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AtomBaseAI/Atom-Q-v4.git
   cd Atom-Q-v4
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

4. **Set up the database**
   ```bash
   bunx prisma generate
   bun run db:push
   bun run db:seed
   ```

5. **Start the development server**
   ```bash
   bun run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Credentials

After seeding the database:

```
Admin: admin@atomcode.dev / admin@atomcode.dev
Student: student@mit.edu / user123
Student: student@stanford.edu / user123
Student: student@harvard.edu / user123
```

## Database Management

### Prisma Commands

```bash
# Generate Prisma Client
bun run db:generate

# Push schema changes (development)
bun run db:push

# Run migrations (production)
bun run db:migrate:deploy

# Reset database (warning: deletes all data)
bun run db:reset

# Seed database with sample data
bun run db:seed
```

### Using Prisma Studio

```bash
bunx prisma studio
```

This opens a visual database browser at http://localhost:5555

## Deployment

### Vercel Deployment (Recommended)

Comprehensive deployment guide available in [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

**Quick Start:**

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

**Required Environment Variables for Vercel:**

- `DATABASE_URL` - PostgreSQL connection string (use Vercel Postgres)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production URL
- `NODE_ENV` - Set to `production`

### Docker Deployment

```bash
# Build Docker image
docker build -t atom-q .

# Run container
docker run -p 3000:3000 --env-file .env atom-q
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts               # Database seeding script
│   └── dev.db               # SQLite database (dev only)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── user/            # User portal pages
│   │   └── api/            # API routes
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── [feature]/      # Feature-specific components
│   ├── lib/                # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── stores/            # Zustand stores
│   └── types/            # TypeScript types
├── public/                # Static assets
├── .env.example          # Environment variables template
└── package.json          # Dependencies and scripts
```

## Available Scripts

```bash
bun run dev              # Start development server
bun run build            # Build for production
bun run start            # Start production server
bun run lint             # Run ESLint
bun run test             # Run tests
bun run db:push         # Push schema to database
bun run db:generate     # Generate Prisma Client
bun run db:migrate      # Run migrations
bun run db:seed         # Seed database
```

## Configuration

### NextAuth

Configure authentication in `src/lib/auth.ts`:

- Session strategy: JWT
- Session duration: 24 hours
- Custom pages: Custom sign-in page
- Rate limiting: Built-in login attempt limiting

### Database

Modify database schema in `prisma/schema.prisma`:

- Models: User, Quiz, Assessment, Question, etc.
- Enums: UserRole, QuestionType, DifficultyLevel, etc.
- Relationships: Comprehensive foreign key relationships

### Settings

Application settings are managed through the admin dashboard:
- Site title and description
- Maintenance mode
- Registration controls
- Registration codes

## Security Features

- Password hashing with bcrypt
- Rate limiting for login attempts
- Secure session management with JWT
- Input validation with Zod
- CSRF protection via NextAuth
- SQL injection protection via Prisma

## Performance Optimizations

- Prisma Client caching
- Optimized database queries
- Static page generation where possible
- Image optimization with Next.js Image
- Bundle optimization with Next.js

## Troubleshooting

### Build Errors

```bash
# Clean build
rm -rf .next node_modules
bun install
bun run build
```

### Database Issues

```bash
# Regenerate Prisma Client
bunx prisma generate

# Reset database
bun run db:reset
bun run db:seed
```

### Environment Variables

Ensure all required variables are set:
```bash
# Check if variables are loaded
cat .env
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For detailed deployment information, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

For issues and questions, please open a GitHub issue.

## Roadmap

- [ ] Multi-language support (i18n)
- [ ] Email notifications
- [ ] Advanced analytics with charts
- [ ] Question bank marketplace
- [ ] Integration with LMS platforms
- [ ] Mobile app (React Native)

---

Built with ❤️ using Next.js and modern web technologies.
