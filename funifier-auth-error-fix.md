# Funifier Authentication Error Fix

## Problem
Getting error: "Need to inform a type of authentication. E.g. Basic, Studio or Bearer" when trying to authenticate with Funifier API.

## Root Cause Analysis
This error occurs when:
1. **Wrong Endpoint**: Calling a protected resource instead of `/v3/auth/token`
2. **Authorization Headers**: Accidentally sending Authorization headers to the auth endpoint
3. **Invalid API Key**: Using an incorrect or malformed API key
4. **Wrong Request Format**: Not using the correct body format or headers

## Solution Implementation

### 1. Correct Authentication Flow
```
Step 1: POST /v3/auth/token (NO Authorization header)
  ├── Body: URL-encoded with apiKey, grant_type, username, password
  ├── Headers: Content-Type: application/x-www-form-urlencoded
  └── Response: access_token + token_type: "Bearer"

Step 2: Use Bearer token for all other API calls
  ├── Header: Authorization: Bearer {access_token}
  └── All protected endpoints require this header
```

### 2. Key Fixes Applied

#### A. Endpoint Validation
- Ensure we're calling `/v3/auth/token` exactly
- Validate URL format before making request

#### B. Header Validation
- **CRITICAL**: Never send Authorization header to `/v3/auth/token`
- Only send Content-Type and Accept headers
- Added explicit check to prevent accidental auth headers

#### C. Request Format
- Use URL-encoded body format: `application/x-www-form-urlencoded`
- Include all required fields: apiKey, grant_type, username, password

#### D. Enhanced Debugging
- Log all request details (with masked credentials)
- Detailed error responses with diagnostic information
- Specific error detection for auth type errors

### 3. Testing Steps

#### Manual Test
1. Use the test script: `node test-funifier-auth-direct.js`
2. Update with your actual credentials
3. Verify the request format matches Funifier docs

#### Integration Test
1. Complete setup with valid Funifier credentials
2. Try logging in through `/admin/login`
3. Check browser network tab for request details
4. Verify no Authorization headers in auth request

### 4. Common Issues to Check

#### API Key Issues
- Ensure API key is correctly configured in setup
- Verify API key has sufficient permissions
- Check API key format (should be substantial length)

#### Endpoint Issues
- Confirm server URL is correct (e.g., https://service2.funifier.com)
- Ensure `/v3/auth/token` path is appended correctly
- No trailing slashes or extra path segments

#### Request Format Issues
- Body must be URL-encoded, not JSON
- Content-Type header must match body format
- All required fields must be present

#### Network Issues
- Check if Funifier server is accessible
- Verify no proxy/firewall blocking requests
- Confirm SSL/TLS certificates are valid

### 5. Debugging Checklist

When authentication fails, check:

- [ ] Request URL ends with `/v3/auth/token`
- [ ] No Authorization header in request
- [ ] Content-Type is `application/x-www-form-urlencoded`
- [ ] Body contains: apiKey, grant_type, username, password
- [ ] API key is valid and not empty
- [ ] Server URL is accessible
- [ ] Username/password are correct

### 6. Error Message Meanings

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| "Need to inform a type of authentication" | Wrong endpoint or auth header sent | Check endpoint URL and remove auth headers |
| "Invalid API key" | API key is wrong or malformed | Verify API key in setup |
| "Invalid credentials" | Username/password incorrect | Check user credentials |
| "Unauthorized" | API key lacks permissions | Check API key permissions in Funifier |

### 7. Implementation Files Modified

- `src/app/api/auth/login/route.ts` - Main authentication logic
- Added comprehensive error handling and debugging
- Added validation checks for common issues
- Enhanced logging for troubleshooting

### 8. Next Steps

1. Test the authentication with valid credentials
2. If still failing, run the direct test script to isolate the issue
3. Check Funifier server logs if available
4. Verify API key permissions in Funifier admin panel

## Important Notes

- **Never** send Authorization headers to `/v3/auth/token`
- The auth endpoint is the only one that doesn't require auth headers
- All other Funifier endpoints require `Authorization: Bearer {token}`
- Token expires, so handle refresh logic appropriately