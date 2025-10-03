
import { ESLint } from 'eslint';

async function test() {
  try {
    const eslint = new ESLint();
    console.log('ESLint instance created.');

    const formatter = await eslint.loadFormatter('stylish');
    console.log('✅ Success! "stylish" formatter loaded successfully.');
    console.log('Formatter object:', formatter);

  } catch (error) {
    console.error('❌ Failed to load formatter:', error);
  }
}

test();