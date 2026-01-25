const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const get_version = () => {
  const manifest_path = path.join(__dirname, 'src', 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf8'))
  return manifest.version
}

const create_zip_from_directory = (source_dir, output_path) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(output_path)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(source_dir, false)
    archive.finalize()
  })
}

const log = (message) => console.log(`[create-zip-archives] ${message}`)

const delete_old_zip_archives = (current_version) => {
  const files = fs.readdirSync(__dirname)
  const zipPattern = /extension-(.+)-(chrome|firefox)\.zip$/
  let deletedFiles = 0

  files.forEach((file) => {
    const match = file.match(zipPattern)
    if (match && match[1] != current_version) {
      const filePath = path.join(__dirname, file)
      log(`Deleting old archive: ${file}`)
      fs.unlinkSync(filePath)
      deletedFiles++
    }
  })

  if (deletedFiles > 0) {
    log(`Deleted ${deletedFiles} old extension archive(s)`)
  } else {
    log('No old archives to delete')
  }
}

const main = async () => {
  const base_dir = __dirname
  const dist_dir = path.join(base_dir, 'dist')
  const firefox_dist_dir = path.join(base_dir, 'dist-firefox')
  const version = get_version()

  try {
    delete_old_zip_archives(version)

    await create_zip_from_directory(
      dist_dir,
      path.join(base_dir, `extension-${version}-chrome.zip`)
    )

    await create_zip_from_directory(
      firefox_dist_dir,
      path.join(base_dir, `extension-${version}-firefox.zip`)
    )

    log(`Successfully created ZIP archives for version ${version}`)
  } catch (error) {
    log(`Error creating ZIP archives: ${error.message}`)
    process.exit(1)
  }
}

main()
