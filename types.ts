
export enum ElementType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  STICKER = 'STICKER',
}

export interface PageElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  rotation?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  zIndex: number;
}

export interface Spread {
  id: string;
  leftPageElements: PageElement[];
  rightPageElements: PageElement[];
  label: string;
  background?: string; // Color or Gradient
  backgroundImage?: string; // Image URL
  backgroundOpacity?: number; // 0 to 1
}

export type SidebarTab = 'images' | 'cover' | 'pages' | 'background' | 'text';

export interface AppState {
  spreads: Spread[];
  activeSpreadIndex: number;
  selectedElementId: string | null;
  zoom: number;
}
