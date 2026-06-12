module.exports = {
  apps: [
    {
      name: "ai-memory-mcp",
      script: "./mcp-server.js",
      args: "--http 3100",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 4000,
      max_restarts: 10,
    }
  ]
};
