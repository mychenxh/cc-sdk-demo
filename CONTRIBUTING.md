# Contributing to Claude Code SDK for TypeScript

First off, thank you for considering contributing to the Claude Code SDK for TypeScript! 🎉

## Code of Conduct

By participating in this project, you are expected to uphold our code of conduct: be respectful, inclusive, and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible using our bug report template.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please use our feature request template and provide:
- A clear and descriptive title
- A detailed description of the proposed enhancement
- Examples of how it would be used
- Any potential drawbacks or considerations

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes: `npm test`
5. Make sure your code lints: `npm run lint`
6. Make sure TypeScript is happy: `npm run typecheck`
7. Use conventional commits for your commit messages

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/claude-code-sdk-ts.git
cd claude-code-sdk-ts

# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run the development build
npm run dev
```

## Project Structure

```
src/
├── index.ts           # Main entry point
├── fluent/            # Fluent API implementation
├── types/             # TypeScript type definitions
├── errors/            # Error classes and handling
├── _internal/         # Internal implementation details
└── examples/          # Example usage files
```

## Testing

- Write tests for any new functionality
- Place tests in the `tests/` directory
- Follow existing test patterns
- Aim for high code coverage
- Run `npm run test:coverage` to check coverage

## Coding Standards

### TypeScript
- Use TypeScript strict mode
- Provide comprehensive type definitions
- Avoid using `any` type
- Document complex types with JSDoc comments

### Code Style
- We use ESLint and Prettier for code formatting
- Run `npm run format` to auto-format your code
- Follow existing code patterns and conventions

### Commit Messages
We use conventional commits. Format: `type(scope): description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Changes to build process or auxiliary tools

Example: `feat(fluent): add retry strategy support`

## Releasing

Releases are handled by maintainers. We follow semantic versioning:
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes

Beta releases use the format: `x.y.z-beta.n`

## Questions?

Feel free to open an issue with the question label or reach out on our Discord community.

Thank you for contributing! 🙏