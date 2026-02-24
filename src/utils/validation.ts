const TASK_KEY_REGEX = /^[A-Z]+-\d+$/;

export function isValidTaskKey(key: string): boolean {
  return TASK_KEY_REGEX.test(key);
}

export function validateTaskKey(input: string, errorMessage: string): true | string {
  if (!isValidTaskKey(input)) {
    return errorMessage;
  }
  return true;
}
