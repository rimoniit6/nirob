import { Feather } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';

export function Logo({ className }: { className?: string }) {
  const { shopInfo } = useAppContext();
  
  return (
    <div className={cn("flex items-center gap-2 font-bold text-lg", className)}>
      <div className="bg-primary text-primary-foreground p-1.5 rounded-md flex items-center justify-center">
        {shopInfo.logo ? (
            <img src={shopInfo.logo} alt="Shop Logo" className="h-5 w-5 object-contain" />
        ) : (
            <Feather className="h-5 w-5" />
        )}
      </div>
      <h1 className="font-headline text-xl truncate group-data-[collapsible=icon]:hidden">{shopInfo.name}</h1>
    </div>
  )
}
