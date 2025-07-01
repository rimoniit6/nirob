import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8", className)} {...props}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center space-x-2">{children}</div>}
    </div>
  );
}
