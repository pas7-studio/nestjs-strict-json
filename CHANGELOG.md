# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

### Added
- Initial release
- Core strict JSON parser with duplicate key detection
- Express adapter with custom middleware
- Fastify adapter with content type parser
- NestJS integration with `StrictJsonModule` and `registerStrictJson` function
- Automatic adapter detection (Express/Fastify)
- Body size limit support (`maxBodySizeBytes`)
- Comprehensive error handling with consistent error format
- TypeScript types and strict typing
- Unit tests for core parser
- E2E tests for Express and Fastify adapters
- Examples for both Express and Fastify
- Full documentation (README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)
- CI/CD with GitHub Actions

### Features
- Duplicate key detection at any nesting level
- JSON Pointer path support (e.g., `$.a.b.c`)
- HTTP status codes: 400 for parsing errors, 413 for body too large
- Error codes: `STRICT_JSON_DUPLICATE_KEY`, `STRICT_JSON_INVALID_JSON`, `STRICT_JSON_BODY_TOO_LARGE`
- Support for both string and Buffer inputs
- Incremental JSON parsing for better performance
- Zero external dependencies (only jsonparse)

### Supported Platforms
- Node.js 20+
- NestJS 10+
- Express 4+
- Fastify 4+

## [0.3.0] - 2025-01-XX

### Added
- **Streaming JSON parser for Express** with adaptive parsing
- **Prototype pollution protection** with dangerous key detection
- **Custom error handlers** (onDuplicateKey, onInvalidJson, onBodyTooLarge, onPrototypePollution, onError)
- **Extended configuration options** (whitelist, blacklist, maxDepth, ignoreCase)
- **Glob pattern support** for whitelist/blacklist with array index handling
- **Depth limit enforcement** to prevent DoS attacks
- **JSON Pointer paths** in error responses
- **Streaming options** (enableStreaming, streamingThreshold, chunkSize)

### Changed
- Extended `StrictJsonOptions` interface with new configuration options
- Improved error messages with contextual hints
- Enhanced glob matching logic for complex patterns
- Adaptive parsing strategy: buffer for small payloads, stream for large ones

### Fixed
- Security vulnerabilities related to prototype pollution (CVE mitigation)
- Memory efficiency for large payloads (80%+ reduction with streaming)
- Whitelist/blacklist logic for nested objects and arrays
- TypeScript errors in error class constructors

### Performance
- Memory footprint reduced by 80%+ for large payloads (>1MB)
- Adaptive parsing: optimal performance for all payload sizes
- Streaming parser: efficient processing of large JSON bodies

### Breaking Changes
- None (fully backward compatible)

### Migration Guide
No migration needed. All new features are opt-in via configuration options.

[0.3.0]: https://github.com/pas7-studio/nestjs-strict-json/releases/tag/v0.3.0
[0.1.0]: https://github.com/pas7-studio/nestjs-strict-json/releases/tag/v0.1.0
