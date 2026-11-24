// From: https://github.com/asjdf/semantic-release-go-demo
const config = {
    branches: ['main'],
    tagFormat: 'v${version}',
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        // 发版时把插件包打成 tarball，作为 GitHub Release 的附件；不发布到 npm。
        // 产物路径写在这里，@semantic-release/github 以它为 assets 上传。
        './scripts/pack-release',
        [
            '@semantic-release/github',
            {
                // 不在 issue/PR 上留评论、失败时也不自动开 issue，避免刷屏。
                successCommentCondition: '<% return false; %>',
                failCommentCondition: '<% return false; %>',
                assets: [
                    { path: 'dist/dsh-session-read-state-*.tgz', label: 'DeepSeek Harness 插件包（tarball）' },
                ],
            },
        ],
    ],
};

module.exports = config;
