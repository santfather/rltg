/**
 * R.U.X robot idle jokes — bash.org / IT humor style, 2000s era.
 * Displayed as speech bubble in RobotWidget during idle state.
 *
 * Format: single string (one-liner) OR string[] (multi-line dialogue).
 * Max line length: 26 chars (fits speech bubble width in 210px sidebar).
 */

export type RobotJoke = string | string[];

export const ROBOT_JOKES: RobotJoke[] = [
  // ── Классика bash.org ──────────────────────────────

  [
    '<r2d2> sudo make me',
    '       a sandwich',
    '<root> ok',
  ],

  [
    '<junior> rm -rf /',
    '<junior> почему всё',
    '         пропало??',
    '<kernel> ...',
  ],

  [
    '<qa> это баг или фича?',
    '<dev> документация',
  ],

  [
    '<boss> сделай до пятницы',
    '<dev> какой пятницы?',
    '<boss> этой',
    '<dev> какого года?',
  ],

  [
    '<noob> как выйти из vim?',
    '<vim> :)',
  ],

  [
    '<user> интернет сломался',
    '<sysadmin> выключи и',
    '  включи роутер',
    '<user> о боже РАБОТАЕТ',
    '<sysadmin> 20 лет в it',
  ],

  // ── Однострочники ──────────────────────────────────

  'работает на моей машине™',

  'segfault — это не баг,\nэто фича ядра',

  '99 багов в коде.\nfix one. 127 bugs.',

  'git blame → это ты',

  'it works in production\n≠ it works',

  '// TODO: fix later\n// later: 3 years ago',

  'есть 10 типов людей:\nте кто понимают binary\nи те кто нет',

  'sudo !! ← лучшая\nкоманда в unix',

  'tabs vs spaces?\nтypeError: cannot\nread life choices',

  'stack overflow:\nкопировать → вставить\n→ молиться',

  'documentation?\nчитай исходники',

  '(╯°□°）╯︵ ┻━┻\ngit merge conflict',

  'grep -r "password"\n./src → oh no',

  'localhost:3000\n≠ production\n(узнал на практике)',

  'chmod 777 .\nсказал джун\nи пошёл домой',

  // ── Космос + выживание (в тему игры) ─────────────

  [
    '<HAL> я не могу',
    '  этого сделать',
    '<crew> sudo HAL open',
    '       the pod bay',
    '<HAL> ...ok fine',
  ],

  'в космосе никто\nне слышит твой\ncoredump',

  'O₂: 38%\ngit push origin\nmain --force',

  [
    'кислород кончается',
    'а ты читаешь\nman страницы',
    'уважаю',
  ],

  'первое правило\nкосмоса: всегда\nделай backup',

  [
    'NOSTROMO-8::',
    '$ uptime',
    '9999 days, load: ☠',
  ],

  // ── IT-мемы эпохи 2000-х ──────────────────────────

  [
    '> have you tried',
    '  turning it off',
    '  and on again?',
    '> это космический',
    '  корабль, HAL',
    '> ...reboot? (y/n)',
  ],

  'Y2K прошёл.\nY3K через 974 года.\nне расслабляйся',

  'internet explorer\nне поддерживается\nдаже в 2157',

  '// это работает\n// не знаю почему\n// не трогать',

  'configure --help\n| grep помогите',

  [
    '$ ping 8.8.8.8',
    'request timeout',
    'request timeout',
    'ну и ладно',
  ],

  'mv legacy.cpp\n   legacy2.cpp\nмодернизация готова',

  [
    'dev: готово',
    'pm: добавь ещё',
    '    одну кнопку',
    'dev: *переписывает*',
    '     *с нуля*',
  ],

  'null pointer\nexception — это\nне я, это вселенная',

  'git commit -m "fix"',

  [
    '$ ls -la /secrets',
    'drwx------ root',
    '$ sudo ls -la',
    'drwx------ root',
    '$ ...уважаю',
  ],

  'bash: command\nnot found: life',

  'alias please="sudo"\nalias пожалуйста=please',

  [
    'junoir: почему',
    '  код не работает?',
    'senior: ты не',
    '  сделал npm i',
    'junior: .......',
  ],
];
