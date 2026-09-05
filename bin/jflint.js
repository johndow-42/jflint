#!/usr/bin/env node
'use strict';

const { run } = require('../lib/cli');

process.exitCode = run(process.argv.slice(2));
