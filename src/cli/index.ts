#!/usr/bin/env node
import { SessionManager } from '../agent/session';
import { Memory } from '../agent/memory';
import { loadConfig } from '../config';
import { REPL } from './repl';

function main() {
  const projectPath = process.cwd();
  const config = loadConfig();

  const sessionManager = new SessionManager();
  const memory = new Memory(config.knowledgePath, projectPath);

  const repl = new REPL({
    sessionManager,
    memory,
    config
  });

  repl.start();
}

main();
