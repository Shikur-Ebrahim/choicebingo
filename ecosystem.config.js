module.exports = {
  apps: [
    {
      name: 'ChoiceBingo-bot',
      cwd: './bot',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'ChoiceBingo-api',
      cwd: './api',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production', PORT: 3002 },
    },
  ],
};
