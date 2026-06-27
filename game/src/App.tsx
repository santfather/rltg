import { lazy, Suspense, useCallback, type ReactNode } from 'react';
import CRTOverlay from './components/CRTOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import TopBar from './components/TopBar';
import MissionLog from './components/MissionLog';
import VictoryScreen from './components/VictoryScreen';
import GameOverScreen from './components/GameOverScreen';
import LevelLoadScreen from './components/LevelLoadScreen';
import CutsceneScreen from './components/CutsceneScreen';
import FinaleScreen from './components/FinaleScreen';
import MainMenuScreen from './components/MainMenuScreen';
import LevelErrorScreen from './components/LevelErrorScreen';
import ShipMapScreen from './components/ShipMapScreen';
import { createCommandContext } from './engine/CommandParser';
import { getNextLevelId, tryGetLevelById } from './levels/index';
import { useGameStore } from './store/gameStore';
import { useOxygen } from './hooks/useOxygen';
import { useAudio } from './hooks/useAudio';
import { getFirstIncompleteLevel } from './types/level.types';

const Terminal = lazy(() => import('./components/Terminal'));

function GameApp() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const levelSession = useGameStore((s) => s.levelSession);
  const oxygen = useGameStore((s) => s.oxygen);
  const score = useGameStore((s) => s.score);
  const phase = useGameStore((s) => s.phase);
  const trainingMode = useGameStore((s) => s.trainingMode);
  const isPaused = useGameStore((s) => s.isPaused);
  const completedCommands = useGameStore((s) => s.completedCommands);
  const completedLevels = useGameStore((s) => s.completedLevels);
  const lastCommand = useGameStore((s) => s.lastCommand);
  const commandContext = useGameStore((s) => s.commandContext);
  const mapOpen = useGameStore((s) => s.mapOpen);
  const initLevel = useGameStore((s) => s.initLevel);
  const setPhase = useGameStore((s) => s.setPhase);
  const advanceToNextLevel = useGameStore((s) => s.advanceToNextLevel);
  const restartCurrentLevel = useGameStore((s) => s.restartCurrentLevel);
  const stopGame = useGameStore((s) => s.stopGame);
  const togglePause = useGameStore((s) => s.togglePause);
  const setMapOpen = useGameStore((s) => s.setMapOpen);

  const levelResult = tryGetLevelById(currentLevelId);
  const level = levelResult.ok ? levelResult.level : null;

  useOxygen();
  useAudio();

  const startPlaying = useCallback(() => {
    const loaded = tryGetLevelById(currentLevelId);
    if (!loaded.ok) return;
    const ctx = createCommandContext(
      loaded.level.definition,
      loaded.level.localNodes,
      loaded.level.remoteNodes,
    );
    initLevel(loaded.level, ctx);
    setPhase('playing');
  }, [currentLevelId, initLevel, setPhase]);

  const handleLoadComplete = useCallback(() => {
    if (currentLevelId === 'level_00') {
      startPlaying();
      return;
    }
    setPhase('cutscene');
  }, [currentLevelId, setPhase, startPlaying]);

  const handleWin = useCallback(() => {
    setPhase('victory');
  }, [setPhase]);

  const handleNextMission = useCallback(() => {
    const nextId = getNextLevelId(currentLevelId);
    if (!nextId) {
      setPhase('finale');
      return;
    }
    advanceToNextLevel();
    setPhase('loading');
  }, [advanceToNextLevel, currentLevelId, setPhase]);

  const handleRestart = useCallback(() => {
    restartCurrentLevel();
    setPhase('loading');
    const fresh = tryGetLevelById(useGameStore.getState().currentLevelId);
    if (fresh.ok) {
      useGameStore.getState().setOxygen(fresh.level.oxygenEnabled ? 87 : 100);
    }
  }, [restartCurrentLevel, setPhase]);

  const handleStop = useCallback(() => {
    stopGame();
  }, [stopGame]);

  const handleToggleMap = useCallback(() => {
    setMapOpen(!useGameStore.getState().mapOpen);
  }, [setMapOpen]);

  const missionNum = currentLevelId.replace('level_', '');

  if (!levelResult.ok) {
    return (
      <>
        <CRTOverlay />
        <LevelErrorScreen
          levelId={currentLevelId}
          error={levelResult.error}
          onReset={stopGame}
        />
      </>
    );
  }

  if (phase === 'gameover') {
    return (
      <>
        <CRTOverlay />
        <GameOverScreen lastCommand={lastCommand} score={score} onRestart={handleRestart} />
      </>
    );
  }

  if (phase === 'victory') {
    const nextId = getNextLevelId(currentLevelId);
    return (
      <>
        <CRTOverlay />
        <VictoryScreen
          objectives={level.definition.learning_objectives}
          oxygenBonus={level.definition.reward.oxygen_bonus}
          scoreBonus={level.definition.reward.score}
          unlockLog={level.definition.reward.unlock_log}
          onNextMission={nextId ? handleNextMission : handleNextMission}
          isFinalLevel={!nextId}
        />
      </>
    );
  }

  if (phase === 'loading') {
    return (
      <>
        <CRTOverlay />
        <LevelLoadScreen
          missionId={missionNum}
          missionTitle={level.definition.title}
          asciiArt={level.definition.ascii_art}
          onLoadComplete={handleLoadComplete}
        />
      </>
    );
  }

  if (phase === 'cutscene') {
    const imageUrl = level.definition.ascii_art_path
      ? new URL(`./assets/scenes/${level.definition.ascii_art_path}`, import.meta.url).href
      : undefined;

    return (
      <>
        <CRTOverlay />
        <CutsceneScreen
          key={`${currentLevelId}-${levelSession}`}
          imageUrl={imageUrl}
          lines={level.definition.narrative}
          location={level.definition.location}
          onComplete={startPlaying}
        />
      </>
    );
  }

  if (!commandContext) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--bg-deep)] font-[family-name:var(--font-terminal)] text-[var(--crt-green)]">
        RETRO-UX v3.11 // INITIALIZING...
      </div>
    );
  }

  return (
    <>
      <CRTOverlay />
      <TopBar
        oxygen={oxygen}
        missionId={missionNum}
        score={score}
        trainingMode={trainingMode}
        isPaused={isPaused}
        onRestart={handleRestart}
        onPause={togglePause}
        onStop={handleStop}
        onToggleMap={handleToggleMap}
      />
      {mapOpen ? (
        <ShipMapScreen
          currentLevelId={currentLevelId}
          completedLevels={completedLevels}
          onClose={() => setMapOpen(false)}
        />
      ) : null}
      <main className="flex flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center font-[family-name:var(--font-terminal)] text-[var(--crt-green)]">
              ЗАГРУЗКА ТЕРМИНАЛА...
            </div>
          }
        >
          <Terminal
            key={`${currentLevelId}-${levelSession}`}
            level={level}
            commandContext={commandContext}
            onWin={handleWin}
          />
        </Suspense>
        <MissionLog
          objectives={level.definition.learning_objectives}
          completedCommands={completedCommands}
          sectionPlan={level.definition.section_plan}
        />
      </main>
    </>
  );
}

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const oxygen = useGameStore((s) => s.oxygen);
  const completedLevels = useGameStore((s) => s.completedLevels);
  const resetGame = useGameStore((s) => s.resetGame);
  const setPhase = useGameStore((s) => s.setPhase);
  const setCurrentLevelId = useGameStore((s) => s.setCurrentLevelId);
  const stopGame = useGameStore((s) => s.stopGame);

  useAudio();

  const handleCriticalReset = useCallback(() => {
    stopGame();
  }, [stopGame]);

  const handleNewGame = useCallback(() => {
    resetGame();
    setPhase('loading');
  }, [resetGame, setPhase]);

  const handleContinue = useCallback(() => {
    const next = getFirstIncompleteLevel(completedLevels);
    setCurrentLevelId(next);
    setPhase('loading');
  }, [completedLevels, setCurrentLevelId, setPhase]);

  const handleFinaleRestart = useCallback(() => {
    resetGame();
    setPhase('menu');
  }, [resetGame, setPhase]);

  const shell = (content: ReactNode) => (
    <div className="relative flex min-h-svh flex-col">{content}</div>
  );

  if (phase === 'menu') {
    return shell(
      <>
        <CRTOverlay />
        <MainMenuScreen
          completedLevels={completedLevels}
          onStart={handleNewGame}
          onContinue={completedLevels.length > 0 ? handleContinue : undefined}
        />
      </>,
    );
  }

  if (phase === 'finale') {
    return shell(
      <>
        <CRTOverlay />
        <FinaleScreen
          totalScore={score}
          completedLevels={completedLevels}
          finalOxygen={oxygen}
          onRestart={handleFinaleRestart}
        />
      </>,
    );
  }

  return (
    <ErrorBoundary onReset={handleCriticalReset}>
      {shell(<GameApp />)}
    </ErrorBoundary>
  );
}
