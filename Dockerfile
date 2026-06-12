FROM node:20-slim

WORKDIR /app

# Install git (required for project detection)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .

# Environment variables (to be overridden by .env or VPS)
ENV AI_MEMORY_MONGO_URI=""
ENV PORT=3100

EXPOSE 3100

# Default command to run MCP server
CMD ["node", "mcp-server.js"]
