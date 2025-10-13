import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GitDiffResult {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
  changes: GitDiffChange[];
}

export interface GitDiffChange {
  lineNumber: number;
  type: 'addition' | 'deletion' | 'context';
  content: string;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitBranchComparison {
  ahead: number;
  behind: number;
  commits: GitCommitInfo[];
}

export class GitDiffAnalyzerService {
  /**
   * Compare two repositories using git diff
   */
  async compareRepositories(
    baseRepoPath: string,
    targetRepoPath: string,
    baseBranch = 'main',
    targetBranch = 'main'
  ): Promise<GitDiffResult[]> {
    try {
      // Create a temporary git repository for comparison
      const tempRepoPath = await this.createComparisonRepo(baseRepoPath, targetRepoPath);
      
      // Perform git diff between the two states
      const diffResults = await this.performGitDiff(tempRepoPath, 'base', 'target');
      
      // Clean up temporary repository
      await this.cleanupTempRepo(tempRepoPath);
      
      return diffResults;
    } catch (error) {
      throw new Error(`Failed to compare repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed diff for a specific file
   */
  async getFileDiff(
    repoPath: string,
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ): Promise<GitDiffResult> {
    try {
      const commitRange = fromCommit && toCommit ? `${fromCommit}..${toCommit}` : '';
      const command = `git diff ${commitRange} --numstat --no-color "${filePath}"`;
      
      const { stdout: numstat } = await execAsync(command, { cwd: repoPath });
      const [insertions, deletions] = numstat.trim().split('\t').map(n => parseInt(n) || 0);

      const diffCommand = `git diff ${commitRange} --no-color "${filePath}"`;
      const { stdout: diffOutput } = await execAsync(diffCommand, { cwd: repoPath });
      
      const changes = this.parseDiffOutput(diffOutput);
      
      return {
        file: filePath,
        status: this.determineFileStatus(changes),
        insertions,
        deletions,
        changes
      };
    } catch (error) {
      throw new Error(`Failed to get file diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get commit history between two points
   */
  async getCommitHistory(
    repoPath: string,
    fromCommit?: string,
    toCommit?: string,
    maxCount = 50
  ): Promise<GitCommitInfo[]> {
    try {
      const range = fromCommit && toCommit ? `${fromCommit}..${toCommit}` : '';
      const command = `git log ${range} --max-count=${maxCount} --pretty=format:"%H|%an|%ad|%s" --date=iso`;
      
      const { stdout } = await execAsync(command, { cwd: repoPath });
      
      return stdout.trim().split('\n').map(line => {
        const [hash, author, date, message] = line.split('|');
        return { hash, author, date, message };
      });
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare branches and get ahead/behind information
   */
  async compareBranches(
    repoPath: string,
    baseBranch: string,
    targetBranch: string
  ): Promise<GitBranchComparison> {
    try {
      // Get ahead/behind count
      const countCommand = `git rev-list --left-right --count ${baseBranch}...${targetBranch}`;
      const { stdout: countOutput } = await execAsync(countCommand, { cwd: repoPath });
      const [behind, ahead] = countOutput.trim().split('\t').map(n => parseInt(n));

      // Get commits that are ahead
      const commitsCommand = `git log ${baseBranch}..${targetBranch} --pretty=format:"%H|%an|%ad|%s" --date=iso`;
      const { stdout: commitsOutput } = await execAsync(commitsCommand, { cwd: repoPath });
      
      const commits = commitsOutput.trim() ? commitsOutput.trim().split('\n').map(line => {
        const [hash, author, date, message] = line.split('|');
        return { hash, author, date, message };
      }) : [];

      return { ahead, behind, commits };
    } catch (error) {
      throw new Error(`Failed to compare branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of changed files between commits or branches
   */
  async getChangedFiles(
    repoPath: string,
    fromRef: string,
    toRef: string
  ): Promise<{ file: string; status: string }[]> {
    try {
      const command = `git diff --name-status ${fromRef}..${toRef}`;
      const { stdout } = await execAsync(command, { cwd: repoPath });
      
      return stdout.trim().split('\n').map(line => {
        const [status, file] = line.split('\t');
        return { file, status: this.mapGitStatus(status) };
      });
    } catch (error) {
      throw new Error(`Failed to get changed files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file content at specific commit
   */
  async getFileAtCommit(
    repoPath: string,
    filePath: string,
    commitHash: string
  ): Promise<string> {
    try {
      const command = `git show ${commitHash}:"${filePath}"`;
      const { stdout } = await execAsync(command, { cwd: repoPath });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get file at commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if repository is clean (no uncommitted changes)
   */
  async isRepositoryClean(repoPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      return stdout.trim().length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest commit hash
   */
  async getLatestCommitHash(repoPath: string, branch?: string): Promise<string> {
    try {
      const ref = branch ? `origin/${branch}` : 'HEAD';
      const { stdout } = await execAsync(`git rev-parse ${ref}`, { cwd: repoPath });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get latest commit hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a temporary repository for comparison
   */
  private async createComparisonRepo(baseRepoPath: string, targetRepoPath: string): Promise<string> {
    const tempPath = path.join(process.cwd(), '.temp', 'git-comparison', Date.now().toString());
    
    try {
      // Initialize new git repository
      await execAsync(`mkdir -p "${tempPath}"`);
      await execAsync('git init', { cwd: tempPath });
      
      // Add base repository as remote and fetch
      await execAsync(`git remote add base "${baseRepoPath}"`, { cwd: tempPath });
      await execAsync('git fetch base', { cwd: tempPath });
      
      // Add target repository as remote and fetch
      await execAsync(`git remote add target "${targetRepoPath}"`, { cwd: tempPath });
      await execAsync('git fetch target', { cwd: tempPath });
      
      // Create branches for comparison
      await execAsync('git checkout -b base base/main || git checkout -b base base/master', { cwd: tempPath });
      await execAsync('git checkout -b target target/main || git checkout -b target target/master', { cwd: tempPath });
      
      return tempPath;
    } catch (error) {
      // Clean up on error
      await this.cleanupTempRepo(tempPath);
      throw error;
    }
  }

  /**
   * Perform git diff in the comparison repository
   */
  private async performGitDiff(repoPath: string, baseBranch: string, targetBranch: string): Promise<GitDiffResult[]> {
    try {
      // Get list of changed files
      const changedFiles = await this.getChangedFiles(repoPath, baseBranch, targetBranch);
      
      const results: GitDiffResult[] = [];
      
      for (const { file, status } of changedFiles) {
        try {
          const fileDiff = await this.getFileDiff(repoPath, file, baseBranch, targetBranch);
          results.push({
            ...fileDiff,
            status: status as any
          });
        } catch (error) {
          console.warn(`Failed to get diff for file ${file}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to perform git diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse git diff output into structured changes
   */
  private parseDiffOutput(diffOutput: string): GitDiffChange[] {
    const changes: GitDiffChange[] = [];
    const lines = diffOutput.split('\n');
    
    let currentLineNumber = 0;
    
    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse hunk header to get line number
        const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentLineNumber = parseInt(match[1]);
        }
        continue;
      }
      
      if (line.startsWith('+') && !line.startsWith('+++')) {
        changes.push({
          lineNumber: currentLineNumber,
          type: 'addition',
          content: line.substring(1)
        });
        currentLineNumber++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        changes.push({
          lineNumber: currentLineNumber,
          type: 'deletion',
          content: line.substring(1)
        });
      } else if (line.startsWith(' ')) {
        changes.push({
          lineNumber: currentLineNumber,
          type: 'context',
          content: line.substring(1)
        });
        currentLineNumber++;
      }
    }
    
    return changes;
  }

  /**
   * Determine file status based on changes
   */
  private determineFileStatus(changes: GitDiffChange[]): 'added' | 'modified' | 'deleted' | 'renamed' {
    const hasAdditions = changes.some(c => c.type === 'addition');
    const hasDeletions = changes.some(c => c.type === 'deletion');
    
    if (hasAdditions && !hasDeletions) return 'added';
    if (!hasAdditions && hasDeletions) return 'deleted';
    if (hasAdditions && hasDeletions) return 'modified';
    
    return 'modified';
  }

  /**
   * Map git status codes to readable status
   */
  private mapGitStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'A': 'added',
      'M': 'modified',
      'D': 'deleted',
      'R': 'renamed',
      'C': 'copied',
      'U': 'unmerged',
      'T': 'type-changed'
    };
    
    return statusMap[status] || 'unknown';
  }

  /**
   * Clean up temporary repository
   */
  private async cleanupTempRepo(tempPath: string): Promise<void> {
    try {
      await execAsync(`rm -rf "${tempPath}"`);
    } catch (error) {
      console.warn(`Failed to cleanup temp repository at ${tempPath}:`, error);
    }
  }

  /**
   * Validate git repository
   */
  async validateRepository(repoPath: string): Promise<boolean> {
    try {
      await execAsync('git status', { cwd: repoPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(repoPath: string): Promise<{
    branch: string;
    commitHash: string;
    isClean: boolean;
    remotes: string[];
  }> {
    try {
      const branch = await this.getCurrentBranch(repoPath);
      const commitHash = await this.getLatestCommitHash(repoPath);
      const isClean = await this.isRepositoryClean(repoPath);
      
      const { stdout: remotesOutput } = await execAsync('git remote -v', { cwd: repoPath });
      const remotes = remotesOutput.trim().split('\n').map(line => line.split('\t')[0]).filter((v, i, a) => a.indexOf(v) === i);
      
      return { branch, commitHash, isClean, remotes };
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}