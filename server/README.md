# TTS Converter - Gemini AI to MP3

A JavaScript utility that converts text to speech using Google's Gemini AI API and saves the output as an MP3 file.

## Features

- 🎵 Convert text to speech using Gemini AI
- 📁 Automatically converts WAV output to MP3 format
- 🚀 Simple command-line interface
- ⚡ Fast and efficient processing
- 🔧 Built with Node.js

## Requirements

- **Node.js** >= 18.0.0
- **FFmpeg** (for WAV to MP3 conversion)
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com)

## Installation

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org)

### 2. Install FFmpeg

**On Windows:**

```bash
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

**On macOS:**

```bash
brew install ffmpeg
```

**On Linux:**

```bash
sudo apt-get install ffmpeg
```

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Click "Get API Key"
3. Create a new API key for your project
4. Set it as an environment variable: `GEMINI_API_KEY`

### 4. Install Dependencies

```bash
npm install
```

## Environment Setup

### Windows (PowerShell)

```powershell
$env:GEMINI_API_KEY = "your-gemini-api-key-here"
```

### Windows (Command Prompt)

```cmd
set GEMINI_API_KEY=your-gemini-api-key-here
```

### Linux/macOS

```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### Permanent Setup (Recommended)

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your-gemini-api-key-here
```

Then load it before running:

```bash
# On Windows
type .env | findstr /v "^#" | findstr /v "^$" | for /f "delims==" %i in ('more') do set "%i"

# On Linux/macOS
source .env
```

Or use `dotenv` package:

```bash
npm install dotenv
```

And update `tts-converter.js`:

```javascript
import dotenv from 'dotenv';
dotenv.config();
```

## Usage

### Basic Usage

```bash
node tts-converter.js "Hello, this is a test"
```

This will create `output.mp3` in the current directory.

### Specify Output File

```bash
node tts-converter.js "Hello, this is a test" -o my-audio.mp3
```

### From a Text File

```bash
node tts-converter.js "$(cat text.txt)" -o output.mp3
```

### Using npm script

```bash
npm start -- "Your text here" -o output.mp3
```

## Options

- `-o, --output <path>` - Specify the output MP3 file path (default: `output.mp3`)

## Examples

```bash
# Simple greeting
node tts-converter.js "Hello world!"

# With custom output path
node tts-converter.js "Welcome to my podcast" -o podcast.mp3

# Long text
node tts-converter.js "This is a longer text that will be converted to speech with natural prosody." -o long-text.mp3
```

## How It Works

1. **Text Input**: Accepts text content from command line arguments
2. **Gemini AI Processing**: Sends text to Google's Gemini 2.0 Flash model with audio generation capabilities
3. **WAV Output**: Gemini returns the audio in WAV format
4. **MP3 Conversion**: FFmpeg converts the WAV file to MP3 format
5. **File Output**: Saves the final MP3 file to the specified location

## Troubleshooting

### Error: "GEMINI_API_KEY environment variable is not set"

- Make sure you've set the `GEMINI_API_KEY` environment variable
- Verify your API key is correct and has proper permissions

### Error: "FFmpeg conversion error"

- Ensure FFmpeg is installed and in your system PATH
- Test FFmpeg: `ffmpeg -version`

### Error: "Could not extract audio data from Gemini response"

- Verify your Gemini API key has audio generation permissions
- Check that you're using a model that supports audio output

### No audio generated

- Check that the text is not empty
- Verify your API key rate limits haven't been exceeded
- Check your internet connection

## Project Structure

```
tts-gemini-mp3/
├── tts-converter.js     # Main converter script
├── package.json         # Project dependencies
├── README.md           # This file
└── .env               # Environment variables (optional)
```

## Dependencies

- **@google/generative-ai**: Official Google Generative AI SDK
- **fluent-ffmpeg**: Node.js wrapper for FFmpeg

## API Models Supported

- `gemini-2.0-flash-exp` - Supports audio generation

## License

MIT

## Support

For issues or questions:

1. Check the Troubleshooting section above
2. Verify all requirements are installed
3. Ensure your API key is valid
4. Check [Gemini API Documentation](https://ai.google.dev/docs)
5. Visit [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
