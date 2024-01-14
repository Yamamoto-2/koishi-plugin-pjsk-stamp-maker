import { Context, Schema, h, Logger, Random } from 'koishi';
import { } from 'koishi-plugin-canvas';
import { baseImage, loadBaseImage } from './utils'
import { draw, drawBaseImageList } from './draw'

import fs from 'fs';
import path from 'path';

export const inject = ['canvas']
export const name = 'pjsk-stamp-maker'
const logger = new Logger('pjskstampMaker')
//language=markdown
export const usage = `## 🎮 使用

- 启动 \`canvas\` 服务：\`koishi-plugin-canvas\`（必须用这个喔）。
- 在 \`Koishi\` 默认根目录下，安装 \`./data/pjsk/fonts\` 文件夹内的两个字体。
- 启动插件，使用 \`pjsk.baseImageList\` 指令生成表情包 ID 列表。

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

  //拓展user表
  context.model.extend('user', {
    'pjskStampId': { type: 'integer', initial: -1 }
  })

  const dependencyPjskDir = path.join(__dirname, '..', 'pjsk')
  const pluginDataDir = path.join(context.baseDir, 'data', 'pjsk')
  let baseImages: baseImage[] = []
  //初始化
  async function copyFile() {
    // 将资源文件存到data目录下
    fs.cp(dependencyPjskDir,
      pluginDataDir,
      { recursive: true, force: false },
      (err) => {
        if (err) {
          logger.error('复制 pjsk 文件夹出错：' + err.message)
        }
      }
    )
  }
  copyFile().then(() => {
    baseImages = loadBaseImage(path.join(pluginDataDir, 'baseImage.json'))
  })

  // 底图目录命令
  context.command('pjsk.baseImage [baseImageId:integer]', '切换表情包底图ID')
    .userFields(['pjskStampId'])
    .alias('底图')
    .example(`'底图 52' 切换使用底52号底图绘制表情包\n底图列表请使用指令 '底图目录'或'底图列表'`)
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
  context.command('pjsk.draw <inputText:text>', '绘制表情包')
    .shortcut(/^([\s\S]+)\.jpg$/gm, { args: ['$1'] })
    .shortcut(/^([\s\S]+)\.jpeg$/gm, { args: ['$1'] })
    .shortcut(/^([\s\S]+)\.png$/gm, { args: ['$1'] })
    .example(`'Wonderhoi!.jpg' 或 'pjsk draw Wonderhoi!.jpg'`)
    .userFields(['pjskStampId'])
    .action(async ({ session }, inputText) => {
      if(inputText === undefined){
        session.send('参数输入无效。')
        return
      }
      //如果imputText包括'http'，则直接返回
      if (inputText.includes('http')) {
        return;
      }
      //将inputText的'_'替换为' '
      inputText = inputText.replace(/_/g, ' ')
      console.log(inputText)
      let baseImageId = session.user.pjskStampId
      // 如果是-1，则随机选择一个表情包
      if (baseImageId === -1) {
        baseImageId = Random.int(0, baseImages.length - 1);
      }
      const buffer = await draw(context, baseImages, inputText, baseImageId);
      await session.send(h.image(buffer, 'image/png'));
    });

  context.command('pjsk.baseImageList', '绘制表情包可用底图列表')
    .alias('底图目录')
    .alias('底图列表')
    .action(async ({ session }) => {
      //检查是否有缓存
      if (fs.existsSync(path.join(pluginDataDir, 'baseImageList.png'))) {
        await session.send(h.image(fs.readFileSync(path.join(pluginDataDir, 'baseImageList.png')), 'image/png'));
        return;
      }
      else {
        const buffer = await drawBaseImageList(context, baseImages);
        fs.writeFileSync(path.join(pluginDataDir, 'baseImageList.png'), buffer)
        await session.send(h.image(buffer, 'image/png'));
        return;
      }
    }
    )
}
