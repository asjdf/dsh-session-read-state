// 发版时把插件包打成 tarball，供 GitHub Release 上传为附件。
// 不经过 npm 源：产物由 `npm pack` 按 package.json 的 files 生成。
// semantic-release 用动态 import 加载本插件，因此这里给出命名导出 publish。
// 上传由 @semantic-release/github 的 assets（dist/dsh-session-read-state-*.tgz）完成，
// 本插件只负责在 publish 步骤里先把产物准备好。
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

exports.publish = async (pluginConfig, context) => {
    const { version } = context.nextRelease;
    const dist = path.join(context.cwd, 'dist');
    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(dist, { recursive: true });

    // 包目录里的 version 只会在发版流程最后才被回写，这里临时对齐，
    // 让附件名、包内 version 与标签 vX.Y.Z 一致；打包后立即还原。
    const manifestPath = path.join(context.cwd, 'packages', 'dsh-session-read-state', 'package.json');
    const original = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(original);
    if (manifest.version !== version) {
        fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, version }, null, 2) + '\n');
    }

    let output;
    try {
        output = execFileSync(
            'npm',
            ['pack', '--json', '--pack-destination', dist, '--workspace', 'packages/dsh-session-read-state'],
            { cwd: context.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
    } finally {
        fs.writeFileSync(manifestPath, original);
    }

    const [packed] = JSON.parse(output);
    const produced = path.join(dist, packed.filename);
    if (!fs.existsSync(produced)) {
        throw new Error(`pack-release: npm pack reported ${packed.filename} but wrote nothing to ${dist}`);
    }
    context.logger.log(`Packed ${packed.filename} (${packed.size} bytes) for v${version}`);
};
