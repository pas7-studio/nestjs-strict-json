# Contributing to @pas7/nestjs-strict-json

Thank you for considering contributing to this project!

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm package manager

### Installation

```bash
pnpm install
```

### Development

```bash
# Run linter
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build
pnpm build
```

### Running Examples

```bash
# Express example
npx tsx examples/express-main.ts

# Fastify example
npx tsx examples/fastify-main.ts
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Coding Standards

- Follow the existing code style
- Use strict TypeScript (no `any`)
- Write tests for new features
- Ensure all checks pass before submitting PR

## Questions?

Feel free to open an issue for any questions!
