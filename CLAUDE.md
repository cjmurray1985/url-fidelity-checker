# URL Checker Agent Guidelines

## Build Commands
- `npm start` - Start the server (runs `node server.js`)
- `npm test` - Not implemented (default test script)

## Linting/Testing
- No formal linting setup - follow existing code style
- No test framework implemented

## Code Style Guidelines
- **Formatting:** 2-space indentation, no semicolons, single quotes for strings
- **Functions:** Mix of `function` declarations and arrow functions
- **Naming:** camelCase for variables and functions, descriptive variable names
- **DOM Elements:** Prefix variables with element type (e.g., `urlForm`, `errorSection`)
- **Error Handling:** Use try/catch blocks with specific error messages
- **Imports:** Group imports at the top of files by functionality
- **Organization:** Group utility functions, separate DOM manipulation from business logic
- **Comments:** Use section headers and function descriptions with inline comments for complex logic

## Best Practices
- Asynchronous operations should use async/await pattern
- DOM element variables should be cached at the top of files
- Follow existing error handling patterns for API endpoints
- Follow existing animation and UI transition patterns