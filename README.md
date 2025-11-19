# LLM Meter CLI

Command-line interface for LLM Meter - Track and monitor your LLM usage, costs, and performance across multiple providers (OpenAI, Anthropic, Ollama, etc.).

## Features

- View usage statistics and costs
- List individual API requests with token details
- Interactive REPL mode for exploring data
- Server management commands
- Model pricing configuration

## Installation

```bash
npm install -g llm-meter-cli
```

Or install and run with npx:

```bash
npx llm-meter-cli
```

## Usage

### Basic Commands

```bash
# Show usage statistics
llm-meter stats

# List recent API requests
llm-meter requests

# View details of a specific request
llm-meter request <request-id>

# View model pricing
llm-meter pricing

# Start the LLM Meter server
llm-meter serve
```

### Options

- `--help`: Show help information for any command
- `-p, --project <name>`: Filter by project
- `--page <number>`: Page number for requests (default: 1)
- `--limit <number>`: Requests per page (default: 20)

### Interactive Mode

Run `llm-meter` without any arguments to enter the interactive REPL mode:

```bash
llm-meter
```

This launches a shell where you can run commands like:
- `stats` - Show usage statistics
- `requests` - List recent requests
- `pricing` - View model pricing
- `help` - Show available commands

## Configuration

The CLI connects to the LLM Meter backend server. You can configure the API endpoint using the `LLM_METER_API` environment variable:

```bash
export LLM_METER_API=http://localhost:3001/api
```

Default endpoint: `http://localhost:3001/api`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT