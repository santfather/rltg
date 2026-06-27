import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import {
  buildPrompt,
  type CommandContext,
  type OutputKind,
  type OutputLine,
} from '../engine/CommandParser';
import { completeTabInput } from '../engine/TabCompletion';
import { audioSystem } from '../engine/AudioSystem';
import { useGameSession } from '../hooks/useGameSession';
import { useGameStore } from '../store/gameStore';
import type { LoadedLevel } from '../types/level.types';

const XTERM_COLORS: Record<OutputKind, string> = {
  input: '\x1b[38;2;255;176;0m',
  output: '\x1b[38;2;0;255;65m',
  error: '\x1b[38;2;255;49;49m',
  system: '\x1b[38;2;0;207;255m',
  success: '\x1b[38;2;0;255;65m',
};

const RESET = '\x1b[0m';
const TAB_DOUBLE_MS = 400;

interface TerminalProps {
  level: LoadedLevel;
  commandContext: CommandContext;
  onWin: () => void;
}

/** xterm.js terminal wrapper with CRT styling */
export default function TerminalView({ level, commandContext, onWin }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const inputBufferRef = useRef('');
  const ctxRef = useRef(commandContext);
  const lastTabRef = useRef(0);
  const isPaused = useGameStore((s) => s.isPaused);
  const { submitCommand } = useGameSession(level, onWin);

  useEffect(() => {
    ctxRef.current = commandContext;
  }, [commandContext]);

  const writeColored = useCallback((text: string, kind: OutputKind = 'output') => {
    xtermRef.current?.write(`${XTERM_COLORS[kind]}${text}${RESET}`);
  }, []);

  const writeLines = useCallback((lines: OutputLine[]) => {
    const term = xtermRef.current;
    if (!term) return;
    for (const line of lines) {
      term.write(`${XTERM_COLORS[line.kind]}${line.text}${RESET}\r\n`);
    }
  }, []);

  const writePrompt = useCallback(
    (ctx: CommandContext) => {
      writeColored(buildPrompt(ctx), 'input');
    },
    [writeColored],
  );

  const handleSubmit = useCallback(() => {
    const term = xtermRef.current;
    const line = inputBufferRef.current;
    inputBufferRef.current = '';
    if (!term) return;

    term.write('\r\n');
    const ctx = ctxRef.current;

    if (!line.trim()) {
      writePrompt(ctx);
      return;
    }

    const result = submitCommand(line, ctx);
    ctxRef.current = result.context;

    if (result.clearScreen) term.clear();
    if (result.lines.length) writeLines(result.lines);
    if (!result.won) writePrompt(result.context);
  }, [submitCommand, writePrompt, writeLines]);

  const handleTab = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;

    const now = Date.now();
    const showAll = now - lastTabRef.current < TAB_DOUBLE_MS;
    lastTabRef.current = now;

    const current = inputBufferRef.current;
    const { newInput, listLines, bell } = completeTabInput(
      current,
      ctxRef.current,
      showAll,
    );

    if (bell) {
      term.write('\x07');
      return;
    }

    if (listLines.length > 0) {
      term.write('\r\n');
      for (const entry of listLines) {
        term.write(`${entry}  `);
      }
      term.write('\r\n');
      writePrompt(ctxRef.current);
      term.write(newInput);
      inputBufferRef.current = newInput;
      return;
    }

    if (newInput !== current) {
      const suffix = newInput.slice(current.length);
      term.write(suffix);
      inputBufferRef.current = newInput;
    }
  }, [writePrompt]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: 18,
      lineHeight: 1.4,
      theme: {
        background: '#0a0f0a',
        foreground: '#00ff41',
        cursor: '#00ff41',
        selectionBackground: '#003b00',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    inputBufferRef.current = '';
    term.clear();
    writePrompt(ctxRef.current);

    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, [level.definition.id, writePrompt]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const handler = term.onData((data) => {
      if (isPaused) return;
      const sshMode = ctxRef.current.sshPending;
      const sudoMode = ctxRef.current.sudoPending;
      const maskInput = sshMode || sudoMode;

      if (data === '\r') {
        handleSubmit();
        return;
      }
      if (data === '\t') {
        if (!maskInput) handleTab();
        else term.write('\x07');
        return;
      }
      if (data === '\u007F') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }
      if (data >= ' ') {
        inputBufferRef.current += data;
        term.write(maskInput ? '*' : data);
        audioSystem.keyClick();
      }
    });

    return () => handler.dispose();
  }, [handleSubmit, handleTab, isPaused]);

  return (
    <div className="terminal-screen flex flex-1 flex-col overflow-hidden bg-[var(--bg-terminal)] p-2">
      <div ref={containerRef} className="h-full min-h-[400px] w-full flex-1" />
    </div>
  );
}
