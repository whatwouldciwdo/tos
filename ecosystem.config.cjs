module.exports = {
  apps: [
    {
      name: "tor-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3111",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3111,
      },
    },
    {
      name: "tor-ws",
      script: "ws-server.js",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PORT_WS: 3112,
        HOST: "0.0.0.0",
      },
    },
  ],
};
