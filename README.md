# ⚡gramstr - Instagram Content Management Tool

A full-stack application for downloading Instagram content and managing cross-platform distribution. Built as a proof of concept for content management workflows.

⚠️ **Educational Purpose Only**: This tool is designed for educational and proof-of-concept purposes. Please ensure you comply with Instagram's Terms of Service and respect content creators' rights when using this application.

## Tech Stack

### Frontend
- [Next.js 15](https://nextjs.org/docs) with App Router
- [React 19](https://react.dev/) 
- [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- [TypeScript](https://www.typescriptlang.org/)

### Backend
- [PostgreSQL](https://www.postgresql.org/) with [Supabase](https://supabase.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [FastAPI](https://fastapi.tiangolo.com/) Python backend
- [Instaloader](https://instaloader.github.io/) for Instagram content downloading

### Auth & Infrastructure
- [Clerk](https://clerk.com/) for authentication
- [Stripe](https://stripe.com/) for payments
- Next.js Server Actions for data mutations

## Features

- 🔐 User authentication and authorization
- 📱 Instagram content URL input and validation
- 📥 Automated content downloading with metadata extraction
- 📊 Content library management with stats
- 🔄 Cross-platform posting framework (ready for integration)
- 💳 Subscription-based access control
- 📈 Usage analytics and content tracking

## Prerequisites

### Required Accounts
- [GitHub](https://github.com/) account
- [Supabase](https://supabase.com/) account  
- [Clerk](https://clerk.com/) account
- [Stripe](https://stripe.com/) account (optional for payments)
- [Vercel](https://vercel.com/) account (for deployment)

### Required Software
- Node.js 18+ 
- Python 3.8+
- PostgreSQL (via Supabase)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd dumpstr
npm install
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env.local
```

Fill in your environment variables in `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Clerk Authentication  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Python Backend
PYTHON_BACKEND_URL=http://localhost:8000
```

### 3. Database Setup

Start Supabase locally:
```bash
npm run db:local
```

Generate and run database migrations:
```bash
npm run db:generate
npm run db:push
```

### 4. Python Backend Setup

Set up the Python environment:
```bash
npm run python:setup
```

This will create a virtual environment and install required Python packages.

### 5. Development Server

Start both frontend and backend:
```bash
npm run backend:dev
```

Or start them separately:
```bash
# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: Python backend  
npm run python:start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Supabase Studio: http://127.0.0.1:54323

## Usage

1. **Sign Up/Login**: Create an account using Clerk authentication
2. **Add Instagram URL**: Paste an Instagram post/reel URL into the download form
3. **Download Content**: The system will download the content and extract metadata
4. **Manage Library**: View your downloaded content with engagement stats
5. **Cross-Post**: Use the cross-posting feature to distribute content across platforms

## Database Schema

The application uses the following main tables:

- `customers` - User subscription and billing information
- `downloaded_content` - Instagram content metadata and file paths
- `cross_post_history` - Track cross-platform posting attempts
- `user_platform_credentials` - Store encrypted API credentials for other platforms

## API Endpoints

### Next.js API Routes
- `POST /api/content/download` - Download Instagram content
- `GET /api/content/list` - List user's downloaded content  
- `POST /api/content/cross-post` - Initiate cross-platform posting

### Python Backend (FastAPI)
- `POST /download` - Process Instagram URL and download content
- `GET /downloads/{user_id}` - List downloaded files for user

## Scripts

- `npm run dev` - Start Next.js development server
- `npm run python:setup` - Set up Python environment  
- `npm run python:start` - Start Python backend
- `npm run backend:dev` - Start both frontend and backend
- `npm run db:push` - Push database schema changes
- `npm run lint` - Run ESLint
- `npm run types` - Check TypeScript types

## Deployment

### Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Python Backend Deployment
Deploy the FastAPI backend to platforms like:
- Railway
- Heroku  
- DigitalOcean App Platform
- AWS Lambda with Mangum

## Legal Considerations

⚠️ **Important**: This tool is for educational purposes. When using:

- Only download content you have permission to use
- Respect Instagram's Terms of Service
- Obtain proper permissions before reposting content
- Consider copyright and intellectual property rights
- Use responsibly and ethically

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is for educational purposes only. Please use responsibly and in compliance with all applicable terms of service and laws.
