import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ComponentStructure {
  name: string;
  filePath: string;
  type: 'functional' | 'class' | 'unknown';
  props: PropDefinition[];
  hooks: HookUsage[];
  imports: ImportStatement[];
  exports: ExportStatement[];
  complexity: ComponentComplexity;
  patterns: ComponentPattern[];
}

export interface ServiceStructure {
  name: string;
  filePath: string;
  type: 'class' | 'function' | 'object';
  methods: MethodDefinition[];
  dependencies: string[];
  exports: ExportStatement[];
  patterns: ServicePattern[];
  complexity: ServiceComplexity;
}

export interface UtilityStructure {
  name: string;
  filePath: string;
  functions: FunctionDefinition[];
  constants: ConstantDefinition[];
  types: TypeDefinition[];
  exports: ExportStatement[];
  reusabilityScore: number;
  complexity: UtilityComplexity;
}

export interface PropDefinition {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface HookUsage {
  name: string;
  type: 'built-in' | 'custom';
  usage: string;
}

export interface ImportStatement {
  module: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ExportStatement {
  name: string;
  type: 'default' | 'named';
  isFunction: boolean;
  isClass: boolean;
  isInterface: boolean;
  isType: boolean;
}

export interface MethodDefinition {
  name: string;
  parameters: ParameterDefinition[];
  returnType: string;
  isAsync: boolean;
  isStatic: boolean;
  visibility: 'public' | 'private' | 'protected';
  complexity: number;
}

export interface FunctionDefinition {
  name: string;
  parameters: ParameterDefinition[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  complexity: number;
  purity: 'pure' | 'impure' | 'unknown';
}

export interface ParameterDefinition {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ConstantDefinition {
  name: string;
  type: string;
  value?: string;
  isExported: boolean;
}

export interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  properties: PropertyDefinition[];
  isExported: boolean;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  optional: boolean;
}

export interface ComponentComplexity {
  cyclomaticComplexity: number;
  linesOfCode: number;
  numberOfProps: number;
  numberOfHooks: number;
  nestingDepth: number;
  score: 'low' | 'medium' | 'high';
}

export interface ServiceComplexity {
  cyclomaticComplexity: number;
  linesOfCode: number;
  numberOfMethods: number;
  numberOfDependencies: number;
  score: 'low' | 'medium' | 'high';
}

export interface UtilityComplexity {
  cyclomaticComplexity: number;
  linesOfCode: number;
  numberOfFunctions: number;
  averageFunctionComplexity: number;
  score: 'low' | 'medium' | 'high';
}

export interface ComponentPattern {
  name: string;
  description: string;
  confidence: number;
}

export interface ServicePattern {
  name: string;
  description: string;
  confidence: number;
}

export interface ASTAnalysisResult {
  components: ComponentStructure[];
  services: ServiceStructure[];
  utilities: UtilityStructure[];
  summary: {
    totalFiles: number;
    totalComponents: number;
    totalServices: number;
    totalUtilities: number;
    averageComplexity: number;
    patterns: string[];
    improvements: string[];
  };
}

export class ASTParserService {
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;

  /**
   * Analyze TypeScript/JavaScript code structure in a directory
   */
  async analyzeCodeStructure(directoryPath: string): Promise<ASTAnalysisResult> {
    try {
      console.log(`Starting AST analysis for directory: ${directoryPath}`);

      // Find all TypeScript/JavaScript files
      const files = await this.findSourceFiles(directoryPath);
      
      if (files.length === 0) {
        return this.createEmptyResult();
      }

      // Create TypeScript program
      this.createProgram(files);

      const components: ComponentStructure[] = [];
      const services: ServiceStructure[] = [];
      const utilities: UtilityStructure[] = [];

      // Analyze each file
      for (const filePath of files) {
        try {
          const analysis = await this.analyzeFile(filePath);
          
          if (analysis.component) {
            components.push(analysis.component);
          }
          if (analysis.service) {
            services.push(analysis.service);
          }
          if (analysis.utility) {
            utilities.push(analysis.utility);
          }
        } catch (error) {
          console.warn(`Failed to analyze file ${filePath}:`, error);
        }
      }

      // Generate summary
      const summary = this.generateSummary(components, services, utilities, files.length);

      console.log(`AST analysis completed. Found ${components.length} components, ${services.length} services, ${utilities.length} utilities`);

      return {
        components,
        services,
        utilities,
        summary
      };
    } catch (error) {
      throw new Error(`AST analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze a specific file
   */
  async analyzeFile(filePath: string): Promise<{
    component?: ComponentStructure;
    service?: ServiceStructure;
    utility?: UtilityStructure;
  }> {
    if (!this.program || !this.typeChecker) {
      throw new Error('TypeScript program not initialized');
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Source file not found: ${filePath}`);
    }

    const result: {
      component?: ComponentStructure;
      service?: ServiceStructure;
      utility?: UtilityStructure;
    } = {};

    // Determine file type and analyze accordingly
    const fileType = this.determineFileType(filePath, sourceFile);

    switch (fileType) {
      case 'component':
        result.component = await this.analyzeComponent(filePath, sourceFile);
        break;
      case 'service':
        result.service = await this.analyzeService(filePath, sourceFile);
        break;
      case 'utility':
        result.utility = await this.analyzeUtility(filePath, sourceFile);
        break;
    }

    return result;
  }

  /**
   * Find all TypeScript/JavaScript source files in directory
   */
  private async findSourceFiles(directoryPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common ignore patterns
            if (this.shouldIgnoreDirectory(entry.name)) {
              continue;
            }
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            if (this.isSourceFile(entry.name)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
      }
    };

    await scanDirectory(directoryPath);
    return files;
  }

  /**
   * Create TypeScript program for analysis
   */
  private createProgram(files: string[]): void {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: false,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      resolveJsonModule: true
    };

    this.program = ts.createProgram(files, compilerOptions);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * Determine file type based on path and content
   */
  private determineFileType(filePath: string, sourceFile: ts.SourceFile): 'component' | 'service' | 'utility' {
    // Check file path patterns
    if (filePath.includes('component') || filePath.endsWith('.tsx')) {
      return 'component';
    }
    if (filePath.includes('service') || filePath.includes('/api/')) {
      return 'service';
    }

    // Check content patterns
    const sourceText = sourceFile.getFullText();
    
    // Look for React patterns
    if (sourceText.includes('React') || sourceText.includes('jsx') || sourceText.includes('tsx')) {
      return 'component';
    }
    
    // Look for service patterns
    if (sourceText.includes('class') && sourceText.includes('Service')) {
      return 'service';
    }
    
    return 'utility';
  }

  /**
   * Analyze React component structure
   */
  private async analyzeComponent(filePath: string, sourceFile: ts.SourceFile): Promise<ComponentStructure> {
    const componentName = this.extractComponentName(filePath, sourceFile);
    const componentType = this.determineComponentType(sourceFile);
    const props = this.extractProps(sourceFile);
    const hooks = this.extractHooks(sourceFile);
    const imports = this.extractImports(sourceFile);
    const exports = this.extractExports(sourceFile);
    const complexity = this.calculateComponentComplexity(sourceFile, props, hooks);
    const patterns = this.identifyComponentPatterns(sourceFile);

    return {
      name: componentName,
      filePath,
      type: componentType,
      props,
      hooks,
      imports,
      exports,
      complexity,
      patterns
    };
  }

  /**
   * Analyze service structure
   */
  private async analyzeService(filePath: string, sourceFile: ts.SourceFile): Promise<ServiceStructure> {
    const serviceName = this.extractServiceName(filePath, sourceFile);
    const serviceType = this.determineServiceType(sourceFile);
    const methods = this.extractMethods(sourceFile);
    const dependencies = this.extractDependencies(sourceFile);
    const exports = this.extractExports(sourceFile);
    const patterns = this.identifyServicePatterns(sourceFile);
    const complexity = this.calculateServiceComplexity(sourceFile, methods, dependencies);

    return {
      name: serviceName,
      filePath,
      type: serviceType,
      methods,
      dependencies,
      exports,
      patterns,
      complexity
    };
  }

  /**
   * Analyze utility structure
   */
  private async analyzeUtility(filePath: string, sourceFile: ts.SourceFile): Promise<UtilityStructure> {
    const utilityName = this.extractUtilityName(filePath, sourceFile);
    const functions = this.extractFunctions(sourceFile);
    const constants = this.extractConstants(sourceFile);
    const types = this.extractTypes(sourceFile);
    const exports = this.extractExports(sourceFile);
    const reusabilityScore = this.calculateReusabilityScore(functions, constants, types);
    const complexity = this.calculateUtilityComplexity(sourceFile, functions);

    return {
      name: utilityName,
      filePath,
      functions,
      constants,
      types,
      exports,
      reusabilityScore,
      complexity
    };
  }

  /**
   * Extract component name from file
   */
  private extractComponentName(filePath: string, sourceFile: ts.SourceFile): string {
    // Try to find component name from exports
    const exports = this.extractExports(sourceFile);
    const componentExport = exports.find(exp => exp.type === 'default' || exp.isFunction);
    
    if (componentExport) {
      return componentExport.name;
    }

    // Fallback to filename
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Determine component type (functional vs class)
   */
  private determineComponentType(sourceFile: ts.SourceFile): 'functional' | 'class' | 'unknown' {
    let hasFunctionalComponent = false;
    let hasClassComponent = false;

    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        // Check if it returns JSX
        const returnType = this.typeChecker?.getTypeAtLocation(node);
        if (returnType && this.isJSXType(returnType)) {
          hasFunctionalComponent = true;
        }
      } else if (ts.isClassDeclaration(node)) {
        // Check if it extends React.Component
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            for (const type of clause.types) {
              const typeText = type.expression.getText();
              if (typeText.includes('Component') || typeText.includes('PureComponent')) {
                hasClassComponent = true;
              }
            }
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (hasClassComponent) return 'class';
    if (hasFunctionalComponent) return 'functional';
    return 'unknown';
  }

  /**
   * Extract props from component
   */
  private extractProps(sourceFile: ts.SourceFile): PropDefinition[] {
    const props: PropDefinition[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isInterfaceDeclaration(node) && node.name.text.includes('Props')) {
        for (const member of node.members) {
          if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
            props.push({
              name: member.name.text,
              type: member.type ? member.type.getText() : 'any',
              optional: !!member.questionToken,
              defaultValue: undefined // Could be extracted from default parameters
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return props;
  }

  /**
   * Extract React hooks usage
   */
  private extractHooks(sourceFile: ts.SourceFile): HookUsage[] {
    const hooks: HookUsage[] = [];
    const builtInHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'];

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const hookName = node.expression.text;
        if (hookName.startsWith('use')) {
          hooks.push({
            name: hookName,
            type: builtInHooks.includes(hookName) ? 'built-in' : 'custom',
            usage: node.getText()
          });
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return hooks;
  }

  /**
   * Extract import statements
   */
  private extractImports(sourceFile: ts.SourceFile): ImportStatement[] {
    const imports: ImportStatement[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const module = statement.moduleSpecifier.text;
        const importClause = statement.importClause;
        
        if (importClause) {
          const importNames: string[] = [];
          let isDefault = false;
          let isNamespace = false;

          if (importClause.name) {
            importNames.push(importClause.name.text);
            isDefault = true;
          }

          if (importClause.namedBindings) {
            if (ts.isNamespaceImport(importClause.namedBindings)) {
              importNames.push(importClause.namedBindings.name.text);
              isNamespace = true;
            } else if (ts.isNamedImports(importClause.namedBindings)) {
              for (const element of importClause.namedBindings.elements) {
                importNames.push(element.name.text);
              }
            }
          }

          imports.push({
            module,
            imports: importNames,
            isDefault,
            isNamespace
          });
        }
      }
    }

    return imports;
  }

  /**
   * Extract export statements
   */
  private extractExports(sourceFile: ts.SourceFile): ExportStatement[] {
    const exports: ExportStatement[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isExportDeclaration(statement)) {
        // Handle export { ... } statements
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            exports.push({
              name: element.name.text,
              type: 'named',
              isFunction: false,
              isClass: false,
              isInterface: false,
              isType: false
            });
          }
        }
      } else if (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        // Handle export function, export class, etc.
        const modifiers = ts.getModifiers(statement) || [];
        const isDefault = modifiers.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword);
        
        if (ts.isFunctionDeclaration(statement) && statement.name) {
          exports.push({
            name: statement.name.text,
            type: isDefault ? 'default' : 'named',
            isFunction: true,
            isClass: false,
            isInterface: false,
            isType: false
          });
        } else if (ts.isClassDeclaration(statement) && statement.name) {
          exports.push({
            name: statement.name.text,
            type: isDefault ? 'default' : 'named',
            isFunction: false,
            isClass: true,
            isInterface: false,
            isType: false
          });
        } else if (ts.isInterfaceDeclaration(statement)) {
          exports.push({
            name: statement.name.text,
            type: 'named',
            isFunction: false,
            isClass: false,
            isInterface: true,
            isType: false
          });
        } else if (ts.isTypeAliasDeclaration(statement)) {
          exports.push({
            name: statement.name.text,
            type: 'named',
            isFunction: false,
            isClass: false,
            isInterface: false,
            isType: true
          });
        }
      }
    }

    return exports;
  }

  /**
   * Calculate component complexity
   */
  private calculateComponentComplexity(
    sourceFile: ts.SourceFile,
    props: PropDefinition[],
    hooks: HookUsage[]
  ): ComponentComplexity {
    const linesOfCode = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(sourceFile);
    const nestingDepth = this.calculateNestingDepth(sourceFile);

    const complexityScore = this.calculateComplexityScore(
      cyclomaticComplexity,
      linesOfCode,
      props.length + hooks.length,
      nestingDepth
    );

    return {
      cyclomaticComplexity,
      linesOfCode,
      numberOfProps: props.length,
      numberOfHooks: hooks.length,
      nestingDepth,
      score: complexityScore
    };
  }

  /**
   * Identify component patterns
   */
  private identifyComponentPatterns(sourceFile: ts.SourceFile): ComponentPattern[] {
    const patterns: ComponentPattern[] = [];
    const sourceText = sourceFile.getFullText();

    // Higher-Order Component pattern
    if (sourceText.includes('withRouter') || sourceText.includes('connect') || /with[A-Z]/.test(sourceText)) {
      patterns.push({
        name: 'Higher-Order Component',
        description: 'Uses HOC pattern for component enhancement',
        confidence: 0.8
      });
    }

    // Render Props pattern
    if (sourceText.includes('render=') || sourceText.includes('children=') && sourceText.includes('function')) {
      patterns.push({
        name: 'Render Props',
        description: 'Uses render props pattern for component composition',
        confidence: 0.7
      });
    }

    // Custom Hooks pattern
    if (sourceText.includes('use') && /function use[A-Z]/.test(sourceText)) {
      patterns.push({
        name: 'Custom Hooks',
        description: 'Implements custom hooks for logic reuse',
        confidence: 0.9
      });
    }

    // Context pattern
    if (sourceText.includes('createContext') || sourceText.includes('useContext')) {
      patterns.push({
        name: 'Context API',
        description: 'Uses React Context for state management',
        confidence: 0.8
      });
    }

    return patterns;
  }

  /**
   * Extract service name
   */
  private extractServiceName(filePath: string, sourceFile: ts.SourceFile): string {
    // Try to find service class name
    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement) && statement.name && statement.name.text.includes('Service')) {
        return statement.name.text;
      }
    }

    // Fallback to filename
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Determine service type
   */
  private determineServiceType(sourceFile: ts.SourceFile): 'class' | 'function' | 'object' {
    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement)) {
        return 'class';
      }
    }

    const sourceText = sourceFile.getFullText();
    if (sourceText.includes('export const') && sourceText.includes('{')) {
      return 'object';
    }

    return 'function';
  }

  /**
   * Extract methods from service
   */
  private extractMethods(sourceFile: ts.SourceFile): MethodDefinition[] {
    const methods: MethodDefinition[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const parameters = node.parameters.map(param => ({
          name: param.name.getText(),
          type: param.type ? param.type.getText() : 'any',
          optional: !!param.questionToken,
          defaultValue: param.initializer ? param.initializer.getText() : undefined
        }));

        methods.push({
          name: node.name.text,
          parameters,
          returnType: node.type ? node.type.getText() : 'any',
          isAsync: !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)),
          isStatic: !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)),
          visibility: this.getVisibility(ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined),
          complexity: this.calculateCyclomaticComplexity(node)
        });
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return methods;
  }

  /**
   * Extract dependencies from service
   */
  private extractDependencies(sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];
    const imports = this.extractImports(sourceFile);

    // Add imported modules as dependencies
    for (const importStmt of imports) {
      if (!importStmt.module.startsWith('.')) {
        dependencies.push(importStmt.module);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Identify service patterns
   */
  private identifyServicePatterns(sourceFile: ts.SourceFile): ServicePattern[] {
    const patterns: ServicePattern[] = [];
    const sourceText = sourceFile.getFullText();

    // Singleton pattern
    if (sourceText.includes('getInstance') || sourceText.includes('instance')) {
      patterns.push({
        name: 'Singleton',
        description: 'Implements singleton pattern for single instance',
        confidence: 0.8
      });
    }

    // Repository pattern
    if (sourceText.includes('Repository') || sourceText.includes('findBy') || sourceText.includes('save')) {
      patterns.push({
        name: 'Repository',
        description: 'Implements repository pattern for data access',
        confidence: 0.9
      });
    }

    // Factory pattern
    if (sourceText.includes('create') && sourceText.includes('Factory')) {
      patterns.push({
        name: 'Factory',
        description: 'Implements factory pattern for object creation',
        confidence: 0.8
      });
    }

    return patterns;
  }

  /**
   * Calculate service complexity
   */
  private calculateServiceComplexity(
    sourceFile: ts.SourceFile,
    methods: MethodDefinition[],
    dependencies: string[]
  ): ServiceComplexity {
    const linesOfCode = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(sourceFile);

    const complexityScore = this.calculateComplexityScore(
      cyclomaticComplexity,
      linesOfCode,
      methods.length + dependencies.length,
      0
    );

    return {
      cyclomaticComplexity,
      linesOfCode,
      numberOfMethods: methods.length,
      numberOfDependencies: dependencies.length,
      score: complexityScore
    };
  }

  /**
   * Extract utility name
   */
  private extractUtilityName(filePath: string, sourceFile: ts.SourceFile): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Extract functions from utility
   */
  private extractFunctions(sourceFile: ts.SourceFile): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const parameters = node.parameters.map(param => ({
          name: param.name.getText(),
          type: param.type ? param.type.getText() : 'any',
          optional: !!param.questionToken,
          defaultValue: param.initializer ? param.initializer.getText() : undefined
        }));

        const isExported = !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));

        functions.push({
          name: node.name.text,
          parameters,
          returnType: node.type ? node.type.getText() : 'any',
          isAsync: !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)),
          isExported,
          complexity: this.calculateCyclomaticComplexity(node),
          purity: this.determineFunctionPurity(node)
        });
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return functions;
  }

  /**
   * Extract constants from utility
   */
  private extractConstants(sourceFile: ts.SourceFile): ConstantDefinition[] {
    const constants: ConstantDefinition[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isVariableStatement(statement)) {
        const isExported = !!(ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
        
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            constants.push({
              name: declaration.name.text,
              type: declaration.type ? declaration.type.getText() : 'any',
              value: declaration.initializer ? declaration.initializer.getText() : undefined,
              isExported
            });
          }
        }
      }
    }

    return constants;
  }

  /**
   * Extract types from utility
   */
  private extractTypes(sourceFile: ts.SourceFile): TypeDefinition[] {
    const types: TypeDefinition[] = [];

    for (const statement of sourceFile.statements) {
      const isExported = !!(ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));

      if (ts.isInterfaceDeclaration(statement)) {
        const properties = statement.members.map(member => {
          if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
            return {
              name: member.name.text,
              type: member.type ? member.type.getText() : 'any',
              optional: !!member.questionToken
            };
          }
          return null;
        }).filter(Boolean) as PropertyDefinition[];

        types.push({
          name: statement.name.text,
          kind: 'interface',
          properties,
          isExported
        });
      } else if (ts.isTypeAliasDeclaration(statement)) {
        types.push({
          name: statement.name.text,
          kind: 'type',
          properties: [], // Type aliases don't have properties in the same way
          isExported
        });
      } else if (ts.isEnumDeclaration(statement)) {
        types.push({
          name: statement.name.text,
          kind: 'enum',
          properties: [], // Enums have members, not properties
          isExported
        });
      } else if (ts.isClassDeclaration(statement) && statement.name) {
        types.push({
          name: statement.name.text,
          kind: 'class',
          properties: [], // Could extract class properties if needed
          isExported
        });
      }
    }

    return types;
  }

  /**
   * Calculate reusability score for utility
   */
  private calculateReusabilityScore(
    functions: FunctionDefinition[],
    constants: ConstantDefinition[],
    types: TypeDefinition[]
  ): number {
    let score = 0;

    // Pure functions are more reusable
    const pureFunctions = functions.filter(f => f.purity === 'pure').length;
    score += pureFunctions * 10;

    // Exported items are more reusable
    const exportedFunctions = functions.filter(f => f.isExported).length;
    const exportedConstants = constants.filter(c => c.isExported).length;
    const exportedTypes = types.filter(t => t.isExported).length;
    score += (exportedFunctions + exportedConstants + exportedTypes) * 5;

    // Simple functions are more reusable
    const simpleFunctions = functions.filter(f => f.complexity < 5).length;
    score += simpleFunctions * 3;

    return Math.min(100, score);
  }

  /**
   * Calculate utility complexity
   */
  private calculateUtilityComplexity(
    sourceFile: ts.SourceFile,
    functions: FunctionDefinition[]
  ): UtilityComplexity {
    const linesOfCode = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(sourceFile);
    const averageFunctionComplexity = functions.length > 0 
      ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length 
      : 0;

    const complexityScore = this.calculateComplexityScore(
      cyclomaticComplexity,
      linesOfCode,
      functions.length,
      averageFunctionComplexity
    );

    return {
      cyclomaticComplexity,
      linesOfCode,
      numberOfFunctions: functions.length,
      averageFunctionComplexity,
      score: complexityScore
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node): void => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression:
          const binaryExpr = n as ts.BinaryExpression;
          if (binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
              binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
            complexity++;
          }
          break;
      }
      
      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  /**
   * Calculate nesting depth
   */
  private calculateNestingDepth(node: ts.Node): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const visit = (n: ts.Node): void => {
      const isNestingNode = ts.isBlock(n) || ts.isIfStatement(n) || ts.isWhileStatement(n) || 
                           ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n) ||
                           ts.isDoStatement(n) || ts.isTryStatement(n) || ts.isCatchClause(n);

      if (isNestingNode) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      ts.forEachChild(n, visit);

      if (isNestingNode) {
        currentDepth--;
      }
    };

    visit(node);
    return maxDepth;
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexityScore(
    cyclomaticComplexity: number,
    linesOfCode: number,
    additionalFactors: number,
    nestingOrAverage: number
  ): 'low' | 'medium' | 'high' {
    const score = cyclomaticComplexity + (linesOfCode / 10) + additionalFactors + nestingOrAverage;

    if (score < 10) return 'low';
    if (score < 25) return 'medium';
    return 'high';
  }

  /**
   * Get visibility from modifiers
   */
  private getVisibility(modifiers?: ts.NodeArray<ts.Modifier> | readonly ts.Modifier[]): 'public' | 'private' | 'protected' {
    if (!modifiers) return 'public';

    for (const modifier of modifiers) {
      if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
      if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
    }

    return 'public';
  }

  /**
   * Determine function purity
   */
  private determineFunctionPurity(node: ts.FunctionDeclaration): 'pure' | 'impure' | 'unknown' {
    // Simple heuristic: if function has no side effects (no console.log, no mutations, etc.)
    const sourceText = node.getText();
    
    if (sourceText.includes('console.') || 
        sourceText.includes('document.') || 
        sourceText.includes('window.') ||
        sourceText.includes('localStorage') ||
        sourceText.includes('sessionStorage') ||
        sourceText.includes('fetch') ||
        sourceText.includes('axios')) {
      return 'impure';
    }

    // If function only performs calculations and returns values, likely pure
    if (!sourceText.includes('=') || sourceText.match(/return\s+[^;]+;?\s*$/)) {
      return 'pure';
    }

    return 'unknown';
  }

  /**
   * Check if type is JSX
   */
  private isJSXType(type: ts.Type): boolean {
    return type.symbol?.name === 'Element' || 
           type.getSymbol()?.name === 'ReactElement' ||
           type.getSymbol()?.name === 'JSX';
  }

  /**
   * Check if directory should be ignored
   */
  private shouldIgnoreDirectory(name: string): boolean {
    const ignorePatterns = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      '.vscode',
      '.idea'
    ];

    return ignorePatterns.includes(name);
  }

  /**
   * Check if file is a source file
   */
  private isSourceFile(filename: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filename) && 
           !filename.includes('.test.') && 
           !filename.includes('.spec.') &&
           !filename.includes('.d.ts');
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(
    components: ComponentStructure[],
    services: ServiceStructure[],
    utilities: UtilityStructure[],
    totalFiles: number
  ): ASTAnalysisResult['summary'] {
    const allComplexities = [
      ...components.map(c => c.complexity.cyclomaticComplexity),
      ...services.map(s => s.complexity.cyclomaticComplexity),
      ...utilities.map(u => u.complexity.cyclomaticComplexity)
    ];

    const averageComplexity = allComplexities.length > 0 
      ? allComplexities.reduce((sum, c) => sum + c, 0) / allComplexities.length 
      : 0;

    const patterns = [
      ...new Set([
        ...components.flatMap(c => c.patterns.map(p => p.name)),
        ...services.flatMap(s => s.patterns.map(p => p.name))
      ])
    ];

    const improvements: string[] = [];

    // Identify potential improvements
    const highComplexityComponents = components.filter(c => c.complexity.score === 'high');
    if (highComplexityComponents.length > 0) {
      improvements.push(`${highComplexityComponents.length} components have high complexity and could be refactored`);
    }

    const reusableUtilities = utilities.filter(u => u.reusabilityScore > 70);
    if (reusableUtilities.length > 0) {
      improvements.push(`${reusableUtilities.length} utilities have high reusability scores`);
    }

    const modernPatterns = patterns.filter(p => ['Custom Hooks', 'Context API'].includes(p));
    if (modernPatterns.length > 0) {
      improvements.push(`Uses modern React patterns: ${modernPatterns.join(', ')}`);
    }

    return {
      totalFiles,
      totalComponents: components.length,
      totalServices: services.length,
      totalUtilities: utilities.length,
      averageComplexity,
      patterns,
      improvements
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(): ASTAnalysisResult {
    return {
      components: [],
      services: [],
      utilities: [],
      summary: {
        totalFiles: 0,
        totalComponents: 0,
        totalServices: 0,
        totalUtilities: 0,
        averageComplexity: 0,
        patterns: [],
        improvements: []
      }
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.program = null;
    this.typeChecker = null;
  }
}