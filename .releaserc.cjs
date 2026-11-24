// From: https://github.com/asjdf/semantic-release-go-demo
const config = {
    branches: ['main'],
    tagFormat: 'v${version}',
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        // 发版时把插件包打成 tarball，作为 GitHub Release 的附件；不发布到 npm。
        './scripts/pack-release',
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
