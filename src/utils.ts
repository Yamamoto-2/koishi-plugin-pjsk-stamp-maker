import * as fs from 'fs';
import * as path from 'path';

interface Config {
    id: number;
    color: string;
    fileName: string;
    fileDir: string;
    defaultStyleId: number;
}

export function loadBaseImage(configPath: string): Config[] {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config;
    }
    catch (e) {
        console.log('config.json 文件格式错误');
        return [];
    }
}

// 验证颜色有效性的函数
export function isValidColor(color) {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
}