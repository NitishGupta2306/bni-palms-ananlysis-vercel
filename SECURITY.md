# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them privately using one of these methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](https://github.com/NitishGupta2306/bni-palms-ananlysis-vercel/security/advisories/new)
   - Click "Report a vulnerability"
   - Provide detailed information

2. **Email**
   - Contact the repository owner directly
   - Include detailed description and steps to reproduce

## What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if you have one)

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity

## Supported Versions

We release security updates for the following:

| Version | Supported          |
| ------- | ------------------ |
| production branch | ✅ Yes |
| staging branch    | ✅ Yes |
| main branch       | ✅ Yes |
| older branches    | ❌ No  |

## Security Measures

This project implements:

- Automated security scanning (CodeQL, Dependabot)
- Dependency vulnerability monitoring
- Secret scanning
- Input validation and sanitization
- Excel file security validation
- CORS configuration
- Environment-based configuration

## Disclosure Policy

- Security issues will be disclosed after a fix is available
- Credit will be given to reporters (if desired)
- CVE will be requested for critical vulnerabilities
