import * as fs from 'fs';
import * as path from 'path';

const imageFile = '../pjsk/img'

let config = []

// 获取文件夹下所有文件，包括子文件夹
function getFiles(dir) {
    let files = fs.readdirSync(dir);
    let fileList = [];
    files.forEach((item) => {
        let fullPath = path.join(dir, item);
        let stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            fileList = fileList.concat(getFiles(fullPath));
        } else {
            fileList.push(fullPath);
        }
    });
    return fileList;
}

const fileList = getFiles(imageFile)

let id = 0
for (let file of fileList) {
    config.push({
        id: id++,
        color: '#ffffff',
        fileName: path.basename(file),
        //子目录名
        fileDir: path.dirname(file).split(path.sep).pop(),
        defaultStyleId: 0
    })

}
fs.writeFileSync('./config.json', JSON.stringify(config, null, 4))
