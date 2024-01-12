import { Context, Schema, h, Logger, Random } from 'koishi';
import { } from 'koishi-plugin-canvas';
import { loadBaseImage } from './utils'
import { drawTextOptions, draw } from './draw'

import fs from 'fs';
import path from 'path';

export const inject = ['canvas']
export const name = 'pjsk-stickers-maker'
const logger = new Logger('pjskStickersMaker')
//language=markdown
export const usage = `## 🎮 使用

- 启动 \`canvas\` 服务：\`koishi-plugin-canvas\`（必须用这个喔）。
- 在 \`Koishi\` 默认根目录下，安装 \`./data/pjsk/fonts\` 文件夹内的两个字体。
- 启动插件，使用 \`pjsk.drawList\` 指令生成表情包 ID 列表。
- 建议为指令添加合适的别名。
- 如果想要添加额外的表情包，将图像文件（.png/.jpg/.gif）直接放入 \`./data/pjsk/extraImg\` 文件夹内即可。
- [上学大人的1700+米游社表情包资源下载](https://wwsy.lanzouj.com/ifgjH1jkeoyd)。

## ⚙️ 配置

- \`isSendEmojiIdWhenUndefined\`：是否在未指定表情包ID时发送表情包ID信息，默认为 false。
- \`isSendSpecificContent\`：是否在未定义表情包ID时发送详细的参数教学信息，默认为 false。

## 📝 命令

- \`pjsk\`：查看这个插件的帮助信息，了解如何使用它。

\`\`\`bash
pjsk.draw -n 49 -x -60 -y 120 -r 0 -s 0 -c -w 296 --height 256 --color #ff4757 你好!/6
\`\`\`

- \`pjsk.drawExtra\`：同上。

- \`pjsk.drawList\`：查看所有可用的表情包列表，以及每个表情包的ID。

- \`pjsk.drawListExtra\`：同上。

`

export interface Config {
}

export const Config: Schema<Config> = Schema.object({
});

export function apply(context: Context, config: Config) {

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

  // 定义一个命令“pjsk”，接受一个名为“inputText”的文本参数，用于绘制图像;

  context.command('pjsk.draw [inputText:text]')
    .action(async ({ session }, inputText) => {
      //number是1到300的数字
      const number = Random.int(1, 1)

      // 检查表情包ID是否在有效范围内
      const isValidBaseImage = number >= -1 && number < baseImages.length;
      if (!isValidBaseImage) {
        await session.send('表情包ID无效，请输入有效的表情包ID。');
        return;
      }
      // 随机选择表情包ID
      const baseImageId = number === -1 ? Math.floor(Math.random() * baseImages.length) : number;
      const buffer = await draw(context, inputText, baseImageId);
      await session.send(h.image(buffer, 'image/png'));
    });

  context.command('pjsk.drawList', '绘制表情包列表').action(async ({ session }) => {
    const drawList = async () => {
      const filePath = path.join(pluginDataDir, 'pjskList.png');
      if (fs.existsSync(filePath)) {
        // 如果已存在生成的图片文件，则直接发送
        const buffer = fs.readFileSync(filePath);
        await session.send(h.image(buffer, 'image/png'));
        return
      }
      const imageSize = 100;
      const padding = 10;
      const maxImagesPerRow = 12; // 每行最多绘制 12 个图像对象
      const imagesPerRow = Math.min(maxImagesPerRow, baseImages.length);
      const rowCount = Math.ceil(baseImages.length / imagesPerRow);
      const canvasHeight = rowCount * (imageSize + padding) - padding;

      // 创建画布并获取上下文
      const canvasWidth = imagesPerRow * (imageSize + padding) - padding;
      const canvas = await context.canvas.createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // 设置字体样式和线宽
      const font = `30px 'FOT-Yuruka Std UB', '上首方糖体'`;
      const lineWidth = 9;
      ctx.font = font;
      ctx.lineWidth = lineWidth;
      ctx.textBaseline = 'top';
      ctx.fillStyle = "#ff4757";

      for (let i = 0; i < baseImages.length; i++) {
        const baseImageData = baseImages[i];
        const row = Math.floor(i / imagesPerRow);
        const col = i % imagesPerRow;

        const x = col * (imageSize + padding);
        const y = row * (imageSize + padding);

        const img = await context.canvas.loadImage(path.join(pluginDataDir, 'img', baseImageData.fileDir, baseImageData.fileName));
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        let drawWidth = imageSize;
        let drawHeight = imageSize;

        if (imgWidth > imageSize || imgHeight > imageSize) {
          const aspectRatio = imgWidth / imgHeight;
          if (aspectRatio > 1) {
            drawWidth = imageSize;
            drawHeight = imageSize / aspectRatio;
          } else {
            drawWidth = imageSize * aspectRatio;
            drawHeight = imageSize;
          }
        }

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        // 调整序号的位置和样式
        const textX = x;
        const textY = y;
        ctx.fillText(i.toString(), textX, textY);
      }

      const buffer = await canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      await session.send(h.image(buffer, 'image/png'));
    };

    await drawList();
  });

}
