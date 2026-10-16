export class Logger {
  public static info(tag: string, message: string, data?: any) {
    console.log(`[\x1b[36mINFO\x1b[0m][${tag}] ${message}`, data ? JSON.stringify(data) : '');
  }

  public static success(tag: string, message: string, data?: any) {
    console.log(`[\x1b[32mSUCCESS\x1b[0m][${tag}] ${message}`, data ? JSON.stringify(data) : '');
  }

  public static warn(tag: string, message: string, data?: any) {
    console.warn(`[\x1b[33mWARN\x1b[0m][${tag}] ${message}`, data || '');
  }

  public static error(tag: string, message: string, error?: any) {
    console.error(`[\x1b[31mERROR\x1b[0m][${tag}] ${message}`, error?.message || error || '');
  }
}
