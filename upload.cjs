#!/usr/bin/env node

const ftp = require('basic-ftp')
const glob = require('glob')
const { execSync } = require('child_process')

async function getCurrentBranch() {
  try {
    // Execute the 'git branch --show-current' command to get the current branch name
    return execSync('git branch --show-current').toString().trim()
  } catch (err) {
    console.error('Error getting current branch:', err)
    process.exit(1) // Exit the script with an error code
  }
}

const credentials = {
  host: process.env.JNKR_FTP_HOST,
  user: process.env.JNKR_FTP_USER,
  password: process.env.JNKR_FTP_PASS,
}

async function uploadFile(key, modifier) {
  if (modifier !== '--ignore-branch') {
    const currentBranch = await getCurrentBranch()
    if (key !== currentBranch) {
      console.error(
        `Error: The provided key "${key}" does not match the current branch "${currentBranch}".`
      )
      process.exit(1) // Exit the script with an error code
    }
  }

  const client = new ftp.Client()
  try {
    // Connect to the FTP server
    await client.access(credentials)

    // Use the provided parameter in the remote filenames
    const remotePathJS = `public/assets/${key}/index-${key}.js`
    const remotePathCSS = `public/assets/${key}/index-${key}.css`

    // Define an array of local file patterns to match
    const localFilePatterns = [
      'dist/assets/index*.css',
      'dist/assets/index*.js',
    ]

    // Find local files that match each pattern
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
      // Upload each matching file
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
    // Close the FTP connection
    client.close()
  }
}

if (process.argv.length <= 3) {
  console.error('Usage: node upload.js <branch-key>')
}
const key = process.argv[2]
uploadFile(key, process.argv[3])
