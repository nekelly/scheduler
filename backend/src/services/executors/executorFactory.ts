import SSHExecutor from './sshExecutor';
import LocalExecutor from './localExecutor';

export type ExecutionMode = 'local' | 'ssh';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface Executor {
  executeCommand(command: string, timeout?: number): Promise<ExecutionResult>;
}

export class ExecutorFactory {
  static createExecutor(): Executor {
    const mode = (process.env.EXECUTION_MODE || 'local') as ExecutionMode;

    switch (mode) {
      case 'ssh':
        return new SSHExecutor({
          host: process.env.SSH_HOST || 'host.docker.internal',
          port: parseInt(process.env.SSH_PORT || '22'),
          username: process.env.SSH_USER || 'root',
          privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH || '/root/.ssh/id_rsa',
          password: process.env.SSH_PASSWORD,
        });

      case 'local':
      default:
        return new LocalExecutor();
    }
  }
}

export default ExecutorFactory;
