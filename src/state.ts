import { join } from 'node:path'

/**
 * 每个 profile 的状态目录名。
 * 0.5 起统一为 `.dsh-crate`，0.4.x 的旧目录不再读取或迁移。
 */
export const STATE_DIR_NAME = '.dsh-crate'

/**
 * 返回状态目录。
 *
 * 入参：profileDir —— profile 根目录的绝对路径。
 * 返回：状态目录路径；目录本身由调用方按需创建。
 */
export function stateDir(profileDir: string): string {
  return join(profileDir, STATE_DIR_NAME)
}

/**
 * 拼出状态目录下的文件路径。
 *
 * 入参：profileDir —— profile 根目录；parts —— 目录内的相对路径片段。
 * 返回：完成迁移后的绝对路径。
 */
export function statePath(profileDir: string, ...parts: string[]): string {
  return join(stateDir(profileDir), ...parts)
}
