import { Context } from "koishi";
import * as path from "path";
import { loadBaseImage, baseImage } from "./utils";
import { Style, defaultStyle, } from "./config";

export interface drawTextOptions extends Style {
    color: string,
}

export async function drawBaseImageList(koishiContext: Context, baseImages: baseImage[]) {
    async function drawBaseImageInList(BaseImageId: number) {
        const canvasWidth = 100;
        const canvasHeight = 150;
        const canvas = await koishiContext.canvas.createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        //获取底图
        const stampBuffer = await draw(koishiContext, baseImages, '测试用文本\n测试用', BaseImageId);
        const stampImage = (await koishiContext.canvas.loadImage(stampBuffer))
        //宽度固定为100，高度自适应
        const stampImageWidth = 100;
        const stampImageHeight = stampImage['height'] / stampImage['width'] * stampImageWidth;
        //画在距离顶部30px的位置
        ctx.drawImage(stampImage, 0, 30, stampImageWidth, stampImageHeight);
        //写底图ID再下方，50px字体
        const baseImageIdText = `ID: ${BaseImageId}`;
        ctx.font = `20px '荆南波波黑', 'Microsoft YaHei'`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#505050';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.textBaseline = 'top';
        ctx.save();

        ctx.strokeText(baseImageIdText, 50, 5);
        ctx.fillText(baseImageIdText, 50, 5);

        //加一个宽度1像素的描边
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#505050';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 150);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(100, 150);
        ctx.lineTo(0, 150);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(100, 150);
        ctx.lineTo(100, 0);
        ctx.stroke();
        return canvas.toBuffer('image/png');
    }
    //每一种fileDir为一行，计算出每一行的宽度，然后根据宽度和高度绘制
    let maxWidth = 0;
    let tempWidth = 0;
    let fileDirCount = 0;
    for (let i = 0; i < baseImages.length; i++) {
        if (baseImages[i].fileDir != baseImages[i - 1]?.fileDir && i != 0) {
            fileDirCount++;
            maxWidth = Math.max(maxWidth, tempWidth);
            tempWidth = 0;
        } else {
            tempWidth += 100;
        }
    }

    //绘制
    const canvasWidth = maxWidth;
    const canvasHeight = fileDirCount * 150;
    const canvas = await koishiContext.canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    let currentXCount = 0;
    let currentYCount = 0;
    for (let i = 0; i < baseImages.length; i++) {
        const baseImageData = baseImages[i];
        const stampBuffer = await drawBaseImageInList(i);
        const stampImage = (await koishiContext.canvas.loadImage(stampBuffer))
        //宽度固定为100，高度自适应
        const stampImageWidth = 100;
        const stampImageHeight = stampImage['height'] / stampImage['width']* stampImageWidth;
        if (baseImages[i].fileDir != baseImages[i - 1]?.fileDir && i != 0) {
            currentXCount = 0;
            currentYCount += 1;
        }
        const x = currentXCount * 100;
        const y = currentYCount * 150;
        ctx.drawImage(stampImage, x, y);
        currentXCount += 1;
    }
    return canvas.toBuffer('image/png')
}

let baseImageCache: object = {}
async function loadBaseImageById(koishiContext: Context, baseImages: baseImage[], baseImageId: number) {
    if (!baseImageCache[baseImageId]) {
        const baseImageData = baseImages[baseImageId];
        const img = (await koishiContext.canvas.loadImage(path.join(koishiContext.baseDir, 'data', 'pjsk', 'img', baseImageData.fileDir, baseImageData.fileName))) as any;
        baseImageCache[baseImageId] = img;
    }
    return baseImageCache[baseImageId];
}

export async function draw(context: Context, baseImages: baseImage[], inputText: string, baseImageId: number) {
    const pluginDataDir = path.join(context.baseDir, 'data', 'pjsk')
    // 随机选择表情包ID
    const baseImageData = baseImages[baseImageId];

    const img = await loadBaseImageById(context, baseImages, baseImageId);

    const canvasWidth = img.width * 1.5;
    const canvasHeight = img.height * 1.25;
    // 创建画布
    const canvas = await context.canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    //居中绘制底图
    ctx.drawImage(img, (canvasWidth - img.width) / 2, (canvasHeight - img.height) / 2, img.width, img.height);
    const style: Style = defaultStyle[baseImageData.defaultStyleId.toString()];


    let drawTextOptions = {
        position: style.position,
        rotate: style.rotate,
        curve: style.curve,
        textAlign: style.textAlign,
        textOrientation: style.textOrientation,
        textScreenShare: style.textScreenShare,
        color: baseImageData.color,
    }
    let textBuffer: Buffer
    if (drawTextOptions.curve && drawTextOptions.textOrientation === 'horizontal') {
        textBuffer = await drawTextWithCurve(context, inputText, drawTextOptions);
    } else {
        textBuffer = await drawTextWithoutCurve(context, inputText, drawTextOptions);
    }
    const textCanvas = (await context.canvas.loadImage(textBuffer))
    const textCanvasWidth = textCanvas['width'];
    const textCanvasHeight = textCanvas['height'];

    //根据position,rotate,将textCanvas绘制到canvas上,比如上方，最多占用textScreenShare比例，左右居中，不超出边界的情况下自适应缩放
    if (drawTextOptions.position === 'top' || drawTextOptions.position === 'bottom') {

        //确定缩放比例
        const scale = Math.min(canvasWidth / textCanvasWidth, canvasHeight / textCanvasHeight * drawTextOptions.textScreenShare);

        const screenShareHeight = canvasHeight * drawTextOptions.textScreenShare;   //占用的高度
        //确定绘制的宽高
        const drawWidth = textCanvasWidth * scale;
        const drawHeight = textCanvasHeight * scale;


        if (drawTextOptions.rotate === 0) {
            //确定绘制的起点
            const drawX = (canvasWidth - drawWidth) / 2;
            const drawY = drawTextOptions.position === 'top' ? 0 : (canvasHeight - drawHeight);
            //绘制
            ctx.drawImage(textCanvas, drawX, drawY, drawWidth, drawHeight);
        }
        else {
            const drawY = drawTextOptions.position === 'top' ? 0 : (canvasHeight - drawHeight);
            // 旋转角度转换为弧度
            const radians = drawTextOptions.rotate * Math.PI / 180;
            if (drawTextOptions.rotate > 0) {
                ctx.translate(0, drawY);
                ctx.rotate(radians);
                ctx.drawImage(textCanvas, 0, 0, drawWidth, drawHeight);
            } else {
                ctx.translate(canvasWidth, drawY);
                ctx.rotate(radians);
                ctx.translate(-drawWidth, 0);
                ctx.drawImage(textCanvas, 0, 0, drawWidth, drawHeight);
            }
        }

    }
    else if (drawTextOptions.position === 'left' || drawTextOptions.position === 'right') {
        //确定缩放比例
        const scale = Math.min(canvasWidth / textCanvasWidth * drawTextOptions.textScreenShare, canvasHeight / textCanvasHeight);
        //确定绘制的宽高
        const drawWidth = textCanvasWidth * scale;
        const drawHeight = textCanvasHeight * scale;

        if (drawTextOptions.rotate === 0) {
            //确定绘制的起点
            const drawX = drawTextOptions.position === 'left' ? 0 : (canvasWidth - drawWidth);
            const drawY = (canvasHeight - drawHeight) / 2;
            //绘制
            ctx.drawImage(textCanvas, drawX, drawY, drawWidth, drawHeight);
        }
        else {
            const drawX = drawTextOptions.position === 'left' ? 0 : (canvasWidth - drawWidth);
            // 旋转角度转换为弧度
            const radians = drawTextOptions.rotate * Math.PI / 180;
            if (drawTextOptions.position === 'left') {
                if (drawTextOptions.rotate > 0) {
                    ctx.translate(drawX, canvasHeight);
                    ctx.rotate(radians);
                    ctx.translate(0, -drawHeight);
                    ctx.drawImage(textCanvas, 0, 0, drawWidth, drawHeight);
                }
                else {
                    ctx.translate(drawX, 0);
                    ctx.rotate(radians);
                    ctx.drawImage(textCanvas, 0, 0, drawWidth, drawHeight);
                }
            }
            else {
                if (drawTextOptions.rotate > 0) {
                    ctx.translate(drawX, 0);
                    ctx.rotate(radians);
                    ctx.drawImage(textCanvas, 0, 0, drawWidth, drawHeight);
                }
                else {
                    ctx.translate(drawX, canvasHeight);
                    ctx.rotate(radians);
                    ctx.translate(0, -drawHeight);
                    ctx.drawImage(textCanvas, 0, 0, drawWidth, drawHeight);
                }
            }
        }
    }
    const buffer = await canvas.toBuffer('image/png');
    return buffer;
}

export async function drawTextWithoutCurve(koishiContext: Context,
    text: string,
    {
        color = '#1b1b1b',
        textAlign = 'center',
        textOrientation = 'horizontal'
    }: drawTextOptions): Promise<Buffer> {
    const fontSize = 100;
    const lineHeight = 0.95;//行高
    const lineWidth = 20;//描边宽度

    // tempCanvas 用于获取文本的宽度
    const tempCanvas = await koishiContext.canvas.createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${fontSize}px '荆南波波黑', 'Microsoft YaHei'`;

    // 按行分割文本
    const lines = text.split('\n');


    // 计算最终画布的宽高
    let maxWidth: number = 0;
    let maxHeight: number = 0;

    if (textOrientation === 'horizontal') {
        for (let line of lines) {
            const { width } = tempCtx.measureText(line);
            maxWidth = Math.max(maxWidth, width);
            maxHeight += fontSize * lineHeight;
        }
        //加上描边的宽度，防止文字被裁剪
        maxWidth += lineWidth * 2;
        maxHeight += lineWidth * 2;
    }
    else {
        for (let line of lines) {
            const height = fontSize * line.length;
            maxHeight = Math.max(maxHeight, height);
        }
        maxWidth = fontSize * lines.length * lineHeight;
        //加上描边的宽度，防止文字被裁剪
        maxWidth += lineWidth * 2;
        maxHeight += lineWidth * 2;
    }

    // 创建画布
    const canvas = await koishiContext.canvas.createCanvas(maxWidth, maxHeight);
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px '荆南波波黑', 'Microsoft YaHei'`;
    ctx.textAlign = textAlign;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.textBaseline = 'top';
    ctx.save();


    if (textOrientation === 'horizontal') {
        //从下向上
        if (textAlign === 'center') {
            ctx.translate(maxWidth / 2, 0);
        } else if (textAlign === 'left') {
            ctx.translate(0 + lineWidth, 0);
        } else if (textAlign === 'right') {
            ctx.translate(maxWidth - lineWidth, 0);
        }
        let currentY = 0;
        for (let line of lines) {
            ctx.strokeText(line, 0, currentY);
            ctx.fillText(line, 0, currentY);
            currentY += fontSize * lineHeight;
        }

    } else if (textOrientation === 'vertical') {
        //从右向左
        let currentY = 0;
        let currentX = maxWidth;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        for (let line of lines) {
            if (textAlign === 'center') {
                //根据文字的长度，计算出文字的起点
                currentY = (maxHeight - lineWidth - line.length * fontSize) / 2;
            }
            if (textAlign === 'left') {
                currentY = 0;
            }
            if (textAlign === 'right') {
                //根据文字的长度，计算出文字的起点
                currentY = maxHeight - lineWidth - line.length * fontSize;
            }
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // 处理中文标点符号的特殊情况
                if ('，。；？！、'.includes(char)) {
                    ctx.strokeText(char, currentX - fontSize / 2, currentY);
                    ctx.fillText(char, currentX - fontSize / 2, currentY);
                    currentY += fontSize; // 下一个字符的y坐标
                } else {
                    ctx.strokeText(char, currentX, currentY);
                    ctx.fillText(char, currentX, currentY);
                    currentY += fontSize; // 下一个字符的y坐标
                }
            }
            currentX -= fontSize * lineHeight;
        }
    }
    return canvas.toBuffer('image/png');
}

export async function drawTextWithCurve(koishiContext: Context, text: string, {
    color = '#1b1b1b',
    textAlign = 'center',
}: drawTextOptions): Promise<Buffer> {
    const fontSize = 100;
    const lineHeight = 0.95;//行高
    const lineWidth = 20;//描边宽度

    const curveAngle = Math.PI / 4;//弧度

    // tempCanvas 用于获取文本的宽度
    const tempCanvas = await koishiContext.canvas.createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${fontSize}px '荆南波波黑', 'Microsoft YaHei'`;

    // 按行分割文本
    const lines = text.split('\n');

    //确定文本的最大宽度
    let textMaxWidth = 0;
    for (let line of lines) {
        const { width } = tempCtx.measureText(line);
        textMaxWidth = Math.max(textMaxWidth, width);
    }
    //弧长等于文本的最大宽度
    const arcLength = textMaxWidth
    //，根据弧长和弧度计算出半径
    const radius = arcLength / curveAngle;
    //计算弦长
    const chordLength = radius * Math.sin(curveAngle / 2) * 2;
    //计算弧到弦的最远点垂直距离
    const perpendicularHeight = radius * (1 - Math.cos(curveAngle / 2));



    async function drawTextLine(line: string) {
        // 计算每一行画布的宽高
        const canvasWidth = chordLength + fontSize//加上一个字的宽度，防止文字被裁剪
        const canvasHeight = perpendicularHeight + fontSize + fontSize;

        const canvas = await koishiContext.canvas.createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        ctx.font = `${fontSize}px '荆南波波黑', 'Microsoft YaHei'`;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = lineWidth;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'center';
        ctx.save();

        //计算当前行的最大宽度（弧长）
        const currentTextMaxWidth = ctx.measureText(line).width;

        //前进弧度函数
        function forwardAngle(angle: number) {
            ctx.rotate(angle);
            ctx.translate(radius * Math.sin(angle / 2) * 2, 0);
        }

        //确定起始角度和位置
        let startAngle = -((Math.PI / 2) - ((Math.PI - curveAngle) / 2));
        ctx.translate(fontSize / 2, canvasHeight - fontSize)
        ctx.rotate(startAngle);

        //根据textAlign，确定起始角度和位置
        const angleDiff = (arcLength - currentTextMaxWidth) / radius;
        if (textAlign === 'center') {
            forwardAngle(angleDiff / 2)
        }
        else if (textAlign === 'right') {
            forwardAngle(angleDiff)
        }

        //依次绘制每个字
        for (let char of line) {
            const charWidth = ctx.measureText(char).width;
            const charAngle = charWidth / arcLength * curveAngle;
            //前进半个字的宽度
            forwardAngle(charAngle / 2)
            //绘制
            ctx.strokeText(char, 0, 0);
            ctx.fillText(char, 0, 0);
            //前进半个字的宽度
            forwardAngle(charAngle / 2)
        }
        return canvas.toBuffer('image/png');
    }

    // 创建画布
    const canvasWidth = chordLength + fontSize//加上一个字的宽度，防止文字被裁剪
    const canvasHeight = perpendicularHeight + fontSize * lineHeight * lines.length + 20;
    const canvas = await koishiContext.canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const textCanvas = await drawTextLine(line);
        ctx.drawImage(await koishiContext.canvas.loadImage(textCanvas), 0, i * (fontSize * lineHeight));
    }
    return canvas.toBuffer('image/png');

}

