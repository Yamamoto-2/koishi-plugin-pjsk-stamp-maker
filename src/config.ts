import * as path from 'path'

export const dependencyPjskDir = path.join(__dirname, '..', 'pjsk')
//export const pluginDataDir = path.join(context.baseDir, 'data', 'pjsk')

export interface Style {
    position: 'top' | 'bottom' | 'left' | 'right',
    rotate: number,
    curve: boolean,
    textAlign: 'center' | 'left' | 'right',
    textOrientation: 'horizontal' | 'vertical',
    textScreenShare: number
}

export const defaultStyle: object = {
    1: {
        position: 'top',
        rotate: 0,
        curve: true,
        textAlign: 'center',
        textOrientation: 'horizontal',
        textScreenShare: 0.4
    },
    2: {
        position: 'top',
        rotate: 5,
        curve: false,
        textAlign: 'center',
        textOrientation: 'horizontal',
        textScreenShare: 0.4
    },
    3: {
        position: 'top',
        rotate: 0,
        curve: false,
        textAlign: 'center',
        textOrientation: 'horizontal',
        textScreenShare: 0.4
    },
    4: {
        position: 'top',
        rotate: -5,
        curve: false,
        textAlign: 'center',
        textOrientation: 'horizontal',
        textScreenShare: 0.4
    },
    5: {
        position: 'right',
        rotate: 5,
        curve: false,
        textAlign: 'center',
        textOrientation: 'vertical',
        textScreenShare: 0.4
    },
    6: {
        position: 'right',
        rotate: 0,
        curve: false,
        textAlign: 'center',
        textOrientation: 'vertical',
        textScreenShare: 0.4
    },
    7: {
        position: 'right',
        rotate: -5,
        curve: false,
        textAlign: 'center',
        textOrientation: 'vertical',
        textScreenShare: 0.4
    },
    8: {
        position: 'left',
        rotate: 5,
        curve: false,
        textAlign: 'center',
        textOrientation: 'vertical',
        textScreenShare: 0.4
    },
    9: {
        position: 'left',
        rotate: 0,
        curve: false,
        textAlign: 'center',
        textOrientation: 'vertical',
        textScreenShare: 0.4
    },
    10: {
        position: 'left',
        rotate: -5,
        curve: false,
        textAlign: 'center',
        textOrientation: 'vertical',
        textScreenShare: 0.4
    }
}