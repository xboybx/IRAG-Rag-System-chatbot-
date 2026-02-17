declare module 'react-syntax-highlighter' {
    import { ComponentType } from 'react';

    export interface SyntaxHighlighterProps {
        language?: string;
        style?: any;
        children: string | string[];
        customStyle?: any;
        codeTagProps?: any;
        useInlineStyles?: boolean;
        showLineNumbers?: boolean;
        showInlineLineNumbers?: boolean;
        startingLineNumber?: number;
        lineNumberContainerStyle?: any;
        lineNumberStyle?: any;
        wrapLines?: boolean;
        wrapLongLines?: boolean;
        lineProps?: any;
        renderer?: any;
        PreTag?: string | ComponentType<any>;
        CodeTag?: string | ComponentType<any>;
        className?: string;
        [key: string]: any;
    }

    export const Prism: ComponentType<SyntaxHighlighterProps>;
    export const Light: ComponentType<SyntaxHighlighterProps>;
    export default Light;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    export const vscDarkPlus: any;
    export const atomDark: any;
    export const base16AteliersulphurpoolLight: any;
    export const cb: any;
    export const coldarkCold: any;
    export const coldarkDark: any;
    export const coy: any;
    export const darcula: any;
    export const dark: any;
    export const dracula: any;
    export const duotoneDark: any;
    export const duotoneEarth: any;
    export const duotoneForest: any;
    export const duotoneLight: any;
    export const duotoneSea: any;
    export const duotoneSpace: any;
    export const funky: any;
    export const ghcolors: any;
    export const hopscotch: any;
    export const materialDark: any;
    export const materialLight: any;
    export const materialOceanic: any;
    export const nord: any;
    export const okaidia: any;
    export const oneDark: any;
    export const oneLight: any;
    export const pojoaque: any;
    export const prism: any;
    export const shadesOfPurple: any;
    export const solarizedlight: any;
    export const synthwave84: any;
    export const tomorrow: any;
    export const twilight: any;
    export const vs: any;
    export const xonokai: any;
}
