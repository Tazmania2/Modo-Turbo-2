import { 
  SecurityAnalysis, 
  SecurityIssue, 
  FileAnalysis, 
  AnalysisIssue,
  RiskLevel,
  ImprovementOpportunity,
  ImprovementCategory
} from '@/types/analysis.types';

export interface AuthenticationEnhancement {
  id: string;
  type: 'multi-factor' | 'session-management' | 'password-policy' | 'oauth-improvement' | 'token-security';
  description: string;
  currentImplementation: string;
  suggestedImprovement: string;
  securityBenefit: string;
  implementationComplexity: 'low' | 'medium' | 'high';
  riskLevel: RiskLevel;
  files: string[];
}

export interface InputValidationImprovement {
  id: string;
  type: 'sanitization' | 'validation' | 'encoding' | 'filtering' | 'rate-limiting';
  description: string;
  vulnerabilityType: 'xss' | 'sql-injection' | 'csrf' | 'path-traversal' | 'dos' | 'data-corruption';
  currentState: string;
  recommendedFix: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  files: string[];
  codeExamples: {
    vulnerable: string;
    secure: string;
  };
}

export interface AccessControlEnhancement {
  id: string;
  type: 'rbac' | 'permission-check' | 'resource-protection' | 'api-authorization' | 'route-protection';
  description: string;
  currentAccess: string;
  recommendedAccess: string;
  securityRisk: string;
  businessImpact: 'low' | 'medium' | 'high';
  files: string[];
  affectedEndpoints: string[];
}

export interface SecurityImprovementAnalysisResult {
  authenticationEnhancements: AuthenticationEnhancement[];
  inputValidationImprovements: InputValidationImprovement[];
  accessControlEnhancements: AccessControlEnhancement[];
  overallSecurityScore: number;
  criticalIssues: number;
  recommendations: ImprovementOpportunity[];
  summary: {
    totalIssuesFound: number;
    highPriorityIssues: number;
    estimatedFixTime: number;
    securityImprovementPotential: number;
  };
}

export class SecurityImprovementAnalyzerService {
  private authPatterns = {
    // Authentication patterns to detect
    weakPasswordValidation: /password\.length\s*[<>=]+\s*[1-7]/g,
    plainTextPasswords: /password\s*=\s*["'][^"']*["']/g,
    sessionWithoutExpiry: /session\s*=\s*{[^}]*}(?![^}]*expires?)/g,
    missingMFA: /login|authenticate|signin/gi,
    weakTokenGeneration: /Math\.random\(\)|Date\.now\(\)/g,
    insecureStorage: /localStorage\.setItem.*(?:token|password|secret)/g,
    missingCSRF: /<form[^>]*(?!.*csrf)/gi,
    weakCookieSettings: /res\.cookie\([^)]*\)(?![^)]*secure|httpOnly)/g
  };

  private validationPatterns = {
    // Input validation patterns
    directDOMInsertion: /innerHTML\s*=\s*[^;]*(?!DOMPurify|sanitize)/g,
    sqlInjectionRisk: /query\s*\(\s*["'`][^"'`]*\$\{[^}]*\}/g,
    pathTraversalRisk: /path\.join\([^)]*req\.[^)]*\)/g,
    missingInputValidation: /req\.(body|query|params)\.[a-zA-Z_$][a-zA-Z0-9_$]*(?![^;]*validate)/g,
    unsafeEval: /eval\s*\(/g,
    missingRateLimit: /app\.(get|post|put|delete)\s*\([^)]*\)(?![^{]*rateLimit)/g,
    weakRegexValidation: /^[^$]*\$(?![^$]*\^)/g,
    missingContentTypeValidation: /req\.body(?![^;]*content-type)/g
  };

  private accessControlPatterns = {
    // Access control patterns
    missingAuthMiddleware: /app\.(get|post|put|delete)\s*\([^)]*\)(?![^{]*auth|authenticate|requireAuth)/g,
    publicAdminRoutes: /\/admin\/[^"']*["'](?![^{]*auth|requireAdmin)/g,
    missingRoleCheck: /req\.user(?![^;]*role|permission)/g,
    directResourceAccess: /findById\([^)]*req\.(params|query)/g,
    missingOwnershipCheck: /(?:update|delete|modify).*findById(?![^;]*user|owner)/g,
    weakPermissionCheck: /req\.user\.role\s*===?\s*["']admin["']/g,
    exposedInternalAPI: /\/api\/internal\/[^"']*["'](?![^{]*private|internal)/g,
    missingCORS: /app\.use\((?!.*cors)/g
  };

  /**
   * Analyzes files for authentication enhancement opportunities
   */
  public analyzeAuthenticationEnhancements(files: FileAnalysis[]): AuthenticationEnhancement[] {
    const enhancements: AuthenticationEnhancement[] = [];

    for (const file of files) {
      if (this.isSecurityRelevantFile(file)) {
        const content = this.getFileContent(file.path);
        
        // Check for weak password validation
        const weakPasswordMatches = content.match(this.authPatterns.weakPasswordValidation);
        if (weakPasswordMatches) {
          enhancements.push({
            id: `auth-weak-password-${file.path}`,
            type: 'password-policy',
            description: 'Weak password validation detected',
            currentImplementation: 'Password validation allows weak passwords (less than 8 characters)',
            suggestedImprovement: 'Implement strong password policy with minimum 12 characters, mixed case, numbers, and special characters',
            securityBenefit: 'Reduces risk of brute force attacks and credential stuffing',
            implementationComplexity: 'low',
            riskLevel: 'medium',
            files: [file.path]
          });
        }

        // Check for plain text password storage
        const plainTextMatches = content.match(this.authPatterns.plainTextPasswords);
        if (plainTextMatches) {
          enhancements.push({
            id: `auth-plaintext-${file.path}`,
            type: 'password-policy',
            description: 'Plain text password storage detected',
            currentImplementation: 'Passwords stored in plain text',
            suggestedImprovement: 'Implement bcrypt or Argon2 password hashing with salt',
            securityBenefit: 'Prevents password exposure in case of data breach',
            implementationComplexity: 'medium',
            riskLevel: 'critical',
            files: [file.path]
          });
        }

        // Check for missing session expiry
        const sessionMatches = content.match(this.authPatterns.sessionWithoutExpiry);
        if (sessionMatches) {
          enhancements.push({
            id: `auth-session-expiry-${file.path}`,
            type: 'session-management',
            description: 'Sessions without expiry detected',
            currentImplementation: 'Sessions created without expiration time',
            suggestedImprovement: 'Implement session expiry with configurable timeout and refresh mechanism',
            securityBenefit: 'Reduces risk of session hijacking and unauthorized access',
            implementationComplexity: 'medium',
            riskLevel: 'high',
            files: [file.path]
          });
        }

        // Check for missing MFA implementation
        if (this.isAuthenticationFile(file) && !this.hasMFAImplementation(content)) {
          enhancements.push({
            id: `auth-mfa-${file.path}`,
            type: 'multi-factor',
            description: 'Multi-factor authentication not implemented',
            currentImplementation: 'Single factor authentication only',
            suggestedImprovement: 'Implement TOTP-based MFA with backup codes',
            securityBenefit: 'Significantly reduces risk of account compromise',
            implementationComplexity: 'high',
            riskLevel: 'medium',
            files: [file.path]
          });
        }

        // Check for weak token generation
        const weakTokenMatches = content.match(this.authPatterns.weakTokenGeneration);
        if (weakTokenMatches) {
          enhancements.push({
            id: `auth-weak-token-${file.path}`,
            type: 'token-security',
            description: 'Weak token generation detected',
            currentImplementation: 'Using Math.random() or Date.now() for token generation',
            suggestedImprovement: 'Use crypto.randomBytes() or crypto.randomUUID() for secure token generation',
            securityBenefit: 'Prevents token prediction and brute force attacks',
            implementationComplexity: 'low',
            riskLevel: 'high',
            files: [file.path]
          });
        }

        // Check for insecure storage
        const insecureStorageMatches = content.match(this.authPatterns.insecureStorage);
        if (insecureStorageMatches) {
          enhancements.push({
            id: `auth-insecure-storage-${file.path}`,
            type: 'token-security',
            description: 'Insecure token storage detected',
            currentImplementation: 'Storing sensitive data in localStorage',
            suggestedImprovement: 'Use httpOnly cookies or secure session storage',
            securityBenefit: 'Prevents XSS attacks from accessing sensitive tokens',
            implementationComplexity: 'medium',
            riskLevel: 'high',
            files: [file.path]
          });
        }
      }
    }

    return enhancements;
  }

  /**
   * Analyzes files for input validation improvements
   */
  public analyzeInputValidationImprovements(files: FileAnalysis[]): InputValidationImprovement[] {
    const improvements: InputValidationImprovement[] = [];

    for (const file of files) {
      if (this.isInputHandlingFile(file)) {
        const content = this.getFileContent(file.path);

        // Check for direct DOM insertion (XSS risk)
        const domInsertionMatches = content.match(this.validationPatterns.directDOMInsertion);
        if (domInsertionMatches) {
          improvements.push({
            id: `validation-xss-${file.path}`,
            type: 'sanitization',
            description: 'Direct DOM insertion without sanitization',
            vulnerabilityType: 'xss',
            currentState: 'Using innerHTML with unsanitized user input',
            recommendedFix: 'Use DOMPurify.sanitize() or textContent for safe DOM manipulation',
            severity: 'high',
            files: [file.path],
            codeExamples: {
              vulnerable: 'element.innerHTML = userInput;',
              secure: 'element.innerHTML = DOMPurify.sanitize(userInput);'
            }
          });
        }

        // Check for SQL injection risks
        const sqlInjectionMatches = content.match(this.validationPatterns.sqlInjectionRisk);
        if (sqlInjectionMatches) {
          improvements.push({
            id: `validation-sql-${file.path}`,
            type: 'validation',
            description: 'SQL injection vulnerability detected',
            vulnerabilityType: 'sql-injection',
            currentState: 'Using string interpolation in SQL queries',
            recommendedFix: 'Use parameterized queries or prepared statements',
            severity: 'critical',
            files: [file.path],
            codeExamples: {
              vulnerable: 'query(`SELECT * FROM users WHERE id = ${userId}`)',
              secure: 'query("SELECT * FROM users WHERE id = ?", [userId])'
            }
          });
        }

        // Check for path traversal risks
        const pathTraversalMatches = content.match(this.validationPatterns.pathTraversalRisk);
        if (pathTraversalMatches) {
          improvements.push({
            id: `validation-path-${file.path}`,
            type: 'validation',
            description: 'Path traversal vulnerability detected',
            vulnerabilityType: 'path-traversal',
            currentState: 'Using user input directly in file path operations',
            recommendedFix: 'Validate and sanitize file paths, use path.resolve() with whitelist',
            severity: 'high',
            files: [file.path],
            codeExamples: {
              vulnerable: 'path.join(baseDir, req.params.filename)',
              secure: 'path.resolve(baseDir, path.basename(req.params.filename))'
            }
          });
        }

        // Check for missing input validation
        const missingValidationMatches = content.match(this.validationPatterns.missingInputValidation);
        if (missingValidationMatches) {
          improvements.push({
            id: `validation-missing-${file.path}`,
            type: 'validation',
            description: 'Missing input validation detected',
            vulnerabilityType: 'data-corruption',
            currentState: 'Processing user input without validation',
            recommendedFix: 'Implement schema validation using Joi, Yup, or Zod',
            severity: 'medium',
            files: [file.path],
            codeExamples: {
              vulnerable: 'const { email } = req.body; // No validation',
              secure: 'const { email } = await schema.validate(req.body);'
            }
          });
        }

        // Check for unsafe eval usage
        const unsafeEvalMatches = content.match(this.validationPatterns.unsafeEval);
        if (unsafeEvalMatches) {
          improvements.push({
            id: `validation-eval-${file.path}`,
            type: 'sanitization',
            description: 'Unsafe eval() usage detected',
            vulnerabilityType: 'xss',
            currentState: 'Using eval() with potentially unsafe input',
            recommendedFix: 'Replace eval() with JSON.parse() or safe alternatives',
            severity: 'critical',
            files: [file.path],
            codeExamples: {
              vulnerable: 'eval(userInput)',
              secure: 'JSON.parse(userInput) // or use a safe parser'
            }
          });
        }

        // Check for missing rate limiting
        const rateLimitMatches = content.match(this.validationPatterns.missingRateLimit);
        if (rateLimitMatches) {
          improvements.push({
            id: `validation-rate-limit-${file.path}`,
            type: 'rate-limiting',
            description: 'Missing rate limiting on API endpoints',
            vulnerabilityType: 'dos',
            currentState: 'API endpoints without rate limiting',
            recommendedFix: 'Implement express-rate-limit or similar middleware',
            severity: 'medium',
            files: [file.path],
            codeExamples: {
              vulnerable: 'app.post("/api/login", loginHandler)',
              secure: 'app.post("/api/login", rateLimit({max: 5}), loginHandler)'
            }
          });
        }
      }
    }

    return improvements;
  }

  /**
   * Analyzes files for access control enhancements
   */
  public analyzeAccessControlEnhancements(files: FileAnalysis[]): AccessControlEnhancement[] {
    const enhancements: AccessControlEnhancement[] = [];

    for (const file of files) {
      if (this.isAccessControlRelevantFile(file)) {
        const content = this.getFileContent(file.path);

        // Check for missing authentication middleware
        const missingAuthMatches = content.match(this.accessControlPatterns.missingAuthMiddleware);
        if (missingAuthMatches) {
          enhancements.push({
            id: `access-missing-auth-${file.path}`,
            type: 'route-protection',
            description: 'API routes without authentication middleware',
            currentAccess: 'Public access to protected endpoints',
            recommendedAccess: 'Require authentication for sensitive operations',
            securityRisk: 'Unauthorized access to protected resources',
            businessImpact: 'high',
            files: [file.path],
            affectedEndpoints: this.extractEndpoints(content)
          });
        }

        // Check for public admin routes
        const publicAdminMatches = content.match(this.accessControlPatterns.publicAdminRoutes);
        if (publicAdminMatches) {
          enhancements.push({
            id: `access-public-admin-${file.path}`,
            type: 'route-protection',
            description: 'Admin routes accessible without proper authorization',
            currentAccess: 'Public access to admin functionality',
            recommendedAccess: 'Require admin role verification',
            securityRisk: 'Unauthorized administrative access',
            businessImpact: 'high',
            files: [file.path],
            affectedEndpoints: this.extractAdminEndpoints(content)
          });
        }

        // Check for missing role checks
        const missingRoleMatches = content.match(this.accessControlPatterns.missingRoleCheck);
        if (missingRoleMatches) {
          enhancements.push({
            id: `access-missing-role-${file.path}`,
            type: 'rbac',
            description: 'User object accessed without role verification',
            currentAccess: 'Role-based access not enforced',
            recommendedAccess: 'Implement proper role-based access control',
            securityRisk: 'Privilege escalation vulnerability',
            businessImpact: 'medium',
            files: [file.path],
            affectedEndpoints: []
          });
        }

        // Check for direct resource access
        const directAccessMatches = content.match(this.accessControlPatterns.directResourceAccess);
        if (directAccessMatches) {
          enhancements.push({
            id: `access-direct-resource-${file.path}`,
            type: 'resource-protection',
            description: 'Direct resource access without ownership verification',
            currentAccess: 'Any authenticated user can access any resource',
            recommendedAccess: 'Verify resource ownership before access',
            securityRisk: 'Unauthorized access to other users\' data',
            businessImpact: 'high',
            files: [file.path],
            affectedEndpoints: this.extractResourceEndpoints(content)
          });
        }

        // Check for missing ownership checks
        const missingOwnershipMatches = content.match(this.accessControlPatterns.missingOwnershipCheck);
        if (missingOwnershipMatches) {
          enhancements.push({
            id: `access-missing-ownership-${file.path}`,
            type: 'resource-protection',
            description: 'Resource modification without ownership verification',
            currentAccess: 'Users can modify resources they don\'t own',
            recommendedAccess: 'Verify ownership before allowing modifications',
            securityRisk: 'Data integrity and privacy violations',
            businessImpact: 'high',
            files: [file.path],
            affectedEndpoints: this.extractModificationEndpoints(content)
          });
        }

        // Check for weak permission checks
        const weakPermissionMatches = content.match(this.accessControlPatterns.weakPermissionCheck);
        if (weakPermissionMatches) {
          enhancements.push({
            id: `access-weak-permission-${file.path}`,
            type: 'permission-check',
            description: 'Weak permission checking implementation',
            currentAccess: 'Simple string comparison for role checking',
            recommendedAccess: 'Implement robust permission system with hierarchical roles',
            securityRisk: 'Easily bypassed authorization checks',
            businessImpact: 'medium',
            files: [file.path],
            affectedEndpoints: []
          });
        }

        // Check for exposed internal APIs
        const exposedInternalMatches = content.match(this.accessControlPatterns.exposedInternalAPI);
        if (exposedInternalMatches) {
          enhancements.push({
            id: `access-exposed-internal-${file.path}`,
            type: 'api-authorization',
            description: 'Internal API endpoints exposed publicly',
            currentAccess: 'Internal APIs accessible from external requests',
            recommendedAccess: 'Restrict internal APIs to internal network only',
            securityRisk: 'Exposure of sensitive internal functionality',
            businessImpact: 'medium',
            files: [file.path],
            affectedEndpoints: this.extractInternalEndpoints(content)
          });
        }
      }
    }

    return enhancements;
  }

  /**
   * Performs comprehensive security improvement analysis
   */
  public async analyzeSecurityImprovements(files: FileAnalysis[]): Promise<SecurityImprovementAnalysisResult> {
    const authenticationEnhancements = this.analyzeAuthenticationEnhancements(files);
    const inputValidationImprovements = this.analyzeInputValidationImprovements(files);
    const accessControlEnhancements = this.analyzeAccessControlEnhancements(files);

    const totalIssues = authenticationEnhancements.length + 
                       inputValidationImprovements.length + 
                       accessControlEnhancements.length;

    const criticalIssues = [
      ...authenticationEnhancements.filter(e => e.riskLevel === 'critical'),
      ...inputValidationImprovements.filter(i => i.severity === 'critical'),
      ...accessControlEnhancements.filter(e => e.businessImpact === 'high')
    ].length;

    const highPriorityIssues = [
      ...authenticationEnhancements.filter(e => e.riskLevel === 'high'),
      ...inputValidationImprovements.filter(i => i.severity === 'high'),
      ...accessControlEnhancements.filter(e => e.businessImpact === 'high')
    ].length;

    const overallSecurityScore = this.calculateSecurityScore(
      authenticationEnhancements,
      inputValidationImprovements,
      accessControlEnhancements
    );

    const recommendations = this.generateSecurityRecommendations(
      authenticationEnhancements,
      inputValidationImprovements,
      accessControlEnhancements
    );

    const estimatedFixTime = this.estimateFixTime(
      authenticationEnhancements,
      inputValidationImprovements,
      accessControlEnhancements
    );

    return {
      authenticationEnhancements,
      inputValidationImprovements,
      accessControlEnhancements,
      overallSecurityScore,
      criticalIssues,
      recommendations,
      summary: {
        totalIssuesFound: totalIssues,
        highPriorityIssues,
        estimatedFixTime,
        securityImprovementPotential: Math.max(0, 100 - overallSecurityScore)
      }
    };
  }

  // Helper methods
  private isSecurityRelevantFile(file: FileAnalysis): boolean {
    const securityKeywords = ['auth', 'login', 'password', 'token', 'session', 'security'];
    return securityKeywords.some(keyword => 
      file.path.toLowerCase().includes(keyword) ||
      file.type === 'api' ||
      file.type === 'middleware'
    );
  }

  private isAuthenticationFile(file: FileAnalysis): boolean {
    const authKeywords = ['auth', 'login', 'signin', 'signup', 'register'];
    return authKeywords.some(keyword => file.path.toLowerCase().includes(keyword));
  }

  private isInputHandlingFile(file: FileAnalysis): boolean {
    return file.type === 'api' || 
           file.type === 'service' || 
           file.path.includes('route') ||
           file.path.includes('handler') ||
           file.path.includes('controller');
  }

  private isAccessControlRelevantFile(file: FileAnalysis): boolean {
    return file.type === 'api' || 
           file.type === 'middleware' ||
           file.path.includes('auth') ||
           file.path.includes('permission') ||
           file.path.includes('role');
  }

  private hasMFAImplementation(content: string): boolean {
    const mfaKeywords = ['mfa', 'totp', 'authenticator', 'two-factor', '2fa'];
    return mfaKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  private getFileContent(filePath: string): string {
    // In a real implementation, this would read the actual file content
    // For now, return empty string as placeholder
    return '';
  }

  private extractEndpoints(content: string): string[] {
    const endpointRegex = /app\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;
    const endpoints: string[] = [];
    let match;
    
    while ((match = endpointRegex.exec(content)) !== null) {
      endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
    }
    
    return endpoints;
  }

  private extractAdminEndpoints(content: string): string[] {
    return this.extractEndpoints(content).filter(endpoint => 
      endpoint.toLowerCase().includes('admin')
    );
  }

  private extractResourceEndpoints(content: string): string[] {
    return this.extractEndpoints(content).filter(endpoint => 
      endpoint.includes('/:id') || endpoint.includes('/:')
    );
  }

  private extractModificationEndpoints(content: string): string[] {
    return this.extractEndpoints(content).filter(endpoint => 
      endpoint.startsWith('PUT') || 
      endpoint.startsWith('DELETE') || 
      endpoint.startsWith('PATCH')
    );
  }

  private extractInternalEndpoints(content: string): string[] {
    return this.extractEndpoints(content).filter(endpoint => 
      endpoint.toLowerCase().includes('internal')
    );
  }

  private calculateSecurityScore(
    authEnhancements: AuthenticationEnhancement[],
    validationImprovements: InputValidationImprovement[],
    accessEnhancements: AccessControlEnhancement[]
  ): number {
    const totalIssues = authEnhancements.length + validationImprovements.length + accessEnhancements.length;
    
    if (totalIssues === 0) return 100;

    const criticalWeight = 10;
    const highWeight = 5;
    const mediumWeight = 2;
    const lowWeight = 1;

    let totalWeight = 0;
    let issueWeight = 0;

    // Calculate authentication issues weight
    authEnhancements.forEach(enhancement => {
      const weight = enhancement.riskLevel === 'critical' ? criticalWeight :
                    enhancement.riskLevel === 'high' ? highWeight :
                    enhancement.riskLevel === 'medium' ? mediumWeight : lowWeight;
      issueWeight += weight;
      totalWeight += criticalWeight; // Max possible weight
    });

    // Calculate validation issues weight
    validationImprovements.forEach(improvement => {
      const weight = improvement.severity === 'critical' ? criticalWeight :
                    improvement.severity === 'high' ? highWeight :
                    improvement.severity === 'medium' ? mediumWeight : lowWeight;
      issueWeight += weight;
      totalWeight += criticalWeight; // Max possible weight
    });

    // Calculate access control issues weight
    accessEnhancements.forEach(enhancement => {
      const weight = enhancement.businessImpact === 'high' ? highWeight :
                    enhancement.businessImpact === 'medium' ? mediumWeight : lowWeight;
      issueWeight += weight;
      totalWeight += highWeight; // Max possible weight for access control
    });

    return Math.max(0, Math.round(100 - (issueWeight / totalWeight) * 100));
  }

  private generateSecurityRecommendations(
    authEnhancements: AuthenticationEnhancement[],
    validationImprovements: InputValidationImprovement[],
    accessEnhancements: AccessControlEnhancement[]
  ): ImprovementOpportunity[] {
    const recommendations: ImprovementOpportunity[] = [];

    // Generate recommendations based on most critical issues
    const criticalAuth = authEnhancements.filter(e => e.riskLevel === 'critical');
    const criticalValidation = validationImprovements.filter(i => i.severity === 'critical');
    const criticalAccess = accessEnhancements.filter(e => e.businessImpact === 'high');

    if (criticalAuth.length > 0) {
      recommendations.push({
        id: 'security-auth-critical',
        title: 'Fix Critical Authentication Vulnerabilities',
        description: `Address ${criticalAuth.length} critical authentication security issues`,
        category: 'security' as ImprovementCategory,
        priority: 'critical',
        effort: 'medium',
        impact: 'high',
        businessValue: 90,
        technicalValue: 85,
        riskLevel: 'critical',
        estimatedHours: criticalAuth.length * 4,
        dependencies: [],
        files: [...new Set(criticalAuth.flatMap(e => e.files))],
        implementation: {
          steps: criticalAuth.map((enhancement, index) => ({
            order: index + 1,
            title: enhancement.description,
            description: enhancement.suggestedImprovement,
            estimatedHours: 4,
            files: enhancement.files,
            dependencies: []
          })),
          prerequisites: ['Security review approval', 'Backup current authentication system'],
          risks: ['Temporary authentication disruption', 'User session invalidation'],
          testing: {
            unit: ['Authentication flow tests', 'Password validation tests'],
            integration: ['Login integration tests', 'Session management tests'],
            e2e: ['Complete authentication flow'],
            manual: ['Security penetration testing'],
            performance: ['Authentication performance impact']
          },
          rollback: 'Revert to previous authentication implementation'
        }
      });
    }

    if (criticalValidation.length > 0) {
      recommendations.push({
        id: 'security-validation-critical',
        title: 'Fix Critical Input Validation Vulnerabilities',
        description: `Address ${criticalValidation.length} critical input validation security issues`,
        category: 'security' as ImprovementCategory,
        priority: 'critical',
        effort: 'large',
        impact: 'high',
        businessValue: 95,
        technicalValue: 90,
        riskLevel: 'critical',
        estimatedHours: criticalValidation.length * 6,
        dependencies: [],
        files: [...new Set(criticalValidation.flatMap(i => i.files))],
        implementation: {
          steps: criticalValidation.map((improvement, index) => ({
            order: index + 1,
            title: improvement.description,
            description: improvement.recommendedFix,
            estimatedHours: 6,
            files: improvement.files,
            dependencies: []
          })),
          prerequisites: ['Input validation library selection', 'Security testing framework setup'],
          risks: ['API breaking changes', 'Performance impact from validation'],
          testing: {
            unit: ['Input validation tests', 'Sanitization tests'],
            integration: ['API endpoint validation tests'],
            e2e: ['Complete user input flow tests'],
            manual: ['Security vulnerability testing'],
            performance: ['Validation performance impact']
          },
          rollback: 'Disable new validation temporarily'
        }
      });
    }

    return recommendations;
  }

  private estimateFixTime(
    authEnhancements: AuthenticationEnhancement[],
    validationImprovements: InputValidationImprovement[],
    accessEnhancements: AccessControlEnhancement[]
  ): number {
    let totalHours = 0;

    // Authentication fixes
    authEnhancements.forEach(enhancement => {
      const hours = enhancement.implementationComplexity === 'high' ? 8 :
                   enhancement.implementationComplexity === 'medium' ? 4 : 2;
      totalHours += hours;
    });

    // Validation fixes
    validationImprovements.forEach(improvement => {
      const hours = improvement.severity === 'critical' ? 6 :
                   improvement.severity === 'high' ? 4 :
                   improvement.severity === 'medium' ? 2 : 1;
      totalHours += hours;
    });

    // Access control fixes
    accessEnhancements.forEach(enhancement => {
      const hours = enhancement.businessImpact === 'high' ? 6 :
                   enhancement.businessImpact === 'medium' ? 3 : 1;
      totalHours += hours;
    });

    return totalHours;
  }
}