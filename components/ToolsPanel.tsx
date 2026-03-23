import React from 'react';
import { Type, Smile, Sparkles, Music, Layers, Wand2, Grid, Settings } from 'lucide-react';

export type ActiveTool = 'TEXT' | 'STICKERS' | 'EFFECTS' | 'AUDIO' | 'TEMPLATES' | 'ADJUST' | null;

interface ToolsPanelProps {
    activeTool: ActiveTool;
    setActiveTool: (tool: ActiveTool) => void;
    hasVideo: boolean;
    hasCaptions: boolean;
}

const TOOLS = [
    { id: 'TEXT' as ActiveTool, icon: Type, label: 'Text', color: 'text-blue-400', activeColor: 'bg-blue-500/20 border-blue-500/50', requiresCaptions: true },
    { id: 'TEMPLATES' as ActiveTool, icon: Grid, label: 'Styles', color: 'text-purple-400', activeColor: 'bg-purple-500/20 border-purple-500/50', requiresCaptions: true },
    { id: 'EFFECTS' as ActiveTool, icon: Sparkles, label: 'Effects', color: 'text-yellow-400', activeColor: 'bg-yellow-500/20 border-yellow-500/50', requiresCaptions: true },
    { id: 'STICKERS' as ActiveTool, icon: Smile, label: 'Stickers', color: 'text-pink-400', activeColor: 'bg-pink-500/20 border-pink-500/50', requiresCaptions: false },
    { id: 'AUDIO' as ActiveTool, icon: Music, label: 'Audio', color: 'text-green-400', activeColor: 'bg-green-500/20 border-green-500/50', requiresCaptions: false },
    { id: 'ADJUST' as ActiveTool, icon: Settings, label: 'Settings', color: 'text-gray-400', activeColor: 'bg-gray-500/20 border-gray-500/50', requiresCaptions: false },
];

const ToolsPanel: React.FC<ToolsPanelProps> = ({
    activeTool,
    setActiveTool,
    hasVideo,
    hasCaptions,
}) => {
    const handleToolClick = (toolId: ActiveTool) => {
        if (activeTool === toolId) {
            setActiveTool(null);
        } else {
            setActiveTool(toolId);
        }
    };

    return (
        <div className="w-full h-20 md:w-16 md:h-auto bg-[#0f0f0f] border-t md:border-t-0 md:border-r border-gray-800 flex flex-row md:flex-col items-center py-2 md:py-4 px-4 md:px-0 gap-3 md:gap-1 z-30 flex-shrink-0 overflow-x-auto md:overflow-visible overflow-y-hidden custom-scrollbar">
            {/* Logo mark */}
            <div className="hidden md:flex w-8 h-8 rounded-lg bg-blue-600 items-center justify-center mb-4 flex-shrink-0">
                <Layers size={16} className="text-white" />
            </div>

            {TOOLS.map(tool => {
                const Icon = tool.icon;
                const isDisabled = !hasVideo || (tool.requiresCaptions && !hasCaptions);
                const isActive = activeTool === tool.id;

                return (
                    <button
                        key={tool.id}
                        onClick={() => !isDisabled && handleToolClick(tool.id)}
                        disabled={isDisabled}
                        title={tool.label}
                        className={`w-12 h-12 flex-shrink-0 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all group relative ${isActive
                                ? `${tool.activeColor} border-opacity-100`
                                : isDisabled
                                    ? 'bg-transparent border-transparent opacity-30 cursor-not-allowed'
                                    : 'bg-transparent border-transparent hover:bg-gray-800 hover:border-gray-700'
                            }`}
                    >
                        <Icon size={18} className={isActive ? tool.color : isDisabled ? 'text-gray-600' : `${tool.color} opacity-60 group-hover:opacity-100`} />
                        <span className={`text-[8px] font-bold uppercase tracking-wide ${isActive ? tool.color : 'text-gray-600 group-hover:text-gray-400'}`}>
                            {tool.label}
                        </span>

                        {/* Active indicator */}
                        {isActive && (
                            <>
                                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-l-full" />
                                <div className="block md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-500 rounded-t-full" />
                            </>
                        )}
                    </button>
                );
            })}

            {/* Spacer */}
            <div className="flex-1 hidden md:block" />

            {/* AI Magic button */}
            <button
                disabled={!hasCaptions}
                title="AI Magic"
                className={`w-12 h-12 flex-shrink-0 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all group ${hasCaptions
                        ? 'bg-gradient-to-b from-purple-600/20 to-blue-600/20 border-purple-500/30 hover:from-purple-600/30 hover:to-blue-600/30'
                        : 'bg-transparent border-transparent opacity-30 cursor-not-allowed'
                    }`}
            >
                <Wand2 size={18} className={hasCaptions ? 'text-purple-400' : 'text-gray-600'} />
                <span className={`text-[8px] font-bold uppercase tracking-wide ${hasCaptions ? 'text-purple-400' : 'text-gray-600'}`}>
                    AI
                </span>
            </button>
        </div>
    );
};

export default ToolsPanel;
