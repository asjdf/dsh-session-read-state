// 每次发布把插件包打成 tarball，作为 GitHub Release 的附件。
// 不走 npm 源：`npm pack` 只按 package.json 的 files 生成本地产物。
// 作为 publish 步骤运行，返回 @semantic-release/github 能上传的资产描述。
module.exports = async (pluginConfig, context) => {
    const { execFileSync } = require('node:child_process');
    const path = require('node:path');
    const fs = require('node:fs');

    const dist = path.join(context.cwd, 'dist');
    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(dist, { recursive: true });

    const output = execFileSync(
        'npm',
        ['pack', '--json', '--pack-destination', dist, '--workspace', 'packages/dsh-session-read-state'],
        { cwd: context.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const [packed] = JSON.parse(output);
    context.logger.log(`Packed ${packed.filename} (${packed.size} bytes)`);

    return {
        name: packed.filename,
        path: path.join(dist, packed.filename),
    };
};
