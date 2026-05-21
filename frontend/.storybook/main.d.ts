import type { UserConfig } from 'vite';
declare const config: {
    stories: string[];
    addons: string[];
    framework: {
        name: string;
        options: {};
    };
    docs: {
        autodocs: string;
    };
    staticDirs: string[];
    outDir: string;
    viteFinal(config: UserConfig): Promise<UserConfig>;
};
export default config;
