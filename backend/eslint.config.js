import { configApp } from '@adonisjs/eslint-config'

export default [
  ...configApp(),
  {
    // src/ (and its tests/ mirror) intentionally uses kebab-case filenames
    // with DDD-flavored suffixes (*.vo.ts, *.aggregate.ts, *.interface.ts,
    // *.use-case.ts, *.events.ts) per docs/phase-0/01-arborescence.md —
    // AdonisJS's own snake_case convention only applies to its own
    // framework-glue folders (app/, start/, providers/, config/, database/).
    files: [
      'src/**/*.ts',
      'tests/domain/**/*.ts',
      'tests/application/**/*.ts',
      'tests/infrastructure/**/*.ts',
      'tests/presentation/**/*.ts',
    ],
    rules: {
      '@unicorn/filename-case': 'off',
    },
  },
]
