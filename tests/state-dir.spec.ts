import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { stateDir, statePath, STATE_DIR_NAME } from '../src/state.ts'

const profiles: string[] = []

function profile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'crate-state-'))
  profiles.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of profiles.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('stateDir', () => {
  it('直接返回当前状态目录，不创建任何东西', () => {
    const dir = profile()
    expect(stateDir(dir)).toBe(join(dir, STATE_DIR_NAME))
    expect(existsSync(join(dir, STATE_DIR_NAME))).toBe(false)
  })
})

describe('statePath', () => {
  it('把状态目录与相对路径拼接起来，不创建目录', () => {
    const dir = profile()
    expect(statePath(dir, 'presets.json')).toBe(join(dir, STATE_DIR_NAME, 'presets.json'))
    expect(existsSync(join(dir, STATE_DIR_NAME))).toBe(false)
  })

  it('支持多段相对路径', () => {
    const dir = profile()
    expect(statePath(dir, 'snapshots', 's1.json')).toBe(join(dir, STATE_DIR_NAME, 'snapshots', 's1.json'))
  })
})
