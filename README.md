# White-Label Gamification Platform

A unified gamification platform that combines dashboard functionality with ranking systems, powered by Funifier and built with Next.js.

## Features

- **Unified Dashboard**: Personal gamification metrics and progress tracking
- **Ranking System**: Personalized and global leaderboards with race visualization
- **White-Label Configuration**: Customizable branding and feature toggles
- **Funifier Integration**: Seamless integration with Funifier APIs
- **Demo Mode**: Full functionality with sample data for evaluation

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: Zustand + React Query
- **Testing**: Vitest + Testing Library
- **Animations**: Framer Motion
- **Icons**: Lucide React + Heroicons

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── dashboard/         # Dashboard-specific components
│   ├── ranking/           # Ranking-specific components
│   ├── admin/             # Admin panel components
│   └── layout/            # Layout and navigation components
├── types/                 # TypeScript type definitions
│   ├── funifier.ts        # Funifier API types
│   ├── white-label.ts     # White-label configuration types
│   ├── dashboard.ts       # Dashboard and user interface types
│   ├── ranking.ts         # Ranking system types
│   └── api.ts             # API response and error types
├── lib/                   # Utility functions and configurations
├── services/              # API services and business logic
├── hooks/                 # Custom React hooks
├── stores/                # Zustand state management stores
└── test/                  # Test utilities and setup
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Update environment variables in `.env.local`

### Development

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `DEFAULT_FUNIFIER_URL` | Default Funifier API URL | `https://service2.funifier.com` |
| `DEMO_MODE_ENABLED` | Enable demo mode | `true` |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data | Required |
| `REDIS_URL` | Redis connection URL (optional) | - |

## White-Label Theming

The platform uses CSS custom properties for dynamic theming:

```css
:root {
  --color-primary-500: #0ea5e9;
  --color-secondary-500: #64748b;
  --color-accent-500: #eab308;
}
```

These can be dynamically updated through the admin panel to customize the appearance for each white-label instance.

## Testing

The project uses Vitest for testing with the following setup:

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API and service layer testing
- **Test Utilities**: Mock implementations for Next.js and external dependencies

Run tests with:
```bash
npm run test
```

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is proprietary software. All rights reserved.