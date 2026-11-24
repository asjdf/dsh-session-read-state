module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // semantic-release reads feat/fix/perf and breaking changes; the other
        // types are accepted so ordinary maintenance commits are not refused.
        'type-enum': [
            2,
            'always',
            ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
        ],
        // Uppercase types are a common habit and mean the same thing.
        'type-case': [0],
        // Chinese subjects carry no case the rule could judge.
        'subject-case': [0],
        'header-max-length': [2, 'always', 120],
    },
};
