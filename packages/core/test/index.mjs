import "./config/setup.mjs";

import { run } from 'worker-testbed';

import "./spec/screen_crypto_yoda.test.mjs";

run(import.meta.url, () => {
    console.log("All tests are finished");
    process.exit();
});
