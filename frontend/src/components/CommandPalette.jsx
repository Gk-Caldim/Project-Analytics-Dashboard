import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    LayoutDashboard,
    Calendar,
    Database,
    FileUp,
    Settings,
    Users,
    FolderKanban,
    Wallet,
    ArrowRight,
    Hash,
    X,
} from 'lucide-react';

const STATIC_COMMANDS = [
    { id: 'dashboard', label: 'Go to Dashboard', section: 'Navigation', icon: LayoutDashboard, path: '/dashboard/projects' },
    { id: 'calendar', label: 'Go to Calendar', section: 'Navigation', icon: Calendar, path: '/dashboard/calendar' },
    { id: 'schedule-meeting', label: 'Schedule Meeting', section: 'Actions', icon: Calendar, path: '/dashboard/schedule-meeting' },
    { id: 'create-mom', label: 'Create MOM', section: 'Actions', icon: Hash, path: '/dashboard/mom' },
    { id: 'saved-moms', label: 'Saved MOMs', section: 'Navigation', icon: Hash, path: '/dashboard/saved-moms' },
    { id: 'employees', label: 'Employee Master', section: 'Masters', icon: Users, path: '/dashboard/masters/employees' },
    { id: 'projects', label: 'Project Master', section: 'Masters', icon: FolderKanban, path: '/dashboard/masters/project-master' },
    { id: 'budget', label: 'Budget Master', section: 'Masters', icon: Wallet, path: '/dashboard/masters/budget-master' },
    { id: 'trackers', label: 'Upload Trackers', section: 'Navigation', icon: FileUp, path: '/dashboard/trackers' },
    { id: 'settings', label: 'System Settings', section: 'System', icon: Settings, path: '/dashboard/settings' },
];

const CommandPalette = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Filter commands based on query
    const filtered = useMemo(() => {
        if (!query.trim()) return STATIC_COMMANDS;
        const q = query.toLowerCase();
        return STATIC_COMMANDS.filter(cmd =>
            cmd.label.toLowerCase().includes(q) ||
            cmd.section.toLowerCase().includes(q)
        );
    }, [query]);

    // Group by section
    const grouped = useMemo(() => {
        const groups = {};
        filtered.forEach(cmd => {
            if (!groups[cmd.section]) groups[cmd.section] = [];
            groups[cmd.section].push(cmd);
        });
        return groups;
    }, [filtered]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = filtered[activeIndex];
                if (cmd) {
                    navigate(cmd.path);
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filtered, activeIndex, navigate, onClose]);

    // Scroll active item into view
    useEffect(() => {
        if (listRef.current) {
            const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
            activeEl?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    if (!isOpen) return null;

    let flatIndex = 0;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="command-palette-input !pl-11"
                        placeholder="Search commands, projects, people..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <kbd className="command-palette-kbd">ESC</kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="command-palette-results" ref={listRef}>
                    {Object.keys(grouped).length === 0 ? (
                        <div className="py-8 text-center text-[var(--text-muted)] text-sm">
                            No results found
                        </div>
                    ) : (
                        Object.entries(grouped).map(([section, commands]) => (
                            <div key={section} className="mb-2">
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    {section}
                                </div>
                                {commands.map(cmd => {
                                    const currentIndex = flatIndex++;
                                    const Icon = cmd.icon;
                                    return (
                                        <div
                                            key={cmd.id}
                                            data-index={currentIndex}
                                            className={`command-palette-item ${currentIndex === activeIndex ? 'command-palette-item-active' : ''}`}
                                            onClick={() => {
                                                navigate(cmd.path);
                                                onClose();
                                            }}
                                            onMouseEnter={() => setActiveIndex(currentIndex)}
                                        >
                                            <Icon size={15} className="flex-shrink-0 opacity-50" />
                                            <span className="flex-1 truncate">{cmd.label}</span>
                                            {currentIndex === activeIndex && (
                                                <ArrowRight size={13} className="opacity-30 flex-shrink-0" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1"><kbd className="command-palette-kbd">↑↓</kbd> Navigate</span>
                    <span className="flex items-center gap-1"><kbd className="command-palette-kbd">↵</kbd> Open</span>
                    <span className="flex items-center gap-1"><kbd className="command-palette-kbd">ESC</kbd> Close</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
