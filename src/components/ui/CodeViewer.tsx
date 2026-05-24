import Editor from "@monaco-editor/react";

type CodeViewerProps = {
    value: string;
    onChange: (value: string) => void;
    language?: string;
};

export function CodeViewer({ value, onChange, language = "ini" }: CodeViewerProps) {
    return (
        <div className="relative flex-1 overflow-hidden rounded-lg border border-zinc-800 text-sm">
            <Editor
                height="100%"
                defaultLanguage={language}
                theme="vs-dark"
                value={value}
                onChange={(nextValue) => onChange(nextValue || "")}
                options={{
                    readOnly: false,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    wordWrap: "off",
                    padding: { top: 16 },
                    hover: { enabled: false },
                }}
                loading={<div className="flex justify-center pt-10 text-zinc-500">Loading editor...</div>}
            />
        </div>
    );
}
