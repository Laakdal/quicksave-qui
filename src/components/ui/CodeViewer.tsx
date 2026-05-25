import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

self.MonacoEnvironment = {
    getWorker() {
        return new editorWorker();
    },
};

loader.config({ monaco });

type CodeViewerProps = {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    height?: string | number;
    className?: string;
    minimap?: boolean;
};

export function CodeViewer({ value, onChange, language = "ini", height = "100%", className = "", minimap = false }: CodeViewerProps) {
    return (
        <div className={`relative w-full overflow-hidden rounded-lg border border-zinc-800 text-sm ${className}`}>
            <Editor
                height={height}
                defaultLanguage={language}
                theme="vs-dark"
                value={value}
                onChange={(nextValue) => onChange(nextValue || "")}
                options={{
                    readOnly: false,
                    minimap: { enabled: minimap },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    wordWrap: "off",
                    padding: { top: 16 },
                    hover: { enabled: false },
                    automaticLayout: true,
                }}
                loading={<div className="flex justify-center pt-10 text-zinc-500">Loading editor...</div>}
            />
        </div>
    );
}
