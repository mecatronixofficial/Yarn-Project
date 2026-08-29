module.exports = {
  apps: [
    {
      name: 'yarn-erp-backend',
      cwd: '/var/www/yarn-production-erp/backend',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: 4000 },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '750M'
    },
    {
      name: 'yarn-erp-frontend',
      cwd: '/var/www/yarn-production-erp/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '750M'
    }
  ]
};
