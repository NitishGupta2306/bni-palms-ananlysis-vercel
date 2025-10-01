# BNI Analytics Application

Business Networking International (BNI) analytics platform for tracking chapter performance, member interactions, and business referrals.

## Features

- 📊 Chapter performance tracking and analytics
- 👥 Member management with individual scorecards
- 🤝 One-to-one meeting tracking
- 🔄 Referral matrix and relationship visualization
- 💰 TYFCB (Thank You For Closed Business) monitoring
- 📁 Secure Excel file import with validation
- 📈 Real-time dashboards and reporting

## Tech Stack

**Frontend:** React 18, TypeScript, TailwindCSS, Radix UI, React Query
**Backend:** Django 4.2, Django REST Framework, PostgreSQL, Celery
**Deployment:** Vercel

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (production)

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at http://localhost:3000

## Development

### Running Tests

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build
```

## Deployment

This application is configured for Vercel deployment:

- **Main branch** → Development/testing environment
- **Production branch** → Production environment

See [.github/SETUP.md](.github/SETUP.md) for detailed deployment configuration.

## Project Structure

```
├── backend/          # Django REST API
│   ├── analytics/    # Analytics models & logic
│   ├── chapters/     # Chapter management
│   ├── members/      # Member management
│   ├── reports/      # Report generation
│   └── config/       # Django settings
├── frontend/         # React application
│   ├── src/
│   │   ├── features/ # Feature modules
│   │   ├── shared/   # Shared components & utilities
│   │   └── app/      # App configuration
└── .github/          # CI/CD workflows

```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## License

This project is proprietary and confidential.
