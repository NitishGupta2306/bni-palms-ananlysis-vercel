# Contributing to BNI Analytics

Thanks for contributing! Here's how to get started.

## Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone git@github.com:NitishGupta2306/bni-palms-ananlysis-vercel.git
   cd bni-palms-ananlysis-vercel
   ```

2. **Set up your development environment**

   **Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Branching Strategy

- `production` - Production environment (protected)
- `staging` - Staging environment (protected)
- `main` - Integration branch (protected)
- `develop` - Active development
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency production fixes

## Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Backend
   cd backend
   pytest

   # Frontend
   cd frontend
   npm test
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

   Use conventional commit format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Adding/updating tests
   - `refactor:` - Code refactoring
   - `chore:` - Maintenance tasks

5. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub.

## Code Standards

### Backend (Python/Django)
- Follow PEP 8 style guide
- Use Black for formatting
- Write docstrings for functions/classes
- Add type hints where possible

### Frontend (React/TypeScript)
- Use TypeScript strict mode
- Follow ESLint rules
- Write unit tests with React Testing Library
- Maintain 80% test coverage minimum

## Testing Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Coverage must be ≥80% for both backend and frontend
- All tests must pass before merging

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Fill out the PR template completely
4. Request review from maintainers
5. Address review feedback
6. Wait for CI/CD checks to pass
7. Maintainer will merge when approved

## Questions?

Open an issue or reach out to the maintainers.
