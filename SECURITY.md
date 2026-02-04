# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly.

**Do NOT**:
- Create a public issue
- Discuss it publicly
- Exploit the vulnerability

**DO**:
- Send an email to security@pas7.studio
- Include details about the vulnerability
- Provide reproduction steps
- Suggest a fix (if possible)

We will:
- Acknowledge receipt within 48 hours
- Investigate the issue promptly
- Coordinate with you on disclosure timing
- Credit you for the discovery

## Supported Versions

Currently supported versions:
- Version 0.1.0 and later

## Security Best Practices

This package is designed with security in mind:
- No `rejectUnauthorized: false` approaches
- Errors are not silently swallowed
- Proper body size limits to prevent DoS attacks
- Strict type checking
- Minimal dependencies
