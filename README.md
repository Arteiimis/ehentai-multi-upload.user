# E-Hentai Multi Upload Queue

A Tampermonkey userscript that adds a multi-select upload button to E-Hentai's upload page and uploads files sequentially.

## Features

- Select multiple files at once.
- Uploads sequentially with a fixed delay between files.
- Avoids page refresh during uploads.
- Shows upload progress while uploading.
- Reloads the page after the queue completes.

## Install

1. Install a userscript manager such as Tampermonkey or Violentmonkey.
2. Open the script page on GreasyFork: [https://greasyfork.org/zh-CN/scripts/567407-e-hentai-multi-upload-queue](https://greasyfork.org/zh-CN/scripts/567407-e-hentai-multi-upload-queue)
3. Click the Install button and confirm.

## Usage

1. Click `Multi Upload` next to the file input.
2. Select multiple files.
3. The script uploads them one by one and reloads the page after completion.

## Configuration

Edit these constants at the top of the script if needed:

- `PER_FILE_DELAY_MS` - delay between files (milliseconds).

## Notes

This script is not affiliated with E-Hentai.

## License

MIT
