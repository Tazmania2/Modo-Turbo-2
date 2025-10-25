# Requirements Document

## Introduction

The application is experiencing a critical redirect loop on the admin login page at `/admin/login?redirect=%2Fadmin%2Flogin`. This prevents administrators from accessing the login page and subsequently the admin panel. The issue stems from incorrect route matching logic in the middleware that treats `/admin/login` as a protected route requiring authentication, even though it's explicitly listed as a public route.

## Glossary

- **Middleware**: Next.js middleware that runs before page requests to handle authentication and routing
- **Protected Route**: A route that requires authentication to access
- **Public Route**: A route that can be accessed without authentication
- **Route Matching**: The logic that determines if a URL path matches a route pattern
- **Redirect Loop**: A condition where a page continuously redirects to itself or another page that redirects back

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to access the admin login page without encountering redirect loops, so that I can authenticate and access the admin panel.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to `/admin/login`, THE Middleware SHALL allow access without redirecting to the login page
2. WHEN an unauthenticated user navigates to `/admin` (not `/admin/login`), THE Middleware SHALL redirect to `/admin/login` with the original path preserved in the redirect parameter
3. WHEN the route matching logic evaluates `/admin/login`, THE Middleware SHALL prioritize the public route match over the protected route pattern match
4. WHEN an authenticated user navigates to `/admin/login`, THE Middleware SHALL allow access to the login page without restriction

### Requirement 2

**User Story:** As a developer, I want the route matching logic to correctly distinguish between specific public routes and protected route patterns, so that public sub-routes under protected paths are accessible.

#### Acceptance Criteria

1. WHEN the route matching function evaluates a path, THE Middleware SHALL check for exact public route matches before checking protected route pattern matches
2. WHEN a path matches both a public route and a protected route pattern, THE Middleware SHALL treat it as a public route
3. WHEN the middleware processes `/admin/login`, THE Route Matching Logic SHALL return true for public routes and false for protected routes
4. WHEN the middleware processes `/admin/settings`, THE Route Matching Logic SHALL return false for public routes and true for protected routes

### Requirement 3

**User Story:** As a user, I want the authentication flow to preserve my intended destination when I'm redirected to login, so that I can continue to my original destination after authentication.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access a protected route, THE Middleware SHALL redirect to the login page with the original path in the redirect parameter
2. WHEN the redirect parameter contains `/admin/login`, THE Middleware SHALL not create a redirect loop
3. WHEN a user successfully authenticates, THE LoginForm SHALL redirect to the path specified in the redirect parameter
4. WHEN the redirect parameter is `/admin/login`, THE LoginForm SHALL redirect to `/admin` instead to prevent loops
