import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CommandContext } from '../engine/CommandParser';
import type { LevelDefinition, LevelId, LoadedLevel, MockProcess } from '../types/level.types';
import { getNextLevelId } from '../types/level.types';

export type GamePhase =
  | 'menu'
  | 'loading'
  | 'cutscene'
  | 'playing'
  | 'victory'
  | 'gameover'
  | 'finale';
export type RobotState = 'idle' | 'success' | 'error' | 'thinking' | 'win';

export interface PersistedGameState {
  currentLevelId: LevelId;
  oxygen: number;
  score: number;
  completedLevels: LevelId[];
  hasSudo: boolean;
}

export interface GameState {
  currentLevelId: LevelId;
  oxygen: number;
  score: number;
  completedLevels: LevelId[];
  hasSudo: boolean;
  oxygenEnabled: boolean;
  trainingMode: boolean;
  phase: GamePhase;
  commandContext: CommandContext | null;
  completedCommands: string[];
  lastCommand: string;
  robotState: RobotState;
  isPaused: boolean;
  levelSession: number;
  currentLevelDefinition: LevelDefinition | null;
  activeProcesses: MockProcess[];
  sequenceStep: number;
  serviceStates: Record<string, 'active' | 'inactive' | 'failed'>;
  discoveries: string[];
  mapOpen: boolean;

  initLevel: (loaded: LoadedLevel, context: CommandContext) => void;
  setCommandContext: (ctx: CommandContext) => void;
  markCommandUsed: (command: string) => void;
  setOxygen: (value: number) => void;
  addScore: (points: number) => void;
  refillOxygen: (amount: number) => void;
  setPhase: (phase: GamePhase) => void;
  setCurrentLevelId: (id: LevelId) => void;
  completeLevel: (levelId: LevelId) => void;
  advanceToNextLevel: () => LevelId | null;
  setLastCommand: (cmd: string) => void;
  setRobotState: (state: RobotState) => void;
  togglePause: () => void;
  restartCurrentLevel: () => void;
  stopGame: () => void;
  setHasSudo: (value: boolean) => void;
  setActiveProcesses: (processes: MockProcess[]) => void;
  setSequenceStep: (step: number) => void;
  setServiceState: (name: string, status: 'active' | 'inactive' | 'failed') => void;
  addDiscovery: (token: string) => void;
  setMapOpen: (v: boolean) => void;
  resetGame: () => void;
}

const DEFAULT_PERSIST: PersistedGameState = {
  currentLevelId: 'level_00',
  oxygen: 87,
  score: 0,
  completedLevels: [],
  hasSudo: false,
};

function initServiceStates(
  level: LevelDefinition,
): Record<string, 'active' | 'inactive' | 'failed'> {
  const states: Record<string, 'active' | 'inactive' | 'failed'> = {};
  for (const svc of level.systemctl_services ?? []) {
    states[svc.name] = svc.status;
  }
  return states;
}

function initialOxygen(loaded: LoadedLevel, current: number): number {
  if (!loaded.oxygenEnabled) return 100;
  return current > 0 ? current : 87;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentLevelId: 'level_00',
      oxygen: 87,
      score: 0,
      completedLevels: [],
      hasSudo: false,
      oxygenEnabled: false,
      trainingMode: true,
      phase: 'menu',
      commandContext: null,
      completedCommands: [],
      lastCommand: '',
      robotState: 'idle',
      isPaused: false,
      levelSession: 0,
      currentLevelDefinition: null,
      activeProcesses: [],
      sequenceStep: 0,
      serviceStates: {},
      discoveries: [],
      mapOpen: false,

      initLevel: (loaded, context) =>
        set({
          currentLevelId: loaded.definition.id as LevelId,
          currentLevelDefinition: loaded.definition,
          oxygenEnabled: loaded.oxygenEnabled,
          trainingMode: !loaded.oxygenEnabled,
          oxygen: initialOxygen(loaded, get().oxygen),
          commandContext: context,
          completedCommands: [],
          robotState: 'idle',
          activeProcesses: [...(loaded.definition.mock_processes ?? [])],
          sequenceStep: 0,
          serviceStates: initServiceStates(loaded.definition),
          discoveries: [],
        }),

      setCommandContext: (ctx) => set({ commandContext: ctx }),

      markCommandUsed: (command) =>
        set((s) => ({
          completedCommands: s.completedCommands.includes(command)
            ? s.completedCommands
            : [...s.completedCommands, command],
        })),

      setOxygen: (value) => {
        const clamped = Math.max(0, Math.min(100, value));
        set({ oxygen: clamped });
        if (clamped === 0 && get().oxygenEnabled && !get().isPaused) {
          set({ phase: 'gameover' });
        }
      },

      addScore: (points) => set((s) => ({ score: Math.max(0, s.score + points) })),

      refillOxygen: (amount) =>
        set((s) => ({ oxygen: Math.min(100, s.oxygen + amount) })),

      setPhase: (phase) => set({ phase }),

      setCurrentLevelId: (id) => set({ currentLevelId: id }),

      completeLevel: (levelId) =>
        set((s) => ({
          completedLevels: s.completedLevels.includes(levelId)
            ? s.completedLevels
            : [...s.completedLevels, levelId],
        })),

      advanceToNextLevel: () => {
        const next = getNextLevelId(get().currentLevelId);
        if (!next) return null;
        set({ currentLevelId: next, levelSession: get().levelSession + 1 });
        return next;
      },

      setLastCommand: (cmd) => set({ lastCommand: cmd }),

      setRobotState: (robotState) => set({ robotState }),

      togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

      restartCurrentLevel: () =>
        set((s) => {
          const def = s.currentLevelDefinition;
          return {
            isPaused: false,
            robotState: 'idle',
            levelSession: s.levelSession + 1,
            completedCommands: [],
            hasSudo: false,
            activeProcesses: [...(def?.mock_processes ?? [])],
            sequenceStep: 0,
            serviceStates: def ? initServiceStates(def) : {},
            discoveries: [],
          };
        }),

      stopGame: () =>
        set((s) => ({
          currentLevelId: 'level_00',
          score: 0,
          completedLevels: [],
          hasSudo: false,
          oxygen: 100,
          oxygenEnabled: false,
          trainingMode: true,
          phase: 'menu',
          isPaused: false,
          robotState: 'idle',
          levelSession: s.levelSession + 1,
          completedCommands: [],
          commandContext: null,
          lastCommand: '',
          currentLevelDefinition: null,
          activeProcesses: [],
          sequenceStep: 0,
          serviceStates: {},
          discoveries: [],
          mapOpen: false,
        })),

      resetGame: () =>
        set((s) => ({
          currentLevelId: 'level_00',
          score: 0,
          completedLevels: [],
          hasSudo: false,
          oxygen: 100,
          oxygenEnabled: false,
          trainingMode: true,
          phase: 'menu',
          isPaused: false,
          robotState: 'idle',
          levelSession: s.levelSession + 1,
          completedCommands: [],
          commandContext: null,
          lastCommand: '',
          currentLevelDefinition: null,
          activeProcesses: [],
          sequenceStep: 0,
          serviceStates: {},
          discoveries: [],
          mapOpen: false,
        })),

      setMapOpen: (v) => set({ mapOpen: v }),

      setHasSudo: (value) => set({ hasSudo: value }),

      setActiveProcesses: (processes) => set({ activeProcesses: processes }),

      setSequenceStep: (step) => set({ sequenceStep: step }),

      setServiceState: (name, status) =>
        set((s) => ({
          serviceStates: { ...s.serviceStates, [name]: status },
        })),

      addDiscovery: (token) =>
        set((s) => ({
          discoveries: s.discoveries.includes(token)
            ? s.discoveries
            : [...s.discoveries, token],
        })),
    }),
    {
      name: 'retro-ux-save',
      version: 2,
      migrate: (persistedState, version) => {
        if (version === 0) {
          return DEFAULT_PERSIST;
        }
        if (version < 2) {
          return { ...DEFAULT_PERSIST, ...(persistedState as PersistedGameState), hasSudo: false };
        }
        return persistedState as PersistedGameState;
      },
      partialize: (s) => ({
        currentLevelId: s.currentLevelId,
        oxygen: s.oxygen,
        score: s.score,
        completedLevels: s.completedLevels,
        hasSudo: s.hasSudo,
      }),
    },
  ),
);
