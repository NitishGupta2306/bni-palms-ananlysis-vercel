# BNI Analytics Application - Architecture Documentation

## Purpose & Overview

This is a comprehensive Business Networking International (BNI) analytics platform designed to track and analyze chapter performance, member interactions, and business referrals. The application provides detailed insights into member networking activities through various matrices and dashboards.

## Architecture Principles

### 1. **Full-Stack Separation**
- **Frontend**: React with TypeScript for type safety and modern UI
- **Backend**: Django REST Framework for robust API development
- **Clear separation of concerns** between presentation and business logic

### 2. **Data-Driven Design**
The application centers around four core business metrics:
- **One-to-One Meetings**: Tracking member-to-member networking meetings
- **Referrals**: Managing business referral relationships between members
- **TYFCB (Thank You For Closed Business)**: Tracking actual business value generated
- **Member Performance**: Individual and chapter-level analytics

### 3. **Chapter-Centric Organization**
- All data is organized by chapters (business networking groups)
- Each chapter contains members who interact through various business activities
- Hierarchical structure: Chapters → Members → Interactions

## Technology Stack & Dependencies

### Backend Dependencies
- **Django 4.2.7**: Core web framework with environment-based configuration
- **Django REST Framework 3.14.0**: RESTful API with JWT authentication and pagination
- **PostgreSQL (psycopg2-binary 2.9.9)**: Production database (SQLite3 fallback for development)
- **Redis 5.0.1 + Celery 5.3.4**: Asynchronous task processing and caching layer
- **pandas 2.1.3 + openpyxl 3.1.2**: Excel file processing with security validation
- **drf-spectacular 0.26.5**: OpenAPI schema generation and API documentation
- **django-cors-headers 4.3.0**: Cross-origin resource sharing with credential support
- **djangorestframework-simplejwt 5.3.0**: JWT tokens with rotation and blacklisting
- **Pillow 10.1.0**: Image processing capabilities for file uploads
- **gunicorn 21.2.0 + whitenoise 6.6.0**: Production WSGI server with static file compression

### Frontend Dependencies
- **React 18.3.1**: Core UI framework with Concurrent Features
- **TypeScript 4.9.5**: Full type safety with strict configuration
- **Radix UI Components**: Accessible headless components (@radix-ui/react-*)
- **TailwindCSS 3.4.14**: Utility-first styling with custom design system
- **React Router DOM 7.9.1**: Client-side routing with lazy loading
- **Recharts 3.1.2**: D3-powered data visualization and charting
- **@tanstack/react-query 5.85.5**: Server state management with intelligent caching
- **react-dropzone 14.3.8**: Drag & drop file upload with validation
- **xlsx 0.18.5**: Client-side Excel processing with security controls
- **Lucide React 0.544.0**: Modern icon library
- **class-variance-authority**: Type-safe component variants

## Key Components & Relationships

### Backend Structure

#### Django Apps Architecture
The backend follows a modular Django app structure with clear separation of concerns:

1. **`core/`** - Central configuration and settings
   - Environment-based configuration with `.env` support
   - JWT authentication setup with token rotation
   - CORS configuration for frontend communication
   - Celery configuration for async processing

2. **`chapters/`** - Core business entities
   - Chapter and Member models with business logic
   - Management commands for data operations
   - Name normalization algorithms

3. **`analytics/`** - Business metrics and interactions
   - Referral, OneToOne, TYFCB tracking models
   - Complex validation logic for business rules
   - Audit trail functionality

4. **`api/`** - RESTful API layer
   - Comprehensive serializers with computed fields
   - Matrix generation algorithms
   - File upload processing with security

5. **`data_processing/`** - Excel import and batch operations
   - Pandas-based data transformation
   - Error handling and validation
   - Session tracking for imports

6. **`reports/`** - Monthly reporting and data export
   - JSON storage for processed matrices
   - Historical data management
   - Performance metrics calculation

#### Core Models (Django ORM)
1. **Chapter** (`chapters/models.py:5-17`):
   - Central entity with metadata ordering
   - Relationship: `members` (reverse FK with related_name)
   - Fields: name (unique), location, meeting_day, meeting_time

2. **Member** (`chapters/models.py:20-75`):
   - Complex name normalization logic in `normalize_name()` static method
   - Automatic `normalized_name` generation in `save()` override
   - Unique constraint: (`chapter`, `normalized_name`)
   - Property: `full_name` for display purposes
   - Optional User relationship for authentication

3. **MonthlyReport** (`chapters/models.py:77-105`):
   - JSON field storage for matrix data (referral_matrix_data, oto_matrix_data)
   - File fields for Excel uploads with custom upload paths
   - Unique constraint: (`chapter`, `month_year`)
   - Processed/unprocessed state tracking

4. **MemberMonthlyStats** (`chapters/models.py:107-175`):
   - Individual member performance metrics
   - JSON arrays for missing interaction lists
   - Complex calculation method: `calculate_missing_lists()`
   - Priority connections algorithm for relationship recommendations

5. **Referral** (`analytics/models.py:6-26`):
   - Bidirectional relationship tracking
   - Custom validation in `clean()` method
   - Unique constraint: (`giver`, `receiver`, `date_given`)
   - Week-based reporting with separate `week_of` field

6. **OneToOne** (`analytics/models.py:28-56`):
   - Symmetrical meeting representation
   - Duration tracking in minutes
   - Property: `other_member` for context-aware queries
   - Cross-chapter validation prevention

7. **TYFCB** (`analytics/models.py:58-86`):
   - External business tracking (null giver allowed)
   - Multi-currency support (default AED)
   - Within/outside chapter categorization
   - Decimal precision for financial amounts

8. **DataImportSession** (`analytics/models.py:88-109`):
   - Comprehensive audit trail
   - JSON error details storage
   - Success/failure metrics
   - User attribution for imports

#### API Serializer Architecture (`api/serializers.py`)
The API layer uses sophisticated serialization patterns:

1. **Computed Field Patterns**:
   - `MemberSerializer` includes calculated fields: referrals_given_count, one_to_ones_count
   - `ChapterSerializer` dynamically counts active members
   - Performance-optimized with SerializerMethodField usage

2. **Create/Update Separation**:
   - `MemberCreateSerializer` vs `MemberUpdateSerializer` for different operations
   - Automatic `normalized_name` handling in create/update lifecycle
   - Validation integration with model clean() methods

3. **Bulk Operations**:
   - `BulkMemberUploadSerializer` for Excel file validation
   - `FileProcessingResultSerializer` for upload response formatting
   - Comprehensive error collection and reporting

4. **Matrix Data Serialization**:
   - `MatrixDataSerializer` for flexible matrix formats
   - `MemberSummarySerializer` for analytics aggregations
   - `DataQualityReportSerializer` for import validation results

#### REST API Endpoints Pattern
Following Django REST Framework conventions with custom enhancements:
- `/api/dashboard/` - Chapter overview with performance metrics
- `/api/chapters/{id}/reports/` - Monthly report management
- `/api/chapters/{id}/reports/{report_id}/members/{member_id}/` - Individual analytics
- `/api/chapters/{id}/reports/{report_id}/{matrix-type}/` - Matrix data endpoints
- File upload endpoints with comprehensive validation and processing

### Frontend Structure

#### Application Architecture
The frontend follows a sophisticated component-based architecture with modern React patterns:

#### Component Hierarchy
```
App.tsx (Global Providers & Theme)
├── QueryClientProvider (@tanstack/react-query)
├── ErrorToastProvider (Global error handling)
├── Router (React Router v7)
└── AppContent (Main layout with header)
    └── ChapterRoutes.tsx (Route management with lazy loading)
        ├── ChapterDashboard.tsx (Chapter overview)
        ├── ChapterDetailPage.tsx (Lazy: Chapter analytics)
        ├── MemberDetails.tsx (Lazy: Member analytics)
        └── AdminDashboard.tsx (Lazy: Admin functions)
```

#### Advanced React Patterns Implemented

1. **Lazy Loading with Suspense** (`ChapterRoutes.tsx:6-8`):
   ```typescript
   const ChapterDetailPage = lazy(() => import('./ChapterDetailPage'));
   const MemberDetails = lazy(() => import('./MemberDetails'));
   const AdminDashboard = lazy(() => import('./AdminDashboard'));
   ```
   - Route-based code splitting for performance
   - Custom `LoadingFallback` component with spinner
   - Error boundary integration

2. **Compound Route Components** (`ChapterRoutes.tsx:125-178`):
   - `ChapterDetailRoute` and `MemberDetailsRoute` wrapper components
   - URL parameter extraction and validation
   - Props forwarding with navigation handlers
   - 404 handling for invalid routes

3. **State Management Strategy**:
   - **Local State**: React.useState for component-specific data
   - **Server State**: @tanstack/react-query for API data
   - **Props Drilling**: Centralized through route components
   - **Context**: ErrorToast for global error handling

#### Service Layer Architecture

1. **ChapterDataLoader.ts** (Comprehensive data service):
   - **Security-First Excel Processing**:
     - File validation with size/type limits
     - Sanitization against prototype pollution
     - XSS prevention in cell data
   - **API Abstraction Layer**:
     - Fallback mechanisms for API failures
     - Data transformation from backend to frontend interfaces
     - Mock data generation for development
   - **Type Safety**: Complete TypeScript interfaces for all data shapes

2. **Excel Security Layer** (`utils/excelSecurity.ts`):
   - `ExcelSecurityError` custom error class
   - Comprehensive validation: file size, MIME type, extensions
   - Content sanitization: dangerous property filtering, length limits
   - DoS prevention: row/column limits, processing timeouts

3. **React Query Configuration** (`lib/queryClient.ts`):
   - Intelligent retry logic with exponential backoff
   - Error classification and retry strategies
   - Cache optimization: 5min stale time, 10min cache time
   - Mutation error handling with retry limits

4. **Hook Architecture**:
   - `useNetworkStatus`: Network connectivity monitoring
   - `useApiError`: Centralized API error handling
   - `use-toast`: Toast notification system integration

#### UI Component System

1. **Design System**:
   - **Radix UI Primitives**: Accessible headless components
   - **TailwindCSS**: Utility-first styling with dark theme
   - **Class Variance Authority**: Type-safe component variants
   - **Lucide React**: Consistent icon system

2. **Component Patterns**:
   - Compound components for complex UI (Dialog, Tabs)
   - Render props pattern for flexible layouts
   - Error boundaries at multiple levels (global, route, component)
   - Loading states with skeleton components

## Design Patterns & Best Practices

### Backend Patterns
1. **Model-View-Serializer (MVS)**: Django REST Framework pattern
2. **Fat Models**: Business logic in model methods
3. **Validation at Model Level**: Using clean() methods
4. **Unique Constraints**: Preventing duplicate data
5. **Related Names**: Explicit reverse relationships

### Frontend Patterns
1. **Component Composition**: Reusable UI components
2. **Route-Based Code Splitting**: Lazy loading for performance
3. **Centralized State Management**: Through routing and props
4. **TypeScript Interfaces**: Type safety throughout
5. **Material-UI Theming**: Consistent dark theme design

### Data Flow
1. **Upload**: Excel files → Backend processing → Database storage
2. **Read**: Database → Django ORM → Serializers → JSON API → React components
3. **Analytics**: Raw data → Aggregation in backend → Matrix generation → Visualization

## Common Operations

### Data Import Flow
1. User uploads Excel file through FileUploadComponent
2. Backend parses Excel using pandas
3. Data validation and normalization
4. Creation of Member, Referral, OneToOne, and TYFCB records
5. Import session tracking for audit

### Matrix Generation
1. Query relevant interactions from database
2. Build member-to-member relationship matrices
3. Calculate aggregations and summaries
4. Return JSON structure for frontend visualization

### Report Management
1. Monthly reports stored with timestamps
2. Version control for historical data
3. Comparison capabilities between periods

## Development Workflow

### Local Development
- Frontend runs on port 3000 (Create React App dev server)
- Backend runs on port 8000 (Django dev server)
- Proxy configuration for API calls
- Hot reloading for both frontend and backend

### Docker Development
- Orchestrated multi-container setup
- PostgreSQL for data persistence
- Redis for caching and Celery tasks
- Service health checks and dependencies

## Important Considerations

### Data Integrity
- **Name normalization**: Consistent member identification
- **Chapter isolation**: Data segregated by chapter
- **Validation rules**: Preventing invalid relationships
- **Audit trails**: Tracking all data imports

### Performance Optimization
- **Database indexing** on frequently queried fields
- **Lazy loading** of frontend routes
- **Caching** with Redis for expensive operations
- **Pagination** for large datasets

### Security
- **CORS configuration** for API access control
- **JWT authentication** ready for implementation
- **Input validation** at multiple levels
- **SQL injection prevention** through ORM

## Advanced Security Architecture

### File Upload Security
The application implements multiple layers of security for Excel file processing:

1. **Client-Side Validation** (`utils/excelSecurity.ts`):
   - File size limits (10MB maximum)
   - MIME type validation with allowlist
   - Extension validation (.xls/.xlsx only)
   - Custom `ExcelSecurityError` class for security failures

2. **Content Sanitization**:
   - Prototype pollution prevention (filters `__proto__`, `constructor`)
   - XSS prevention in cell content
   - Length limits on string values (1000 chars max)
   - Dangerous character removal (control characters)

3. **DoS Protection**:
   - Maximum sheet count (10 sheets)
   - Row limits (10,000 rows max)
   - Column limits (100 columns max)
   - Member count limits (1,000 members max)
   - Processing timeouts and memory limits

### API Security
- **JWT Authentication**: Token rotation with blacklist support
- **CORS Configuration**: Credential-aware cross-origin policies
- **Input Validation**: Multi-level validation (serializer + model)
- **SQL Injection Prevention**: Django ORM protection
- **Rate Limiting**: Configurable via environment variables

## Testing Architecture

### Frontend Testing Strategy
The application uses comprehensive testing patterns:

1. **Test Organization** (`frontend/src/test-utils/`):
   - **MSW (Mock Service Worker)**: API mocking for tests
   - **Custom render utilities**: With providers and query client
   - **Mock data factories**: Consistent test data generation
   - **Integration test patterns**: End-to-end user flows

2. **Coverage Requirements** (`package.json:85-92`):
   - 80% minimum coverage across all metrics
   - Excludes test utilities and setup files
   - Comprehensive branch coverage requirements

3. **Test Categories**:
   - **Unit Tests**: Component behavior and utility functions
   - **Integration Tests**: API communication and data flow
   - **Accessibility Tests**: Using jest-axe for a11y compliance
   - **Security Tests**: Excel processing validation

### Quality Assurance
- **TypeScript Strict Mode**: Maximum type safety
- **ESLint Configuration**: React and accessibility rules
- **Automated Testing**: CI/CD pipeline integration
- **Performance Monitoring**: Network status and error tracking

## Architectural Decision Records (ADRs)

### 1. Name Normalization Strategy
**Decision**: Implement automatic name normalization in the Member model
**Rationale**: Excel imports often have inconsistent name formatting
**Implementation**: `Member.normalize_name()` static method with prefix/suffix removal
**Location**: `chapters/models.py:52-74`

### 2. Dual Database Strategy
**Decision**: PostgreSQL for production, SQLite3 for development
**Rationale**: Developer convenience while maintaining production fidelity
**Implementation**: Environment-based database configuration
**Location**: `core/settings.py:94-103`

### 3. JSON Field Usage for Matrix Data
**Decision**: Store processed matrices as JSON in PostgreSQL
**Rationale**: Flexible schema for analytics data, better query performance
**Implementation**: `MonthlyReport.referral_matrix_data` and similar fields
**Location**: `chapters/models.py:89-93`

### 4. Lazy Loading Strategy
**Decision**: Route-based code splitting with React.lazy()
**Rationale**: Performance optimization for large application
**Implementation**: Suspense boundaries with loading fallbacks
**Location**: `ChapterRoutes.tsx:6-8`

### 5. Security-First File Processing
**Decision**: Multiple validation layers for Excel uploads
**Rationale**: Prevent various attack vectors (XSS, prototype pollution, DoS)
**Implementation**: Custom validation classes and sanitization
**Location**: `utils/excelSecurity.ts`

## Non-Obvious Behaviors & Gotchas

### Backend Behaviors
1. **Member Name Normalization**: Automatic normalization removes prefixes (Mr., Dr.) and suffixes (Jr., Sr.)
2. **Week Tracking**: Separate `week_of` field allows period-based reporting independent of actual dates
3. **Bidirectional Queries**: OneToOne meetings stored once but accessible from both members
4. **TYFCB External Business**: Null giver allowed for business from outside the chapter
5. **Import Session Atomicity**: Database transactions ensure all-or-nothing imports
6. **Unique Constraints**: Chapter+normalized_name prevents duplicate members with similar names

### Frontend Behaviors
1. **React Query Caching**: 5-minute stale time means data may appear "old" briefly
2. **Lazy Route Loading**: First navigation to admin/member details shows loading spinner
3. **Error Boundary Levels**: Errors caught at global, route, and component levels
4. **API Fallback**: ChapterDataLoader falls back to static data if API fails
5. **Excel Processing**: Client-side processing happens in main thread (may block UI)
6. **Navigation State**: Chapter data is centralized and passed down through route props

### Development Gotchas
1. **Database Migrations**: Always run migrations in correct order (chapters before analytics)
2. **Environment Variables**: Missing .env variables cause silent fallbacks to defaults
3. **CORS Issues**: Development proxy at port 3000 requires backend on port 8000
4. **File Upload Limits**: Development vs production file size limits may differ
5. **JWT Token Lifecycle**: Token rotation requires client-side token refresh handling

## Future Considerations

- **Real-time updates**: WebSocket integration for live dashboards
- **Advanced analytics**: ML-based member recommendations
- **Mobile responsiveness**: Enhanced mobile experience
- **Bulk operations**: Batch editing capabilities
- **Export functionality**: Generate reports in various formats
- no mention of claude in git commits pleahise