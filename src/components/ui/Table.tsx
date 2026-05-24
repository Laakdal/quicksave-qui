import React from "react";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    containerClassName?: string;
    showWrapper?: boolean;
}

export const Table = ({ className, children, containerClassName, showWrapper = true, ...props }: TableProps) => {
    const tableElement = (
        <table className={`w-full border-collapse text-left text-sm ${className || ""}`} {...props}>
            {children}
        </table>
    );

    if (!showWrapper) return tableElement;

    return (
        <div 
            className={`overflow-hidden rounded-xl border ${containerClassName || ""}`} 
            style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
        >
            {tableElement}
        </div>
    );
};

export const TableHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={className} {...props}>
        {children}
    </thead>
);

export const TableBody = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={className} {...props}>
        {children}
    </tbody>
);

export const TableRow = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
        className={`transition-colors hover:bg-zinc-500/5 ${className || ""}`}
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
        {...props}
    >
        {children}
    </tr>
);

export const TableHead = ({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className={`px-4 py-3 font-semibold ${className || ""}`} style={{ color: "var(--text-primary)" }} {...props}>
        {children}
    </th>
);

export const TableCell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className={`px-4 py-4 ${className || ""}`} {...props}>
        {children}
    </td>
);
