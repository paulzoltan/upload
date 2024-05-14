#!/usr/bin/env node

const ftp = require('basic-ftp')
const glob = require('glob')
const { execSync } = require('child_process')
const minimist = require('minimist')

async function getCurrentBranch() {
  try {
    return execSync('git branch --show-current').toString().trim()
  } catch (err) {
    console.error('Error getting current branch:', err)
    process.exit(1)
  }
}

const credentials = {
  host: process.env.JNKR_FTP_HOST,
  user: process.env.JNKR_FTP_USER,
  password: process.env.JNKR_FTP_PASS,
}

async function uploadFile(key, ignoreBranch, basePath) {
  if (!ignoreBranch) {
    const currentBranch = await getCurrentBranch()
    if (key !== currentBranch) {
      console.error(
        `Error: The provided key "${key}" does not match the current branch "${currentBranch}".`
      )
      process.exit(1)
    }
  }

  const client = new ftp.Client()
  try {
    await client.access(credentials)

    const remotePathJS = `${basePath}/${key}/index-${key}.js`
    const remotePathCSS = `${basePath}/${key}/index-${key}.css`

    const localFilePatterns = [
      'dist/assets/index*.css',
      'dist/assets/index*.js',
    ]

    const localFiles = []
    for (const pattern of localFilePatterns) {
      const matchingFiles = glob.sync(pattern)
      localFiles.push(...matchingFiles)
    }

    if (localFiles.length === 0) {
      console.error(
        'No files found matching the specified patterns:',
        localFilePatterns.join(', ')
      )
    } else {
      for (const localFilePath of localFiles) {
        if (localFilePath.endsWith('.js')) {
          await client.uploadFrom(localFilePath, remotePathJS)
        } else if (localFilePath.endsWith('.css')) {
          await client.uploadFrom(localFilePath, remotePathCSS)
        }
        console.log(
          `File ${localFilePath} uploaded as ${
            localFilePath.endsWith('.js') ? remotePathJS : remotePathCSS
          } successfully.`
        )
      }
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    client.close()
  }
}

const args = minimist(process.argv.slice(2), {
  default: {
    'base-path': 'public/assets',
    'ignore-branch': false,
  },
  alias: {
    'base-path': 'b',
    'ignore-branch': 'i',
  },
})

if (args.help || args.h) {
  console.log(`
    Usage: node upload.js <branch-key> [options]

    Options:
      --ignore-branch, -i  Ignore the branch check
      --base-path=<path>, -b  Set the base path (default: 'public/assets')
      --help, -h  Show this help message
  `)
  process.exit(0)
}

if (!args._[0]) {
  console.error(
    'Usage: node upload.js <branch-key> [--ignore-branch] [--base-path=<base-path>]'
  )
  process.exit(1)
}

const key = args._[0]
uploadFile(key, args['ignore-branch'], args['base-path'])
