/**
 * PM2 ecosystem config. Use on server:
 *   npm run build && pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup   # persist across reboot
 */
module.exports = {
  apps: [
    {
      name: 'kol-backend',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
