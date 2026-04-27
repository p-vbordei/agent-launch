import { resolve } from 'node:path'
import { loadLaunchConfig, LaunchConfigError } from './config'
import { gatherContext, ContextError } from './context'

function usage(): never {
  console.error('Usage: agent-launch <draft|context> <version> [args]')
  process.exit(64)
}

async function main() {
  const [, , cmd, version] = process.argv
  if (!cmd) usage()

  const cwd = process.cwd()
  let cfg
  try {
    cfg = loadLaunchConfig(resolve(cwd, 'launch.yaml'))
  } catch (err) {
    if (err instanceof LaunchConfigError) {
      console.error(err.message)
      process.exit(1)
    }
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`launch.yaml not found at ${resolve(cwd, 'launch.yaml')}`)
      process.exit(1)
    }
    throw err
  }

  if (cmd === 'context') {
    if (!version) {
      console.error('context requires <version>')
      process.exit(1)
    }
    try {
      const manifestPath = cfg.context.manifest
        ? resolve(cwd, cfg.context.manifest)
        : undefined
      const ctx = gatherContext(cwd, version, manifestPath ? { manifestPath } : {})
      console.log(JSON.stringify(ctx, null, 2))
      process.exit(0)
    } catch (err) {
      if (err instanceof ContextError) {
        console.error(err.message)
        process.exit(1)
      }
      throw err
    }
  }

  if (cmd === 'draft') {
    console.error('draft: not yet implemented (Stage 2.2)')
    process.exit(2)
  }

  usage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
