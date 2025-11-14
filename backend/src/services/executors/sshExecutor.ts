import { Client } from 'ssh2';
import { readFileSync } from 'fs';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SSHExecutor {
  private config: SSHConfig;

  constructor(config: SSHConfig) {
    this.config = config;
  }

  async executeCommand(command: string, timeout: number = 300000): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      // Set overall timeout
      const timeoutId = setTimeout(() => {
        conn.end();
        reject(new Error(`SSH command timed out after ${timeout}ms`));
      }, timeout);

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timeoutId);
            conn.end();
            reject(err);
            return;
          }

          stream.on('close', (code: number) => {
            exitCode = code;
            clearTimeout(timeoutId);
            conn.end();

            if (exitCode !== 0) {
              reject(new Error(`Command exited with code ${exitCode}: ${stderr || stdout}`));
            } else {
              resolve({ stdout, stderr, exitCode });
            }
          });

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`SSH connection error: ${err.message}`));
      });

      // Connect with private key or password
      const connectConfig: any = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
      };

      if (this.config.privateKeyPath) {
        try {
          connectConfig.privateKey = readFileSync(this.config.privateKeyPath);
        } catch (error: any) {
          clearTimeout(timeoutId);
          reject(new Error(`Failed to read private key: ${error.message}`));
          return;
        }
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
      } else {
        clearTimeout(timeoutId);
        reject(new Error('SSH authentication requires either privateKeyPath or password'));
        return;
      }

      conn.connect(connectConfig);
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.executeCommand('echo "connection test"', 5000);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default SSHExecutor;
