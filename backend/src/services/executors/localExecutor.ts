import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class LocalExecutor {
  async executeCommand(command: string, timeout: number = 300000): Promise<ExecutionResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
      };
    } catch (error: any) {
      // If command exits with non-zero code
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }
}

export default LocalExecutor;
