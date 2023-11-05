module.exports = {
  apps: [
    {
      name: "ZF Trade Cron",
      script: "./main.js",
      instances: 1,
      cron_restart: "*/15 * * * *",
      watch: false,
      autorestart: false,
      exec_mode: "fork",
    },
  ],
};
