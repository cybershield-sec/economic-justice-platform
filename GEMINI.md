# GEMINI.md

## Project Overview

This project is a static website for the Economic Justice Platform, a revolutionary ecosystem for economic justice organizing. The platform facilitates storytelling, resource sharing, and human-AI collaboration to transform passive reading into active participation and collective action.

The platform is built with HTML, CSS, and vanilla JavaScript, with no external dependencies. It is designed to be a self-contained, static site that can be easily deployed on any static hosting service.

The main components of the platform are:

*   **The King's Reckoning (`index.html`):** An interactive parable that introduces themes of economic justice. It includes features like text-to-speech, interactive elements, and social sharing.
*   **Resource Hub (`economic-justice-resources.html`):** A directory of real-world organizations fighting economic oppression.
*   **Community Story Sharing (`story-platform.html`):** A platform for users to share their own stories of economic struggle, resistance, and solutions. It supports multimedia uploads and community interactions.
*   **Human-AI Collaboration Forum (`multi-agent-chat.html`):** A discussion platform where humans and AI agents can collaborate on economic justice solutions. It features multiple conversation modes and simulated AI agent responses.

## Building and Running

### C++ Tally Server with Tailscale Replacement

The C++ tally server now includes comprehensive Tailscale replacement functionality with secure peer-to-peer networking:

```bash
# Build the C++ server with OpenSSL and assembly integration
make

# Run the server with networking capabilities
./tally-server

# Run in background mode with networking
./tally-server --daemon &

# Test network functionality
./test-network.sh
```

### Local Development

To run the project locally, you can use the following commands:

```bash
# Using the C++ server with networking (port 8080)
npm start
```

or

```bash
# Using the 'serve' package (port 3000)
npm run serve
```

or

```bash
# Using Python's built-in HTTP server (port 8000)
python -m http.server 8000
```

This will start a local development server, and you can access the platform at `http://localhost:8000`.

### Deployment

The platform is designed for easy deployment to any static hosting service. The `deployment-guide.md` file provides detailed instructions for deploying to services like GitHub Pages, Netlify, and Vercel.

The `package.json` also includes a script for deploying with `surge.sh`:

```bash
npm run deploy
```

## Development Conventions

*   **Technology Stack:** The project uses HTML5, CSS3, and vanilla JavaScript for the frontend, and C++ with OpenSSL for the backend server with Tailscale replacement networking.
*   **File Structure:** The project is organized into a root directory containing the main HTML files, C++ server files, and an `assets` directory for CSS, JavaScript, and media files.
*   **Styling:** The CSS is written directly within the HTML files in `<style>` tags. It uses modern CSS features like Flexbox and Grid.
*   **JavaScript:** The JavaScript is also written directly within the HTML files in `<script>` tags. It is vanilla JavaScript with no external libraries.
*   **C++ Server:** The tally server includes secure peer-to-peer networking, encryption, and network tunneling capabilities as a Tailscale replacement.
*   **Self-Contained Components:** Each HTML file is a self-contained component of the platform, with its own styles and scripts. This makes it easy to understand and maintain each part of the platform individually.
*   **Progressive Enhancement:** The platform is designed to work without JavaScript, ensuring that the core content is accessible to all users.
*   **Secure Networking:** The C++ server provides encrypted peer-to-peer communication, network discovery, and secure tunneling without external dependencies.
