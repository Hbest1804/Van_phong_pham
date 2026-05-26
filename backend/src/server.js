import app from './app.js';
import { env } from './config/env.js';
import { seedAdmin } from './scripts/seed-admin.js';

app.listen(env.PORT, async () => {
  console.log(`Server is running on port ${env.PORT}`);
  await seedAdmin();
});
