import { Context, Schema, h, Logger, Random } from 'koishi';
import { } from 'koishi-plugin-canvas';
import { loadBaseImage } from './utils'
import { draw } from './draw'

import fs from 'fs';
import path from 'path';

export const inject = ['canvas']
export const name = 'pjsk-stamp-maker'
const logger = new Logger('pjskstampMaker')
//language=markdown
export const usage = `## 🎮 使用

- 启动 \`canvas\` 服务：\`koishi-plugin-canvas\`（必须用这个喔）。
- 在 \`Koishi\` 默认根目录下，安装 \`./data/pjsk/fonts\` 文件夹内的两个字体。
- 启动插件，使用 \`pjsk.drawList\` 指令生成表情包 ID 列表。

`

export interface Config {
}

export const Config: Schema<Config> = Schema.object({
});

declare module 'koishi' {
  interface User {
    pjskStampId: number
  }
}

export function apply(context: Context, config: Config) {

  context.model.extend('user', {
    'pjskStampId': { type: 'integer', initial: -1 }
  })

  //初始化
  const dependencyPjskDir = path.join(__dirname, '..', 'pjsk')
  const pluginDataDir = path.join(context.baseDir, 'data', 'pjsk')
  // 将资源文件存到data目录下
  fs.cp(dependencyPjskDir,
    pluginDataDir,
    { recursive: true, force: false },
    (err) => {
      if (err) {
        logger.error('复制 pjsk 文件夹出错：' + err.message)
      }
    });

  const baseImages = loadBaseImage(path.join(pluginDataDir, 'baseImage.json'))

  // 底图目录命令
  context.command('pjsk.baseImage [baseImageId:integer]', '切换表情包底图ID')
    .userFields(['pjskStampId'])
    .alias('底图')
    .action(async ({ session }, baseImageId) => {
      // 检查底图ID是否在有效范围内
      const isValidBaseImage = baseImageId >= -1 && baseImageId < baseImages.length;
      if (!isValidBaseImage) {
        await session.send('底图ID无效，请输入有效的底图ID');
        return;
      }
      session.user.pjskStampId = baseImageId;
      await session.send(`已将底图ID设置为 ${baseImageId}`);
    })

  // 绘制图像密令
  context.command('pjsk.draw [inputText:text]', '绘制表情包')
    .shortcut(/^(.+)\.jpg$/, { args: ['$1'] })
    .shortcut(/^(.+)\.jpeg$/, { args: ['$1'] })
    .shortcut(/^(.+)\.png$/, { args: ['$1'] })
    .userFields(['pjskStampId'])
    .action(async ({ session }, inputText) => {
      //如果imputText包括'http'，则直接返回
      if (inputText.includes('http')) {
        return;
      }
      //number是1到300的数字
      const number = Random.int(52, 52)
      //将inputText的'_'替换为' '
      inputText = inputText.replace(/_/g, ' ')

      let baseImageId = session.user.pjskStampId
      // 如果是-1，则随机选择一个表情包
      if (baseImageId === -1) {
        baseImageId = Random.int(0, baseImages.length - 1);
      }
      const buffer = await draw(context, baseImages, inputText, baseImageId);
      await session.send(h.image(buffer, 'image/png'));
    });

  context.command('pjsk.baseImageList', '绘制表情包可用底图列表').action(async ({ session }) => {

    await session.send(' ')
  }

  )
}
