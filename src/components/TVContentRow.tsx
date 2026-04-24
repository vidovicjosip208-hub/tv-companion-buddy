import { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

const TVContentRow = ({ title, children }: Props) => {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-white/80">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">{children}</div>
    </section>
  );
};

export default TVContentRow;
