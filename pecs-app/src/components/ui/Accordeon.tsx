import { HTMLAttributes, useState } from "react";
import { twMerge } from "tailwind-merge";

type AccordeonProps = HTMLAttributes<HTMLDivElement> & {
    heading: string
};

export function Accordeon({ className, children, heading, ...props }: AccordeonProps) {
    const base = 'm-0 accordeon';
    const [open, setOpen] = useState(true);
    return <>
        <h2 className={twMerge('text-lg font-semibold accordeonTrigger', open ? 'open' : 'closed')} onClick={()=>setOpen(!open)}>{heading}</h2>
        <div className={twMerge(base, open ? 'block' : 'hidden', className)} {...props}>
        {children}
        </div>
        </>;
  }