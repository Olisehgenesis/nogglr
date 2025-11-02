import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Home as HomeIcon, 
  ShoppingCart as ShoppingCartIcon,
  ThumbUp as ThumbUpIcon,
  Share as ShareIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Material Symbols Icon component (your existing one)
const MaterialSymbolIcon = ({ children, className }: { children: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{children}</span>
);

export function IconTestComponent() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Icon Test Component</h1>
      
      {/* Material Symbols (should now work) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Material Symbols (Fixed)</h2>
        <div className="flex gap-4 flex-wrap">
          <Button className="flex items-center gap-2">
            <MaterialSymbolIcon>home</MaterialSymbolIcon>
            <span>Home</span>
          </Button>
          <Button className="flex items-center gap-2">
            <MaterialSymbolIcon>shopping_cart</MaterialSymbolIcon>
            <span>Shopping Cart</span>
          </Button>
          <Button className="flex items-center gap-2">
            <MaterialSymbolIcon>thumb_up</MaterialSymbolIcon>
            <span>Thumb Up</span>
          </Button>
          <Button className="flex items-center gap-2">
            <MaterialSymbolIcon>share</MaterialSymbolIcon>
            <span>Share</span>
          </Button>
          <Button className="flex items-center gap-2">
            <MaterialSymbolIcon>close</MaterialSymbolIcon>
            <span>Close</span>
          </Button>
        </div>
      </div>

      {/* Material UI Icons */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Material UI Icons</h2>
        <div className="flex gap-4 flex-wrap">
          <Button className="flex items-center gap-2">
            <HomeIcon />
            <span>Home</span>
          </Button>
          <Button className="flex items-center gap-2">
            <ShoppingCartIcon />
            <span>Shopping Cart</span>
          </Button>
          <Button className="flex items-center gap-2">
            <ThumbUpIcon />
            <span>Thumb Up</span>
          </Button>
          <Button className="flex items-center gap-2">
            <ShareIcon />
            <span>Share</span>
          </Button>
          <Button className="flex items-center gap-2">
            <CloseIcon />
            <span>Close</span>
          </Button>
        </div>
      </div>

      {/* Mixed Usage Example */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mixed Usage Example</h2>
        <div className="p-4 border rounded-lg bg-white">
          <p className="mb-4">You can now use both icon systems:</p>
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline" className="flex items-center gap-2">
              <MaterialSymbolIcon>auto_awesome</MaterialSymbolIcon>
              <span>Material Symbol</span>
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <HomeIcon />
              <span>Material UI</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
