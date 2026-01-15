
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Undo2, Redo2, ShoppingCart, Image as ImageIcon, LayoutTemplate, Palette, 
  Square, Type as TypeIcon, Minus, Plus, Trash2, X, Upload, 
  Book, ImagePlus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Columns, Grid2X2, Layers, Layout, Type, Pipette, Heading1, Heading2, TextQuote,
  Image as ImageControl, SlidersHorizontal, Grid3X3, Film, Move, Maximize, Crop,
  Check, MousePointer2, GripVertical, Settings2, Sparkles
} from 'lucide-react';
import { SidebarTab, Spread, AppState, ElementType, PageElement } from './types';

// --- Constants ---
const SPREAD_WIDTH = 600;
const PAGE_WIDTH = 300;
const PAGE_HEIGHT = 450;

const PRESET_BG_COLORS = [
  '#FFFFFF', '#F3F4F6', '#FDE68A', '#FCA5A5', '#93C5FD', 
  '#A7F3D0', '#DDD6FE', '#FBCFE8', '#F3E5F5', '#EFEBE9', '#2C2C2C'
];

const CYRILLIC_FONTS = [
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', serif" },
  { name: 'Lora', value: "'Lora', serif" },
  { name: 'Comfortaa', value: "'Comfortaa', cursive" },
  { name: 'Caveat', value: "'Caveat', cursive" },
  { name: 'Tenor Sans', value: "'Tenor Sans', sans-serif" },
  { name: 'Cormorant Infant', value: "'Cormorant Infant', serif" },
];

const getDefaultLayoutElements = (): PageElement[] => [
  {
    id: Math.random().toString(36).substr(2, 9),
    type: ElementType.IMAGE,
    x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT,
    content: '', zIndex: 1, imageX: 0, imageY: 0, imageZoom: 1
  }
];

const INITIAL_SPREADS: Spread[] = [
  { id: '1', leftPageElements: getDefaultLayoutElements(), rightPageElements: getDefaultLayoutElements(), label: 'Обкладинка', background: '#FFFFFF', backgroundOpacity: 1 },
  { id: '2', leftPageElements: getDefaultLayoutElements(), rightPageElements: getDefaultLayoutElements(), label: '1 - 2', background: '#FFFFFF', backgroundOpacity: 1 },
  { id: '3', leftPageElements: getDefaultLayoutElements(), rightPageElements: getDefaultLayoutElements(), label: '3 - 4', background: '#FFFFFF', backgroundOpacity: 1 },
  { id: '4', leftPageElements: getDefaultLayoutElements(), rightPageElements: getDefaultLayoutElements(), label: '5 - 6', background: '#FFFFFF', backgroundOpacity: 1 },
];

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center transition-all duration-300 relative w-full py-3 md:py-5 group ${
      active ? 'text-[#263A99]' : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>{icon}</div>
    <span className="text-[7.5px] md:text-[8px] mt-1.5 font-bold uppercase font-montserrat tracking-tighter text-center w-full leading-none">
      {label}
    </span>
    {active && <div className="absolute right-0 max-md:hidden top-2 bottom-2 w-[3px] bg-[#263A99] rounded-l-full"></div>}
    {active && <div className="absolute top-0 left-2 right-2 h-[2px] bg-[#263A99] md:hidden rounded-b-full"></div>}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null);
  const [state, setState] = useState<AppState>({
    spreads: INITIAL_SPREADS,
    activeSpreadIndex: 0,
    selectedElementId: null,
    zoom: 85,
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'se' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ w: 0, h: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialImagePos, setInitialImagePos] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const bgColorPickerRef = useRef<HTMLInputElement>(null);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  const spreadContainerRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  const activeSpread = state.spreads[state.activeSpreadIndex];

  const calculateAutoZoom = useCallback(() => {
    if (!editorAreaRef.current) return;
    const isMobile = window.innerWidth < 768;
    const rect = editorAreaRef.current.getBoundingClientRect();
    const padding = isMobile ? 40 : 120;
    const availableWidth = rect.width - padding;
    const availableHeight = rect.height - padding;
    const zoomW = (availableWidth / SPREAD_WIDTH) * 100;
    const zoomH = (availableHeight / PAGE_HEIGHT) * 100;
    const newZoom = Math.min(zoomW, zoomH, isMobile ? 80 : 110);
    setState(prev => ({ ...prev, zoom: Math.floor(newZoom) }));
  }, [activeTab]);

  useEffect(() => {
    calculateAutoZoom();
    window.addEventListener('resize', calculateAutoZoom);
    return () => window.removeEventListener('resize', calculateAutoZoom);
  }, [calculateAutoZoom]);

  const updateElementById = (elementId: string, updates: Partial<PageElement>) => {
    setState(prev => {
      const updatedSpreads = [...prev.spreads];
      const currentSpread = updatedSpreads[prev.activeSpreadIndex];
      const onRight = currentSpread.rightPageElements.find(el => el.id === elementId);
      const onLeft = currentSpread.leftPageElements.find(el => el.id === elementId);
      if (onRight) Object.assign(onRight, updates);
      if (onLeft) Object.assign(onLeft, updates);
      return { ...prev, spreads: updatedSpreads };
    });
  };

  const deleteElement = (elementId: string) => {
    setState(prev => {
      const updatedSpreads = [...prev.spreads];
      const currentSpread = updatedSpreads[prev.activeSpreadIndex];
      currentSpread.leftPageElements = currentSpread.leftPageElements.filter(el => el.id !== elementId);
      currentSpread.rightPageElements = currentSpread.rightPageElements.filter(el => el.id !== elementId);
      return { ...prev, spreads: updatedSpreads, selectedElementId: null };
    });
  };

  const updateSpreadBackground = (updates: Partial<Spread>) => {
    setState(prev => {
      const updatedSpreads = [...prev.spreads];
      Object.assign(updatedSpreads[prev.activeSpreadIndex], updates);
      return { ...prev, spreads: updatedSpreads };
    });
  };

  const handleAddText = (page: 'left' | 'right' = 'right', initialContent = '', options?: Partial<PageElement>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newElement: PageElement = {
      id,
      type: ElementType.TEXT,
      x: 50, y: 150, width: 200, height: 100,
      content: initialContent, 
      fontSize: options?.fontSize || 22,
      fontFamily: options?.fontFamily || "'Montserrat', sans-serif",
      color: options?.color || '#1a1a1a',
      textAlign: options?.textAlign || 'center',
      zIndex: 20,
    };
    setState(prev => {
      const updatedSpreads = [...prev.spreads];
      const targetArray = page === 'right' ? updatedSpreads[prev.activeSpreadIndex].rightPageElements : updatedSpreads[prev.activeSpreadIndex].leftPageElements;
      targetArray.push(newElement);
      return { ...prev, spreads: updatedSpreads, selectedElementId: id };
    });
    if (!initialContent) setTimeout(() => setEditingId(id), 50);
  };

  const handleDropImage = (e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData('text/plain');
    if (!imageUrl) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const zoomFactor = state.zoom / 100;
    const dropX = (e.clientX - rect.left) / zoomFactor;
    const dropY = (e.clientY - rect.top) / zoomFactor;

    const elements = side === 'left' ? activeSpread.leftPageElements : activeSpread.rightPageElements;
    const targetSlot = elements.find(el => 
      el.type === ElementType.IMAGE &&
      dropX >= el.x && dropX <= el.x + el.width &&
      dropY >= el.y && dropY <= el.y + el.height
    );

    if (targetSlot) {
      updateElementById(targetSlot.id, { content: imageUrl, imageX: 0, imageY: 0, imageZoom: 1 });
      setState(prev => ({ ...prev, selectedElementId: targetSlot.id }));
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const newElement: PageElement = {
        id, type: ElementType.IMAGE,
        x: Math.max(0, Math.min(PAGE_WIDTH - 200, dropX - 100)),
        y: Math.max(0, Math.min(PAGE_HEIGHT - 150, dropY - 75)),
        width: 200, height: 150, content: imageUrl, zIndex: 10,
        imageX: 0, imageY: 0, imageZoom: 1
      };
      setState(prev => {
        const updatedSpreads = [...prev.spreads];
        const targetArray = side === 'right' ? updatedSpreads[prev.activeSpreadIndex].rightPageElements : updatedSpreads[prev.activeSpreadIndex].leftPageElements;
        targetArray.push(newElement);
        return { ...prev, spreads: updatedSpreads, selectedElementId: id };
      });
    }
  };

  const applyLayout = (type: string, side: 'left' | 'right') => {
    setState(prev => {
      const updatedSpreads = [...prev.spreads];
      const currentSpread = updatedSpreads[prev.activeSpreadIndex];
      const elements: PageElement[] = [];
      const createImg = (x:number, y:number, w:number, h:number) => ({
        id: Math.random().toString(36).substr(2, 9), type: ElementType.IMAGE, x, y, width: w, height: h, content: '', zIndex: 1, imageX: 0, imageY: 0, imageZoom: 1
      });

      if (type === 'classic') elements.push(createImg(0, 0, PAGE_WIDTH, PAGE_HEIGHT));
      else if (type === 'duo') {
        elements.push(createImg(10, 10, PAGE_WIDTH-20, 210));
        elements.push(createImg(10, 230, PAGE_WIDTH-20, 210));
      } else if (type === 'grid') {
        const w = (PAGE_WIDTH - 30) / 2; const h = (PAGE_HEIGHT - 30) / 2;
        elements.push(createImg(10, 10, w, h), createImg(20+w, 10, w, h), createImg(10, 20+h, w, h), createImg(20+w, 20+h, w, h));
      } else if (type === 'trio') {
        elements.push(createImg(10, 10, PAGE_WIDTH-20, 260));
        elements.push(createImg(10, 280, (PAGE_WIDTH-30)/2, 160), createImg(20+(PAGE_WIDTH-30)/2, 280, (PAGE_WIDTH-30)/2, 160));
      } else if (type === 'mosaic') {
        elements.push(createImg(10, 10, 135, PAGE_HEIGHT-20), createImg(155, 10, 135, (PAGE_HEIGHT-30)/2), createImg(155, 20+(PAGE_HEIGHT-30)/2, 135, (PAGE_HEIGHT-30)/2));
      } else if (type === 'gallery') {
        const w = (PAGE_WIDTH-30)/2; const h = (PAGE_HEIGHT-40)/3;
        for(let i=0;i<3;i++) for(let j=0;j<2;j++) elements.push(createImg(10+j*(w+10), 10+i*(h+10), w, h));
      } else if (type === 'cinema') {
        elements.push({ id: Math.random().toString(36).substr(2, 9), type: ElementType.TEXT, x: 10, y: 20, width: PAGE_WIDTH-20, height: 60, content: 'Заголовок історії', fontSize: 24, zIndex: 2 });
        elements.push(createImg(0, 100, PAGE_WIDTH, 250));
      }

      if (side === 'left') currentSpread.leftPageElements = elements;
      else currentSpread.rightPageElements = elements;
      return { ...prev, spreads: updatedSpreads, selectedElementId: null };
    });
  };

  const handleMouseDown = (e: React.MouseEvent, id: string, side: 'left' | 'right') => {
    if (editingId === id) return;
    e.stopPropagation();
    const elements = side === 'right' ? activeSpread.rightPageElements : activeSpread.leftPageElements;
    const element = elements.find(el => el.id === id);
    if (!element) return;

    const zoomFactor = state.zoom / 100;
    const rect = spreadContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseXInSpread = (e.clientX - rect.left) / zoomFactor;
    const mouseYInSpread = (e.clientY - rect.top) / zoomFactor;
    
    setInteractionId(id);
    setState(prev => ({ ...prev, selectedElementId: id }));

    if (isCropMode || (element.type === ElementType.IMAGE && element.content && state.selectedElementId === id)) {
      setIsPanning(true);
      setDragOffset({ x: e.clientX, y: e.clientY });
      setInitialImagePos({ x: element.imageX || 0, y: element.imageY || 0 });
    } else {
      setIsDragging(true);
      const elementXInSpread = side === 'right' ? element.x + PAGE_WIDTH : element.x;
      setDragOffset({ x: mouseXInSpread - elementXInSpread, y: mouseYInSpread - element.y });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, corner: 'nw' | 'se') => {
    e.preventDefault(); e.stopPropagation();
    const element = activeSpread.leftPageElements.find(el => el.id === id) || activeSpread.rightPageElements.find(el => el.id === id);
    if (element) {
      setInteractionId(id); setIsResizing(true); setResizeCorner(corner);
      setDragOffset({ x: e.clientX, y: e.clientY });
      setInitialSize({ w: element.width, h: element.height });
      setInitialPos({ x: element.x, y: element.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if ((!isDragging && !isResizing && !isPanning) || !interactionId) return;
    const zoomFactor = state.zoom / 100;
    
    setState(prev => {
      const updatedSpreads = [...prev.spreads];
      const currentSpread = updatedSpreads[prev.activeSpreadIndex];
      let element = currentSpread.rightPageElements.find(el => el.id === interactionId) || currentSpread.leftPageElements.find(el => el.id === interactionId);
      if (!element) return prev;

      if (isPanning) {
        const dx = (e.clientX - dragOffset.x) / zoomFactor;
        const dy = (e.clientY - dragOffset.y) / zoomFactor;
        element.imageX = initialImagePos.x + dx;
        element.imageY = initialImagePos.y + dy;
      } else if (isDragging) {
        const rect = spreadContainerRef.current?.getBoundingClientRect();
        if (!rect) return prev;
        const mouseXInSpread = (e.clientX - rect.left) / zoomFactor;
        const mouseYInSpread = (e.clientY - rect.top) / zoomFactor;
        let tx = mouseXInSpread - dragOffset.x;
        let ty = mouseYInSpread - dragOffset.y;
        
        const isCurrentlyOnRight = currentSpread.rightPageElements.some(el => el.id === interactionId);
        const shouldBeOnRight = (tx + element.width / 2) > PAGE_WIDTH;
        if (shouldBeOnRight !== isCurrentlyOnRight) {
          if (shouldBeOnRight) {
            currentSpread.leftPageElements = currentSpread.leftPageElements.filter(el => el.id !== interactionId);
            currentSpread.rightPageElements.push(element);
          } else {
            currentSpread.rightPageElements = currentSpread.rightPageElements.filter(el => el.id !== interactionId);
            currentSpread.leftPageElements.push(element);
          }
        }
        element.x = shouldBeOnRight ? Math.max(0, Math.min(PAGE_WIDTH - element.width, tx - PAGE_WIDTH)) : Math.max(0, Math.min(PAGE_WIDTH - element.width, tx));
        element.y = Math.max(0, Math.min(PAGE_HEIGHT - element.height, ty));
      } else if (isResizing) {
        const dx = (e.clientX - dragOffset.x) / zoomFactor;
        const dy = (e.clientY - dragOffset.y) / zoomFactor;
        if (resizeCorner === 'se') {
          element.width = Math.max(20, initialSize.w + dx);
          element.height = Math.max(20, initialSize.h + dy);
        } else if (resizeCorner === 'nw') {
          element.width = Math.max(20, initialSize.w - dx);
          element.height = Math.max(20, initialSize.h - dy);
          element.x = initialPos.x + dx;
          element.y = initialPos.y + dy;
        }
      }
      return { ...prev, spreads: updatedSpreads };
    });
  }, [isDragging, isResizing, isPanning, resizeCorner, interactionId, dragOffset, initialSize, initialPos, initialImagePos, state.zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false); setIsResizing(false); setIsPanning(false); setInteractionId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const selectedElement = useMemo(() => {
    if (!state.selectedElementId) return null;
    return activeSpread.leftPageElements.find(el => el.id === state.selectedElementId) ||
           activeSpread.rightPageElements.find(el => el.id === state.selectedElementId) || null;
  }, [state.selectedElementId, activeSpread]);

  const renderElements = (elements: PageElement[], side: 'left' | 'right') => (
    elements.map(el => {
      const isSelected = state.selectedElementId === el.id;
      const isEditing = editingId === el.id;
      const isImg = el.type === ElementType.IMAGE;
      const showCropVisuals = isSelected && isCropMode;
      
      return (
        <div key={el.id} 
          className={`absolute transition-all duration-200 ${isSelected ? 'border-[#263A99] ring-2 ring-[#263A99]/10 z-50 shadow-xl' : 'border-gray-200 z-10'} border`}
          style={{ 
            left: el.x, top: el.y, width: el.width, height: el.height, 
            backgroundColor: el.type === ElementType.TEXT ? (isEditing ? 'white' : 'transparent') : '#f3f4f6',
            cursor: isImg && el.content ? 'move' : (isSelected ? 'default' : 'pointer'),
            overflow: showCropVisuals ? 'visible' : 'hidden'
          }}
          onMouseDown={(e) => handleMouseDown(e, el.id, side)}
          onDoubleClick={() => {
            if (el.type === ElementType.TEXT) setEditingId(el.id);
            if (el.type === ElementType.IMAGE && el.content) setIsCropMode(true);
          }}
        >
          {el.type === ElementType.TEXT ? (
            <div className="w-full h-full p-2 outline-none overflow-hidden flex flex-col justify-center whitespace-pre-wrap leading-tight"
              style={{ fontFamily: el.fontFamily, fontSize: `${el.fontSize}px`, color: el.color, textAlign: el.textAlign }}
              contentEditable={isEditing} onBlur={() => setEditingId(null)}
              onInput={(e) => updateElementById(el.id, { content: e.currentTarget.innerText })} 
              suppressContentEditableWarning>
              {el.content || 'Текст'}
            </div>
          ) : (
            <div className="w-full h-full relative">
              {el.content ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    <img src={el.content} 
                      className={`max-w-none transition-transform duration-75 ${showCropVisuals ? 'opacity-30' : 'opacity-100'}`} 
                      style={{ 
                        width: 'auto', minWidth: '100%', minHeight: '100%',
                        transform: `translate(${el.imageX || 0}px, ${el.imageY || 0}px) scale(${el.imageZoom || 1})`,
                        position: 'absolute'
                      }} 
                      alt="" 
                    />
                  </div>
                  
                  {showCropVisuals && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden border-2 border-[#263A99] shadow-inner">
                       <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                          <div className="border-r border-b border-[#263A99]" />
                          <div className="border-r border-b border-[#263A99]" />
                          <div className="border-b border-[#263A99]" />
                          <div className="border-r border-b border-[#263A99]" />
                          <div className="border-r border-b border-[#263A99]" />
                          <div className="border-b border-[#263A99]" />
                       </div>
                       <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <img src={el.content} 
                          className="max-w-none transition-transform duration-75" 
                          style={{ 
                            width: 'auto', minWidth: '100%', minHeight: '100%',
                            transform: `translate(${el.imageX || 0}px, ${el.imageY || 0}px) scale(${el.imageZoom || 1})`,
                            position: 'absolute'
                          }} 
                          alt="" 
                        />
                       </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                  <ImageIcon size={24} />
                  <span className="text-[8px] uppercase font-bold mt-1">Фото</span>
                </div>
              )}
            </div>
          )}
          {isSelected && !isCropMode && (
            <>
              <div onMouseDown={(e) => handleResizeStart(e, el.id, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#263A99] rounded-full cursor-nw-resize z-50" />
              <div onMouseDown={(e) => handleResizeStart(e, el.id, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#263A99] rounded-full cursor-se-resize z-50" />
              <button onMouseDown={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 z-50"><X size={10}/></button>
            </>
          )}
        </div>
      );
    })
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8F7F2]">
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={(e) => {
        const files = Array.from(e.target.files || []) as File[];
        files.forEach(f => {
          const r = new FileReader(); r.onload = (ev) => setUploadedImages(p => [ev.target?.result as string, ...p]); r.readAsDataURL(f);
        });
      }} />
      <input type="file" ref={bgImageInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          const r = new FileReader(); r.onload = (ev) => updateSpreadBackground({ backgroundImage: ev.target?.result as string }); r.readAsDataURL(f);
        }
      }} />
      <input type="color" ref={bgColorPickerRef} className="hidden" onChange={(e) => updateSpreadBackground({ background: e.target.value })} />
      <input type="color" ref={customColorInputRef} className="hidden" onChange={(e) => selectedElement && updateElementById(selectedElement.id, { color: e.target.value })} />

      {/* Header */}
      <nav className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-[100] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#263A99] rounded-lg flex items-center justify-center font-bold text-white shadow-lg">T</div>
          <span className="font-bold text-[#263A99] uppercase text-[10px] tracking-[0.3em] hidden sm:block font-montserrat">TravelBook</span>
          <div className="hidden md:flex items-center space-x-4 ml-8 border-l border-gray-100 pl-8 text-gray-400">
            <button className="hover:text-[#263A99] transition-colors"><Undo2 size={16} /></button>
            <button className="hover:text-[#263A99] transition-colors"><Redo2 size={16} /></button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-[#263A99] text-white px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2 hover:bg-[#1E2E7A] transition-all shadow-md">
            <ShoppingCart size={14} />
            <span>Замовити</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 relative overflow-hidden flex-col md:flex-row">
        <aside className="h-14 md:h-full w-full md:w-20 bg-white border-t md:border-t-0 md:border-r border-gray-100 flex md:flex-col items-center justify-around md:justify-start md:py-4 z-50 order-last md:order-first flex-shrink-0">
          <TabButton active={activeTab === 'images'} onClick={() => setActiveTab(activeTab === 'images' ? null : 'images')} icon={<ImageIcon size={20} />} label="Фото" />
          <TabButton active={activeTab === 'cover'} onClick={() => setActiveTab(activeTab === 'cover' ? null : 'cover')} icon={<Book size={20} />} label="Обкладинка" />
          <TabButton active={activeTab === 'pages'} onClick={() => setActiveTab(activeTab === 'pages' ? null : 'pages')} icon={<LayoutTemplate size={20} />} label="Сторінки" />
          <TabButton active={activeTab === 'text'} onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')} icon={<TypeIcon size={20} />} label="Текст" />
          <TabButton active={activeTab === 'background'} onClick={() => setActiveTab(activeTab === 'background' ? null : 'background')} icon={<Palette size={20} />} label="Фон" />
        </aside>

        <div className={`flex flex-col flex-1 relative overflow-hidden transition-all duration-300 ${activeTab ? 'md:flex-row' : ''}`}>
          <main ref={editorAreaRef} className="flex-1 flex flex-col relative bg-[#F1EFE9] overflow-hidden transition-all duration-300">
            {/* Quick Toolbar - Fixed the "white dot" issue by adding a check for content in images */}
            {selectedElement && (selectedElement.type === ElementType.TEXT || (selectedElement.type === ElementType.IMAGE && selectedElement.content)) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 h-14 bg-white/95 backdrop-blur shadow-2xl border border-gray-100 rounded-full flex items-center px-6 space-x-4 z-[90] animate-in slide-in-from-top-4">
                {selectedElement.type === ElementType.TEXT ? (
                  <>
                    <select className="bg-transparent text-[10px] font-bold border-none outline-none cursor-pointer font-montserrat" 
                      value={selectedElement.fontFamily} onChange={(e) => updateElementById(selectedElement.id, { fontFamily: e.target.value })}>
                      {CYRILLIC_FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                    </select>
                    <div className="h-4 w-[1px] bg-gray-200" />
                    <div className="flex items-center space-x-1">
                      <button onClick={() => updateElementById(selectedElement.id, { fontSize: Math.max(8, (selectedElement.fontSize || 16) - 2) })} className="p-1.5 hover:text-[#263A99] bg-gray-50 rounded-full"><Minus size={14}/></button>
                      <span className="text-[11px] font-bold w-5 text-center font-montserrat">{selectedElement.fontSize}</span>
                      <button onClick={() => updateElementById(selectedElement.id, { fontSize: Math.min(100, (selectedElement.fontSize || 16) + 2) })} className="p-1.5 hover:text-[#263A99] bg-gray-50 rounded-full"><Plus size={14}/></button>
                    </div>
                    <div className="h-4 w-[1px] bg-gray-200" />
                    <div className="flex items-center space-x-1">
                      <button onClick={() => updateElementById(selectedElement.id, { textAlign: 'left' })} className={`p-1.5 rounded-full ${selectedElement.textAlign === 'left' ? 'text-[#263A99] bg-[#263A99]/5' : 'text-gray-400 hover:text-gray-600'}`}><AlignLeft size={16}/></button>
                      <button onClick={() => updateElementById(selectedElement.id, { textAlign: 'center' })} className={`p-1.5 rounded-full ${selectedElement.textAlign === 'center' ? 'text-[#263A99] bg-[#263A99]/5' : 'text-gray-400 hover:text-gray-600'}`}><AlignCenter size={16}/></button>
                      <button onClick={() => updateElementById(selectedElement.id, { textAlign: 'right' })} className={`p-1.5 rounded-full ${selectedElement.textAlign === 'right' ? 'text-[#263A99] bg-[#263A99]/5' : 'text-gray-400 hover:text-gray-600'}`}><AlignRight size={16}/></button>
                    </div>
                    <div className="h-4 w-[1px] bg-gray-200" />
                    <button onClick={() => customColorInputRef.current?.click()} className="w-6 h-6 rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: selectedElement.color }} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-4">
                      <button onClick={() => setIsCropMode(!isCropMode)} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full transition-all ${isCropMode ? 'bg-[#263A99] text-white shadow-lg' : 'hover:bg-gray-100 text-gray-500'}`}>
                        {isCropMode ? <Check size={16} /> : <Crop size={16} />}
                        <span className="text-[10px] font-bold uppercase tracking-widest font-montserrat">
                          {isCropMode ? 'Готово' : 'Кадрувати'}
                        </span>
                      </button>
                      
                      <div className="flex items-center space-x-4 ml-4 border-l border-gray-100 pl-6">
                        <div className="flex items-center space-x-3">
                        <ImageIcon size={14} className="text-gray-400" />
                        <input 
                            type="range" 
                            min="1" 
                            max="5" 
                            step="0.01" 
                            value={selectedElement.imageZoom || 1}
                            onChange={(e) => updateElementById(selectedElement.id, { imageZoom: parseFloat(e.target.value) })}
                            className="w-32 h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#263A99]"
                        />
                        <Maximize size={14} className="text-gray-400" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 font-montserrat min-w-[30px]">{Math.round((selectedElement.imageZoom || 1) * 100)}%</span>
                        <button onClick={() => updateElementById(selectedElement.id, { imageX: 0, imageY: 0, imageZoom: 1 })} className="text-[9px] font-bold uppercase text-[#263A99] hover:underline">Скинути</button>
                      </div>

                      {!isCropMode && (
                         <div className="flex items-center space-x-3 text-gray-400 border-l border-gray-100 pl-6">
                            <GripVertical size={16} className="opacity-30" />
                            <span className="text-[9px] uppercase font-bold tracking-[0.1em] text-gray-400 leading-tight">
                              Рухайте фото<br/>у рамці
                            </span>
                         </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden" 
              onMouseDown={() => { if (!interactionId) { setState(p => ({ ...p, selectedElementId: null })); setIsCropMode(false); } }}>
              <div className="relative transition-all duration-500 ease-in-out origin-center" style={{ transform: `scale(${state.zoom / 100})` }}>
                <div ref={spreadContainerRef} className="bg-white flex shadow-2xl relative canvas-shadow" style={{ width: `${SPREAD_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}>
                  
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0' }} />

                  <div className="w-1/2 h-full border-r border-gray-100 relative overflow-hidden" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropImage(e, 'left')} 
                    style={{ backgroundColor: activeSpread.background || '#fff', opacity: activeSpread.backgroundOpacity ?? 1 }}>
                    {activeSpread.backgroundImage && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url(${activeSpread.backgroundImage})`, backgroundSize: 'cover' }} />}
                    <div className="absolute inset-0">{renderElements(activeSpread.leftPageElements, 'left')}</div>
                  </div>
                  <div className="w-1/2 h-full relative overflow-hidden" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropImage(e, 'right')} 
                    style={{ backgroundColor: activeSpread.background || '#fff', opacity: activeSpread.backgroundOpacity ?? 1 }}>
                    {activeSpread.backgroundImage && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url(${activeSpread.backgroundImage})`, backgroundSize: 'cover' }} />}
                    <div className="absolute inset-0">{renderElements(activeSpread.rightPageElements, 'right')}</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-8 right-8 flex flex-col space-y-3 z-30">
                <button onClick={() => handleAddText()} className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-[#263A99] hover:scale-110 active:scale-95 transition-all border border-gray-50"><TypeIcon size={20}/></button>
                <button onClick={() => setState(prev => ({...prev, spreads: prev.spreads.map((s, i) => i === prev.activeSpreadIndex ? {...s, rightPageElements: [...s.rightPageElements, {id: Math.random().toString(36).substr(2, 9), type: ElementType.IMAGE, x: 50, y: 50, width: 200, height: 150, zIndex: 10, content: '', imageX: 0, imageY: 0, imageZoom: 1}]} : s)}))} className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-[#263A99] hover:scale-110 active:scale-95 transition-all border border-gray-50"><ImagePlus size={20}/></button>
              </div>
            </div>

            <footer className={`h-24 bg-[#EAE8E1] border-t border-gray-200 flex items-center px-4 space-x-4 overflow-x-auto custom-scrollbar transition-all flex-shrink-0 ${activeTab && window.innerWidth < 768 ? 'h-0 opacity-0' : 'h-24 opacity-100 py-2'}`}>
              {state.spreads.map((spread, i) => (
                <div key={spread.id} className={`flex-shrink-0 cursor-pointer transition-all ${state.activeSpreadIndex === i ? 'scale-105 -translate-y-1' : 'opacity-40 hover:opacity-100 grayscale'}`} onClick={() => setState({ ...state, activeSpreadIndex: i })}>
                  <div className="w-24 h-16 bg-white border border-gray-300 rounded shadow-sm overflow-hidden flex relative">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)', backgroundSize: '4px 4px' }} />
                    <div className="w-1/2 h-full border-r border-gray-50" style={{ backgroundColor: spread.background || '#fff', opacity: spread.backgroundOpacity ?? 1 }} />
                    <div className="w-1/2 h-full" style={{ backgroundColor: spread.background || '#fff', opacity: spread.backgroundOpacity ?? 1 }} />
                  </div>
                  <span className="text-[7px] font-bold uppercase mt-1 text-center block text-gray-500 font-montserrat">{spread.label}</span>
                </div>
              ))}
              <button onClick={() => setState(p => ({...p, spreads: [...p.spreads, {id: Math.random().toString(36).substr(2, 9), leftPageElements: getDefaultLayoutElements(), rightPageElements: getDefaultLayoutElements(), label: `${p.spreads.length*2-1} - ${p.spreads.length*2}`, background: '#fff', backgroundOpacity: 1}]}))} className="flex-shrink-0 w-24 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 hover:text-[#263A99] hover:border-[#263A99] transition-all"><Plus size={20}/></button>
            </footer>
          </main>

          {activeTab && (
            <div className="bg-white border-l border-gray-100 shadow-2xl z-[150] flex flex-col transition-all duration-300 flex-shrink-0 fixed bottom-14 left-0 right-0 h-[50vh] md:h-full md:relative md:w-80 md:bottom-0 md:left-auto md:right-auto">
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] font-montserrat flex items-center">
                  {activeTab === 'images' && <ImageIcon size={14} className="mr-2" />}
                  {activeTab === 'text' && <TypeIcon size={14} className="mr-2" />}
                  {activeTab === 'background' && <Palette size={14} className="mr-2" />}
                  {activeTab === 'images' ? 'Фотографії' : activeTab === 'text' ? 'Текст' : activeTab === 'pages' ? 'Макети' : activeTab === 'background' ? 'Фон' : activeTab === 'cover' ? 'Обкладинка' : 'Налаштування'}
                </h3>
                <button onClick={() => setActiveTab(null)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X size={16} className="text-gray-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-8">
                {activeTab === 'images' && (
                  <div className="space-y-6">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 py-10 rounded-2xl flex flex-col items-center text-gray-400 hover:border-[#263A99] hover:text-[#263A99] transition-all bg-white group">
                      <Upload size={28} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase mt-3 font-montserrat">Завантажити фото</span>
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      {uploadedImages.map((src, i) => (
                        <div key={i} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', src)} 
                          className="aspect-square bg-white border border-gray-100 rounded-xl overflow-hidden cursor-grab hover:shadow-lg transition-all active:scale-95"
                          onClick={() => {
                            const emptySlot = activeSpread.rightPageElements.find(el => el.type === ElementType.IMAGE && !el.content) || activeSpread.leftPageElements.find(el => el.type === ElementType.IMAGE && !el.content);
                            if (emptySlot) {
                              updateElementById(emptySlot.id, { content: src, imageX: 0, imageY: 0, imageZoom: 1 });
                              setState(p => ({ ...p, selectedElementId: emptySlot.id }));
                            } else {
                              const id = Math.random().toString(36).substr(2, 9);
                              const newEl: PageElement = { id, type: ElementType.IMAGE, x: 50, y: 50, width: 200, height: 150, zIndex: 10, content: src, imageX: 0, imageY: 0, imageZoom: 1 };
                              setState(prev => {
                                const updatedSpreads = [...prev.spreads];
                                updatedSpreads[prev.activeSpreadIndex].rightPageElements.push(newEl);
                                return { ...prev, spreads: updatedSpreads, selectedElementId: id };
                              });
                            }
                          }}>
                          <img src={src} className="w-full h-full object-cover pointer-events-none" alt="" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'cover' && (
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest font-montserrat">Тип обкладинки</h4>
                      <div className="space-y-3">
                        <button className="w-full py-4 px-4 bg-[#263A99]/5 border border-[#263A99]/20 rounded-xl text-left flex items-center space-x-3">
                           <div className="w-10 h-14 bg-white border rounded shadow-sm" />
                           <div>
                              <p className="text-[10px] font-bold uppercase text-[#263A99]">Тверда обкладинка</p>
                              <p className="text-[9px] text-gray-500">20x30 см, Преміум папір</p>
                           </div>
                        </button>
                        <button className="w-full py-4 px-4 bg-white border border-gray-100 rounded-xl text-left flex items-center space-x-3 opacity-60">
                           <div className="w-10 h-14 bg-gray-50 border rounded" />
                           <div>
                              <p className="text-[10px] font-bold uppercase text-gray-400">М'яка обкладинка</p>
                              <p className="text-[9px] text-gray-400">Незабаром</p>
                           </div>
                        </button>
                      </div>
                    </section>
                  </div>
                )}
                {activeTab === 'pages' && (
                  <div className="space-y-6">
                    {[
                      { id: 'classic', icon: <Square size={16}/>, name: 'Класика' },
                      { id: 'duo', icon: <Columns size={16}/>, name: 'Дует' },
                      { id: 'trio', icon: <Layout size={16}/>, name: 'Тріо' },
                      { id: 'grid', icon: <Grid2X2 size={16}/>, name: 'Сітка' },
                      { id: 'mosaic', icon: <Layers size={16}/>, name: 'Мозаїка' },
                      { id: 'gallery', icon: <Grid3X3 size={16}/>, name: 'Галерея' },
                      { id: 'cinema', icon: <Film size={16}/>, name: 'Кіно' },
                    ].map(layout => (
                      <div key={layout.id} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-[#263A99] shadow-sm border border-gray-50">{layout.icon}</div>
                          <p className="text-[10px] font-bold uppercase tracking-widest font-montserrat">{layout.name}</p>
                        </div>
                        <div className="flex space-x-3">
                          <button onClick={() => applyLayout(layout.id, 'left')} className="flex-1 py-2 bg-white border border-gray-100 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:bg-[#263A99] hover:text-white transition-all">Ліва</button>
                          <button onClick={() => applyLayout(layout.id, 'right')} className="flex-1 py-2 bg-white border border-gray-100 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:bg-[#263A99] hover:text-white transition-all">Права</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'text' && (
                  <div className="space-y-6">
                    <section className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest font-montserrat">Пресети</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => handleAddText('right', 'ЗАГОЛОВОК', { fontSize: 36, fontFamily: "'Playfair Display', serif" })} className="flex items-center space-x-4 p-4 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 transition-all text-left">
                          <div className="w-10 h-10 bg-[#263A99]/5 rounded flex items-center justify-center text-[#263A99]"><Heading1 size={18}/></div>
                          <span className="text-[10px] font-bold uppercase font-montserrat">Заголовок</span>
                        </button>
                        <button onClick={() => handleAddText('right', 'Текст...', { fontSize: 14, textAlign: 'left', fontFamily: "'Open Sans', sans-serif" })} className="flex items-center space-x-4 p-4 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 transition-all text-left">
                          <div className="w-10 h-10 bg-[#263A99]/5 rounded flex items-center justify-center text-[#263A99]"><TextQuote size={18}/></div>
                          <span className="text-[10px] font-bold uppercase font-montserrat">Звичайний текст</span>
                        </button>
                      </div>
                    </section>
                    
                    {selectedElement && selectedElement.type === ElementType.TEXT && (
                      <section className="pt-6 border-t border-gray-100 space-y-6">
                         <div className="flex items-center justify-between">
                           <h4 className="text-[10px] font-bold uppercase text-[#263A99] tracking-widest font-montserrat">Налаштування</h4>
                           <button onClick={() => deleteElement(selectedElement.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full"><Trash2 size={14} /></button>
                         </div>
                         
                         <div className="space-y-4">
                           <div className="space-y-2">
                             <p className="text-[9px] font-bold uppercase text-gray-400">Вирівнювання</p>
                             <div className="flex bg-gray-50 p-1 rounded-lg">
                               {(['left', 'center', 'right', 'justify'] as const).map(align => (
                                 <button key={align} onClick={() => updateElementById(selectedElement.id, { textAlign: align })} 
                                   className={`flex-1 flex justify-center py-2 rounded-md transition-all ${selectedElement.textAlign === align ? 'bg-white shadow-sm text-[#263A99]' : 'text-gray-400 hover:text-gray-600'}`}>
                                   {align === 'left' && <AlignLeft size={16}/>}
                                   {align === 'center' && <AlignCenter size={16}/>}
                                   {align === 'right' && <AlignRight size={16}/>}
                                   {align === 'justify' && <AlignJustify size={16}/>}
                                 </button>
                               ))}
                             </div>
                           </div>

                           <div className="space-y-2">
                             <p className="text-[9px] font-bold uppercase text-gray-400">Шрифт та розмір</p>
                             <div className="space-y-3">
                               <select className="w-full bg-white border border-gray-200 text-[11px] p-2 rounded-lg outline-none" 
                                 value={selectedElement.fontFamily} onChange={(e) => updateElementById(selectedElement.id, { fontFamily: e.target.value })}>
                                 {CYRILLIC_FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                               </select>
                               <div className="flex items-center justify-between bg-white border border-gray-200 p-1 rounded-lg">
                                  <button onClick={() => updateElementById(selectedElement.id, { fontSize: Math.max(8, (selectedElement.fontSize || 16) - 1) })} className="p-2 hover:bg-gray-50 rounded"><Minus size={14}/></button>
                                  <span className="text-[11px] font-bold font-montserrat">{selectedElement.fontSize}</span>
                                  <button onClick={() => updateElementById(selectedElement.id, { fontSize: Math.min(100, (selectedElement.fontSize || 16) + 1) })} className="p-2 hover:bg-gray-50 rounded"><Plus size={14}/></button>
                               </div>
                             </div>
                           </div>

                           <div className="flex items-center justify-between">
                             <p className="text-[9px] font-bold uppercase text-gray-400">Колір тексту</p>
                             <button onClick={() => customColorInputRef.current?.click()} className="w-10 h-10 rounded-full border-4 border-white shadow-md ring-1 ring-gray-100" style={{ backgroundColor: selectedElement.color }} />
                           </div>
                         </div>
                      </section>
                    )}
                  </div>
                )}
                {activeTab === 'background' && (
                  <div className="space-y-10">
                    <section>
                      <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest font-montserrat">Колір сторінок</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {PRESET_BG_COLORS.map(color => (
                          <button key={color} onClick={() => updateSpreadBackground({ background: color })} 
                            className={`aspect-square rounded-full border transition-all hover:scale-110 ${activeSpread.background === color ? 'border-[#263A99] ring-2 ring-[#263A99]/20 shadow-md' : 'border-gray-200 shadow-sm'}`} 
                            style={{ backgroundColor: color }} />
                        ))}
                        <button onClick={() => bgColorPickerRef.current?.click()} className="aspect-square rounded-full border border-gray-200 shadow-sm flex items-center justify-center bg-white text-gray-400 hover:text-[#263A99] hover:border-[#263A99] transition-all">
                          <Pipette size={18} />
                        </button>
                      </div>
                    </section>
                    
                    <section className="pt-6 border-t border-gray-100">
                      <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest font-montserrat">Прозорість та зображення</h4>
                      
                      <div className="space-y-6">
                        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                           <div className="flex justify-between items-center">
                              <p className="text-[9px] font-bold uppercase text-gray-400">Прозорість фону</p>
                              <span className="text-[10px] font-bold text-[#263A99]">{Math.round((activeSpread.backgroundOpacity ?? 1) * 100)}%</span>
                           </div>
                           <input 
                            type="range" 
                            min="0" max="1" step="0.01" 
                            value={activeSpread.backgroundOpacity ?? 1} 
                            onChange={(e) => updateSpreadBackground({ backgroundOpacity: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-[#263A99] border border-gray-200"
                           />
                           <p className="text-[8px] text-gray-400 italic">Слайдер впливає і на колір, і на картинку</p>
                        </div>

                        <button onClick={() => bgImageInputRef.current?.click()} className={`w-full flex flex-col items-center justify-center space-y-3 p-6 border-2 border-dashed rounded-2xl transition-all group ${activeSpread.backgroundImage ? 'border-[#263A99] bg-[#263A99]/5' : 'border-gray-200 hover:border-[#263A99] hover:bg-[#263A99]/5'}`}>
                          {activeSpread.backgroundImage ? (
                            <div className="relative w-full">
                              <img src={activeSpread.backgroundImage} className="w-full aspect-video object-cover rounded-lg shadow-sm" alt="background" />
                              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[9px] font-bold text-white uppercase tracking-widest">Замінити фото</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="text-gray-300 group-hover:text-[#263A99]" size={28} />
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-[#263A99]">Завантажити фото-фон</p>
                            </>
                          )}
                        </button>
                        
                        {activeSpread.backgroundImage && (
                           <button onClick={() => updateSpreadBackground({ backgroundImage: undefined })} className="w-full py-2.5 text-[9px] font-bold uppercase text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100">Видалити фонову картинку</button>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
