console.log('DATABASE_URL:', process.env.DATABASE_URL);
require('dotenv').config({ path: '.env.local' });
console.log('After dotenv DATABASE_URL:', process.env.DATABASE_URL);