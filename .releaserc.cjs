// From: https://github.com/asjdf/semantic-release-go-demo
const config = {
    branches: ['main'],
    tagFormat: 'v${version}',
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        [
            '@semantic-release/github',
            {
                successComment: false, // tmp fix https://github.com/semantic-release/github/pull/857
                failComment: false,
                failTitle: false,
            },
        ],
    ],
};

module.exports = config;
