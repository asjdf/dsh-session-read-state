// 发版时把插件包打成 tarball，作为 GitHub Release 的附件。
// 不经过 npm 源：产物由 `npm pack` 按 package.json 的 files 生成。
// semantic-release 用动态 import 加载本插件，因此这里给出命名导出 publish。
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

exports.publish = async (pluginConfig, context) => {
    const { version, name } = context.nextRelease;
    const dist = path.join(context.cwd, 'dist');
    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(dist, { recursive: true });

    // 包目录里的 version 只有发版后才会被 semantic-release 回写，这里显式对齐，
    // 让附件名、包内版本号与标签一致。
    const packageDir = path.join(context.cwd, 'packages', 'dsh-session-read-state');
    const manifestPath = path.join(packageDir, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const original = fs.readFileSync(manifestPath, 'utf8');
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
    context.logger.log(`Packed ${packed.filename} (${packed.size} bytes) for ${name}@${version}`);

    return {
        name: packed.filename,
        path: path.join(dist, packed.filename),
    };
};
