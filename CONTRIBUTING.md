# Contributing to Peaceful Investment Platform

Thank you for your interest in contributing to the Peaceful Investment Platform! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm (recommended)
- Git
- A Supabase account for backend development
- Basic knowledge of React, TypeScript, and modern web development

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/peaceful-investment-platform.git
   cd peaceful-investment-platform
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   # Configure your environment variables
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

## 📋 Development Guidelines

### Code Style

- **TypeScript First**: All new code must be properly typed
- **ESLint**: Follow the established linting rules
- **Prettier**: Code formatting is enforced
- **Conventional Commits**: Use conventional commit messages

### Component Guidelines

- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow the established component structure
- Use Tailwind CSS for styling
- Implement proper error boundaries

### File Organization

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── admin/          # Admin-specific components
│   └── [feature]/      # Feature-specific components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── services/           # API and external services
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Quality Checks**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm format:check
   ```

4. **Test Your Changes**
   - Test in multiple browsers
   - Verify responsive design
   - Check accessibility compliance

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No hardcoded values
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - OS and version
   - Browser and version
   - Node.js version

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior

3. **Additional Context**
   - Screenshots or videos
   - Console errors
   - Network tab information

## ✨ Feature Requests

For feature requests, please:

1. **Check Existing Issues** - Avoid duplicates
2. **Provide Context** - Explain the problem it solves
3. **Describe the Solution** - How should it work?
4. **Consider Alternatives** - Have you considered other approaches?

## 🏗️ Architecture Decisions

### State Management
- Use TanStack Query for server state
- React Context for global client state
- Local state with useState/useReducer for component state

### Styling
- Tailwind CSS for utility-first styling
- CSS custom properties for theming
- shadcn/ui for consistent component library

### Error Handling
- Implement proper error boundaries
- Use toast notifications for user feedback
- Log errors for debugging

## 📚 Documentation

### Code Documentation
- Use JSDoc for function documentation
- Include TypeScript interfaces for all props
- Document complex business logic

### README Updates
- Update feature lists when adding new functionality
- Keep installation instructions current
- Document new environment variables

## 🔒 Security

### Security Guidelines
- Never commit sensitive data
- Use environment variables for configuration
- Implement proper input validation
- Follow OWASP security guidelines

### Reporting Security Issues
- Email security@peacefulinvestment.com
- Do not create public issues for security vulnerabilities
- Include steps to reproduce and potential impact

## 🧪 Testing

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API calls
- E2E tests for critical user flows

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:unit         # Run unit tests
pnpm test:integration  # Run integration tests
pnpm test:e2e          # Run E2E tests
```

## 📝 Commit Guidelines

### Conventional Commits
```
type(scope): description

feat(auth): add two-factor authentication
fix(dashboard): resolve chart rendering issue
docs(readme): update installation instructions
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## 🏷️ Release Process

### Versioning
- Follow Semantic Versioning (SemVer)
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Checklist
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Create release notes

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow professional communication standards

### Getting Help
- Check existing documentation
- Search closed issues
- Ask questions in discussions
- Join our community channels

## 📞 Contact

- **Maintainers**: @peaceful-investment-team
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: dev@peacefulinvestment.com

Thank you for contributing to the Peaceful Investment Platform! 🎉
