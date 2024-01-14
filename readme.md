# koishi-plugin-pjsk-stamp-maker
[![npm](https://img.shields.io/npm/v/koishi-plugin-pjsk-stamp-maker?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-pjsk-stamp-maker)

## 📦 安装
```
前往 Koishi 插件市场添加该插件即可
```
## ⚙️ 配置

- `isSendEmojiIdWhenUndefined`：是否在未指定表情包ID时发送表情包ID信息，默认为 false。
- `isSendSpecificContent`：是否在未定义表情包ID时发送详细的参数教学信息，默认为 false。

## 🎮 使用

### 步骤
1. 启动 canvas 服务：使用 koishi-plugin-canvas 插件（必须使用此插件）。
2. 在 Koishi 默认根目录下，安装 ./data/pjsk/fonts 文件夹内的两个字体。
3. 启动插件，并使用 pjsk.baseImageList 指令生成表情包 ID 列表。

### 补充机制
- 可以使用 文本.jpg、文本.jpeg 或 文本.png 来触发绘制，例如：喵喵喵.jpg。
- 当底图设置为 -1 时，将会随机挑选底图进行绘制。

### 可能的问题解决办法
由于 Koishi 的 canvas 服务由多个插件提供，例如 puppeteer 和 canvas（本插件使用的服务），它们之间可能会产生冲突。

> 冲突的可能解决办法：先关闭两个服务，然后打开 canvas 服务，再打开 puppeteer 服务。

## 🙏 致谢

感谢以下项目和资源的支持和帮助：

- [上学大人](https://www.npmjs.com/~shangxue) - 一个严肃的 ...？(e)
- [Koishi](https://koishi.chat/) - 一个灵活且强大的机器人框架
- [st.ayaka.one](https://st.ayaka.one/) - 一个提供 Project SEKAI 表情包的网站
- [Project SEKAI COLORFUL STAGE!](https://pjsekai.sega.jp/) - 一个充满魅力的音乐游戏
- [yunkuangao](https://github.com/yunkuangao) - `pjsk` 文件移动指导 修复若干 bugs ...（谢谢云哥喵 ~）
- [sekai-stickers](https://github.com/TheOriginalAyaka/sekai-stickers) - 一个提供 Project SEKAI 表情包的仓库

## 📄 License

MIT License © 2023
