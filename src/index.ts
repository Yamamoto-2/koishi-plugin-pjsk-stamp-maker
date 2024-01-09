import { Context, Schema, h, Logger } from 'koishi';
import { } from 'koishi-plugin-canvas';
import { baseImages } from './config';

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

- \`pjsk.draw -n [number:number] -y [positionY:number] -x [positionX:number] -r [rotate:number] -s [fontSize:number] -c [curve:boolean] -w [weight:number] --height [height:number] --color [color:string] [inputText:text]\`：生成表情包图片，你需要指定一个文本参数，以及一些可选的选项参数（请将选项放在文本参数前面）。
  - \`number\` 是你想要使用的表情包的 ID，你可以使用 \`pjsk.drawList\` 命令来查看所有可用的表情包 ID，默认值是 -1，即随机。
  - \`positionY\` 是文本的垂直位置，可以是正数或负数，越大越靠下，默认值是 0。
  - \`positionX\` 是文本的水平位置，可以是正数或负数，越大越靠右，默认值是 0。
  - \`rotate\` 是文本的旋转角度，可以是正数或负数，越大越顺时针旋转，默认值是 0。
  - \`fontSize\` 是文本字体的大小，可以是正数或负数，越大字体越大，默认值是 0。
  - \`curve\` 是是否启用文本曲线效果，可以是 true 或 false，默认值是 false。
  - \`weight\` 是画布尺寸的宽度，可以是正数或负数，越大字体越大，默认值是 296。
  - \`height\` 是画布尺寸的高度，可以是正数或负数，越大字体越大，默认值是 256。
  - \`color\` 是文本字体的颜色，是颜色字符串，例如"#F09A04"，默认值是 ''。
  - \`inputText\` 是你想要显示在表情包上的文本内容，你可以使用斜杠（/）来换行。
  - 例如，你可以输入这样的命令：

\`\`\`bash
pjsk.draw -n 49 -x -60 -y 120 -r 0 -s 0 -c -w 296 --height 256 --color #ff4757 你好!/6
\`\`\`

- \`pjsk.drawExtra\`：同上。

- \`pjsk.drawList\`：查看所有可用的表情包列表，以及每个表情包的ID。

- \`pjsk.drawListExtra\`：同上。

`

export interface Config {
  isSendEmojiIdWhenUndefined
  isSendSpecificContent
}

export const Config: Schema<Config> = Schema.object({
  isSendEmojiIdWhenUndefined: Schema.boolean().default(false).description('是否在未指定表情包ID时发送表情包ID信息。'),
  isSendSpecificContent: Schema.boolean().default(false).description('是否在未指定表情包ID时发送详细的参数教学信息。'),
});

let isImageFilesExist

export function apply(context: Context, config: Config) {

  const { isSendEmojiIdWhenUndefined, isSendSpecificContent } = config
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
  const extraImgDir = path.join(pluginDataDir, 'extraImg');
  checkImageFiles()
  async function checkImageFiles() {
    // 检查 extraImg 文件夹是否存在
    const folderExists = await checkFolderExists(extraImgDir);
    if (!folderExists) {
      // extraImg 文件夹不存在，创建它
      await createFolder(extraImgDir);
      // console.log('已创建 extraImg 文件夹');
    }
    // else {
    //   console.log('extraImg 文件夹已存在');
    // }

    // 检查 extraImg 文件夹中是否存在 PNG 或 GIF 图像文件
    const files = await readFolder(extraImgDir);
    const hasImageFiles = files.some((file) => {
      const extension = path.extname(file).toLowerCase();
      return extension === '.png' || extension === '.gif' || extension === '.jpg';
    });

    // 根据结果设置判断变量的值
    isImageFilesExist = hasImageFiles ? true : false;

    // 在这里可以根据 isImageFilesExist 的值执行相应的操作
    // console.log('是否存在图像文件：', isImageFilesExist);
  }

  function checkFolderExists(folderPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.access(folderPath, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  }

  function createFolder(folderPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(folderPath, { recursive: true }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  function readFolder(folderPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(folderPath, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }

  // 注册字体
  // registerFont('./pjsk/fonts/FOT-Yuruka Std.otf', { family: 'FOT-Yuruka Std UB' });
  // registerFont(path.join(pluginDataDir, 'fonts', 'FOT-Yuruka Std.ttf'), { family: 'FOT-Yuruka Std UB' });
  // registerFont(path.join(pluginDataDir, 'fonts', 'ShangShouFangTangTi-2.ttf'), { family: '上首方糖体' });

  context.command('pjsk', '查看pjsk表情包生成帮助')
    .action(async ({ session }) => {
      await session.execute(`pjsk -h`)
    })

  // 定义一个命令“pjsk”，接受一个名为“inputText”的文本参数，用于绘制图像
  const width = 296;
  const height = 256;

  context.command('pjsk.draw [inputText:text]', '绘制表情包')
    .option('number', '-n [number:number] 表情包ID', { fallback: -1 })
    .option('positionY', '-y [positionY:number] 文本的垂直位置', { fallback: 0 })
    .option('positionX', '-x [positionX:number] 文本的水平位置', { fallback: 0 })
    .option('rotate', '-r [rotate:number] 文本的旋转角度', { fallback: 0 })
    .option('fontSize', '-s [fontSize:number] 文本字体的大小', { fallback: 0 })
    .option('curve', '-c [curve:boolean] 是否启用文本曲线', { fallback: false })
    .option('width', '-w [width:number] 画布的宽度', { fallback: 296 })
    .option('height', '--height [height:number] 画布的高度', { fallback: 256 })
    .option('color', '--color [color:string] 文本的颜色', { fallback: '' })
    .action(async ({ session, options }, inputText) => {
      const {
        number = -1,
        positionY = 0,
        positionX = 0,
        rotate = 0,
        fontSize = 0,
        curve = false,
        width: customWidth = 296,
        height: customHeight = 256,
        color = '',
      } = options;

      // 检查表情包ID是否在有效范围内
      const isValidBaseImage = number >= -1 && number < baseImages.length;
      if (!isValidBaseImage) {
        await session.send('表情包ID无效，请输入有效的表情包ID。');
        return;
      }

      const draw = async () => {
        const canvasWidth = customWidth || width;
        const canvasHeight = customHeight || height;
        const canvas = await context.canvas.createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // 随机选择表情包ID
        const baseImage = number === -1 ? Math.floor(Math.random() * baseImages.length) : number;
        const baseImageData = baseImages[baseImage];
        const { defaultText } = baseImageData;
        let { text, s, x, y, r } = defaultText;

        if (inputText) {
          text = inputText.replace(/\/+/g, '\n');
        }

        const img = (await context.canvas.loadImage(path.join(pluginDataDir, 'img', baseImageData.img))) as any;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvasWidth, canvasHeight);

        const adjustedFontSize = Math.max(1, Math.min(canvasHeight, s + Number(fontSize)));

        const adjustedPositionX = curve ? x + Number(positionX) : Math.max(0, Math.min(canvasWidth, x + Number(positionX)));
        const adjustedPositionY = curve ? y + Number(positionY) : Math.max(0, Math.min(canvasHeight, y + Number(positionY)));
        const adjustedRotate = r + Number(rotate);

        ctx.font = `${adjustedFontSize}px 'FOT-Yuruka Std UB', '上首方糖体'`;
        ctx.lineWidth = 9;
        ctx.save();

        ctx.translate(adjustedPositionX, adjustedPositionY);
        ctx.rotate(adjustedRotate / 10);
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'white';
        ctx.fillStyle = isValidColor(color) ? color : baseImageData.color;

        const lines = text.split('\n');

        if (curve) {
          let angle = (Math.PI * text.length) / 7;
          for (let line of lines) {
            for (let i = 0; i < line.length; i++) {
              ctx.rotate(angle / line.length / 2.5);
              ctx.save();
              ctx.translate(0, -1 * adjustedFontSize * 3.5);
              ctx.strokeText(line[i], 0, 0);
              ctx.fillText(line[i], 0, 0);
              ctx.restore();
            }
          }
        } else {
          let y = 0;
          for (let line of lines) {
            ctx.strokeText(line, 0, y);
            ctx.fillText(line, 0, y);
            y += adjustedFontSize;
          }
        }

        const buffer = await canvas.toBuffer('image/png');
        if (isSendSpecificContent && number === -1) {

          await session.send(`*您已成功绘制了一个pjsk表情包，它的ID是 ${baseImage}。
\`${h.image(buffer, 'image/png')}\`  
*您可以使用以下参数来调整您的表情包:

\`\`\`
-n [number:number] 表情包ID
-y [positionY:number] 文本的垂直位置  
-x [positionX:number] 文本的水平位置
-r [rotate:number] 文本的旋转角度
-s [fontSize:number] 文本字体的大小
-c [curve:boolean] 是否启用文本曲线  
-w [width:number] 画布的宽度
--height [height:number] 画布的高度
--color [color:string] 文本的颜色
\`\`\`

*提示:  
1. 调节参数的时候正负值都可以使用。
2. 你可以使用斜杠(/)来让文本内容换行。 
3. 发送 \`pjsk.drawList\` 可以查看所有可绘制的表情包ID。  
4. 可以同时使用多个参数，例如 \`pjsk.draw -n 49 -x -60 -y 120 -r 0 -s 0 -c -w 296 --height 256 --color #ff4757 你好!/6\`。
`);

        } else if (isSendEmojiIdWhenUndefined && number === -1) {
          await session.send(`*ID: ${baseImage}
${h.image(buffer, 'image/png')}`);
        } else {
          await session.send(h.image(buffer, 'image/png'));
        }


      }
      await draw();
    });

  // 验证颜色有效性的函数
  function isValidColor(color) {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
  }

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

        const img = await context.canvas.loadImage(path.join(pluginDataDir, 'img', baseImageData.img));
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

  if (isImageFilesExist) {
    context.command('pjsk.drawListExtra', '绘制额外表情包列表').action(async ({ session }) => {
      const drawList = async () => {
        const filePath = path.join(pluginDataDir, 'pjskListExtra.png');
        if (fs.existsSync(filePath)) {
          // 如果已存在生成的图片文件，则直接发送
          const buffer = fs.readFileSync(filePath);
          await session.send(h.image(buffer, 'image/png'));
          return
        }
        const imageSize = 100;
        const padding = 10;
        const maxImagesPerRow = 36; // 每行最多绘制 36 个图像对象
        const imagesPerRow = Math.min(maxImagesPerRow, countImageFiles(extraImgDir));
        const rowCount = Math.ceil(countImageFiles(extraImgDir) / imagesPerRow);
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


        // 读取文件夹中的所有文件
        const files = fs.readdirSync(extraImgDir);

        // console.log(files.length)
        // 遍历文件夹中的每个文件
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // 检查文件扩展名是否为png、gif或jpg
          if (file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.jpg')) {
            const row = Math.floor(i / imagesPerRow);
            const col = i % imagesPerRow;

            const x = col * (imageSize + padding);
            const y = row * (imageSize + padding);

            // 构建图像文件的完整路径
            const imagePath = `${extraImgDir}/${file}`;
            const img = await context.canvas.loadImage(imagePath);
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
        }

        const buffer = await canvas.toBuffer('image/png');
        fs.writeFileSync(filePath, buffer);
        await session.send(h.image(buffer, 'image/png'));
      };

      await drawList();
    });

    context.command('pjsk.drawExtra [inputText:text]', '绘制额外表情包')
      .option('number', '-n [number:number] 表情包ID', { fallback: -1 })
      .option('positionY', '-y [positionY:number] 文本的垂直位置', { fallback: 0 })
      .option('positionX', '-x [positionX:number] 文本的水平位置', { fallback: 0 })
      .option('rotate', '-r [rotate:number] 文本的旋转角度', { fallback: 0 })
      .option('fontSize', '-s [fontSize:number] 文本字体的大小', { fallback: 0 })
      .option('curve', '-c [curve:boolean] 是否启用文本曲线', { fallback: false })
      .option('width', '-w [width:number] 画布的宽度', { fallback: 296 })
      .option('height', '--height [height:number] 画布的高度', { fallback: 256 })
      .option('color', '--color [color:string] 文本的颜色', { fallback: '' })
      .action(async ({ session, options }, inputText) => {
        const {
          number = -1,
          positionY = 0,
          positionX = 0,
          rotate = 0,
          fontSize = 0,
          curve = false,
          width: customWidth = 296,
          height: customHeight = 256,
          color = '',
        } = options;

        // 检查表情包ID是否在有效范围内
        const isValidBaseImage = number >= -1 && number < countImageFiles(extraImgDir);
        if (!isValidBaseImage) {
          await session.send('表情包ID无效，请输入有效的表情包ID。');
          return;
        }

        // 读取文件夹中的所有文件
        const files = fs.readdirSync(extraImgDir);

        const draw = async () => {
          const canvasWidth = customWidth || width;
          const canvasHeight = customHeight || height;
          const canvas = await context.canvas.createCanvas(canvasWidth, canvasHeight);
          const ctx = canvas.getContext('2d');

          // 随机选择表情包ID
          const baseImage = number === -1 ? Math.floor(Math.random() * countImageFiles(extraImgDir)) : number;
          let text = 'something'
          let s = 47
          let x = 148
          let y = 58
          let r = -2
          function generateRandomColor(): string {
            // 生成随机的 RGB 值
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);

            // 将 RGB 值转换成十六进制形式的颜色字符串
            const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

            return color;
          }
          // 生成随机颜色
          let randomColor = generateRandomColor();
          if (inputText) {
            text = inputText.replace(/\/+/g, '\n');
          }

          if (color) {
            randomColor = color
          }
          const imagePath = `${extraImgDir}/${files[baseImage]}`;
          const img = (await context.canvas.loadImage(imagePath)) as any;

          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvasWidth, canvasHeight);

          const adjustedFontSize = Math.max(1, Math.min(canvasHeight, s + Number(fontSize)));

          const adjustedPositionX = curve ? x + Number(positionX) : Math.max(0, Math.min(canvasWidth, x + Number(positionX)));
          const adjustedPositionY = curve ? y + Number(positionY) : Math.max(0, Math.min(canvasHeight, y + Number(positionY)));
          const adjustedRotate = r + Number(rotate);

          ctx.font = `${adjustedFontSize}px 'FOT-Yuruka Std UB', '上首方糖体'`;
          ctx.lineWidth = 9;
          ctx.save();

          ctx.translate(adjustedPositionX, adjustedPositionY);
          ctx.rotate(adjustedRotate / 10);
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'white';
          ctx.fillStyle = isValidColor(color) ? color : randomColor;

          const lines = text.split('\n');

          if (curve) {
            let angle = (Math.PI * text.length) / 7;
            for (let line of lines) {
              for (let i = 0; i < line.length; i++) {
                ctx.rotate(angle / line.length / 2.5);
                ctx.save();
                ctx.translate(0, -1 * adjustedFontSize * 3.5);
                ctx.strokeText(line[i], 0, 0);
                ctx.fillText(line[i], 0, 0);
                ctx.restore();
              }
            }
          } else {
            let y = 0;
            for (let line of lines) {
              ctx.strokeText(line, 0, y);
              ctx.fillText(line, 0, y);
              y += adjustedFontSize;
            }
          }

          const buffer = await canvas.toBuffer('image/png');
          if (isSendSpecificContent && number === -1) {

            await session.send(`*您已成功绘制了一个额外表情包，它的ID是 ${baseImage}。
\`${h.image(buffer, 'image/png')}\`  
*您可以使用以下参数来调整您的表情包:

\`\`\`
-n [number:number] 表情包ID
-y [positionY:number] 文本的垂直位置  
-x [positionX:number] 文本的水平位置
-r [rotate:number] 文本的旋转角度
-s [fontSize:number] 文本字体的大小
-c [curve:boolean] 是否启用文本曲线  
-w [width:number] 画布的宽度
--height [height:number] 画布的高度
--color [color:string] 文本的颜色
\`\`\`

*提示:  
1. 调节参数的时候正负值都可以使用。
2. 你可以使用斜杠(/)来让文本内容换行。 
3. 发送 \`pjsk.drawListExtra\` 可以查看所有可绘制的表情包ID。  
4. 可以同时使用多个参数，例如 \`pjsk.drawExtra -n 49 -x -60 -y 120 -r 0 -s 0 -c -w 296 --height 256 --color #ff4757 你好!/6\`。
`);

          } else if (isSendEmojiIdWhenUndefined && number === -1) {
            await session.send(`*ID: ${baseImage}
${h.image(buffer, 'image/png')}`);
          } else {
            await session.send(h.image(buffer, 'image/png'));
          }


        }
        await draw();
      });
  }

  function countImageFiles(folderPath: string): number {
    let count = 0;

    // 读取文件夹中的所有文件
    const files = fs.readdirSync(folderPath);

    // 遍历文件夹中的每个文件
    files.forEach((file) => {
      // 检查文件扩展名是否为png、gif或jpg
      if (file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.jpg')) {
        count++;
      }
    });

    return count;
  }
}
