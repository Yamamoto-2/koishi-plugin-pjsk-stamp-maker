import { Context } from "koishi";
import * as path from "path";
import { loadBaseImage } from "./utils";
import { Style, defaultStyle } from "./config";

export interface drawTextOptions extends Style {
    color: string,
}

export async function draw(context: Context, inputText: string, baseImageId: number) {
    const pluginDataDir = path.join(context.baseDir, 'data', 'pjsk')
    const baseImages = loadBaseImage(path.join(pluginDataDir, 'baseImage.json'))
    // 随机选择表情包ID
    const baseImageData = baseImages[baseImageId];

    const img = (await context.canvas.loadImage(path.join(pluginDataDir, 'img', baseImageData.fileDir, baseImageData.fileName))) as any;

    const canvasWidth = img.width;
    const canvasHeight = img.height;
    const canvas = await context.canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvasWidth, canvasHeight);

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
    const textCanvasWidth = textCanvas.width;
    const textCanvasHeight = textCanvas.height;

    //根据position,rotate,将textCanvas绘制到canvas上,比如上方，最多占用textScreenShare比例，左右居中，不超出边界的情况下自适应缩放
    if (drawTextOptions.position === 'top' || drawTextOptions.position === 'bottom') {

        //确定缩放比例
        const scale = Math.min(canvasWidth / textCanvasWidth, canvasHeight / textCanvasHeight * drawTextOptions.textScreenShare);
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
            // 旋转角度转换为弧度
            const radians = drawTextOptions.rotate * Math.PI / 180;

            //旋转后不超出画面的向下平移，确定旋转后图形中点位置
            const centerX = canvasWidth / 2;
            if(drawTextOptions.position === 'top'){
                const centerY = canvasWidth / 2 * Math.sin(radians)
                ctx.translate(centerX, centerY);
            }
            else{
                const centerY = canvasHeight - canvasWidth / 2 * Math.sin(radians)
                ctx.translate(centerX, centerY);
            }
            //旋转
            ctx.rotate(radians);
            //确定绘制的起点
            const drawX = -drawWidth / 2;
            const drawY = drawTextOptions.position === 'top' ? 0 : -drawHeight;
            //绘制
            ctx.drawImage(textCanvas, drawX, drawY, drawWidth, drawHeight);
        }

    }
    else if(drawTextOptions.position === 'left' || drawTextOptions.position === 'right'){
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
            // 旋转角度转换为弧度
            const radians = drawTextOptions.rotate * Math.PI / 180;

            //旋转后不超出画面的向下平移，确定旋转后图形中点位置
            const centerY = canvasHeight / 2;
            if(drawTextOptions.position === 'left'){
                const centerX = canvasHeight / 2 * Math.sin(radians)
                ctx.translate(centerX, centerY);
            }
            else{
                const centerX = canvasWidth - canvasHeight / 2 * Math.sin(radians)
                ctx.translate(centerX, centerY);
            }
            //旋转
            ctx.rotate(radians);
            //确定绘制的起点
            const drawX = drawTextOptions.position === 'left' ? 0 : -drawWidth;
            const drawY = -drawHeight / 2;
            //绘制
            ctx.drawImage(textCanvas, drawX, drawY, drawWidth, drawHeight);
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
    const lineHeight = 0.85;//行高
    const lineWidth = 20;//描边宽度

    // tempCanvas 用于获取文本的宽度
    const tempCanvas = await koishiContext.canvas.createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${fontSize}px 'FOT-Yuruka Std UB', '上首方糖体', 'Microsoft YaHei'`;

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
            maxHeight = Math.max(maxWidth, height);
        }
        maxWidth = fontSize * lines.length * lineHeight;
        //加上描边的宽度，防止文字被裁剪
        maxWidth += lineWidth * 2;
        maxHeight += lineWidth * 2;
    }

    // 创建画布
    const canvas = await koishiContext.canvas.createCanvas(maxWidth, maxHeight);
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px 'FOT-Yuruka Std UB', '上首方糖体', 'Microsoft YaHei'`;
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
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let line of lines) {
            currentX -= fontSize * lineHeight;
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
        }
    }
    return canvas.toBuffer('image/png');
}


export async function drawTextWithCurve(koishiContext: Context, text: string, {
    color = '#1b1b1b',
    textAlign = 'center',
}: drawTextOptions): Promise<Buffer> {
    const fontSize = 100;
    const lineHeight = 0.85;//行高
    const lineWidth = 20;//描边宽度

    const curveAngle = Math.PI / 4;//弧度

    // tempCanvas 用于获取文本的宽度
    const tempCanvas = await koishiContext.canvas.createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${fontSize}px 'FOT-Yuruka Std UB', '上首方糖体', 'Microsoft YaHei'`;

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
        const canvasHeight = perpendicularHeight + fontSize * lineHeight + fontSize;

        const canvas = await koishiContext.canvas.createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        ctx.font = `${fontSize}px 'FOT-Yuruka Std UB', '上首方糖体', 'Microsoft YaHei'`;
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
        const angleDiff = (arcLength - currentTextMaxWidth) / 2 / radius;
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
    const canvasHeight = perpendicularHeight + fontSize * lines.length * lineHeight + 20;
    const canvas = await koishiContext.canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const textCanvas = await drawTextLine(line);
        ctx.drawImage(await koishiContext.canvas.loadImage(textCanvas), 0, i * (fontSize * lineHeight));
    }
    return canvas.toBuffer('image/png');

}

