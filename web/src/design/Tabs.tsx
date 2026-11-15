import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { motion } from 'motion/react';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  defaultValue = items[0]?.id,
  onValueChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue);
  const { prefersReducedMotion } = useMotionPrefs();

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    onValueChange?.(val);
  };

  const currentTab = value !== undefined ? value : activeTab;

  return (
    <RadixTabs.Root
      value={currentTab}
      onValueChange={handleTabChange}
      className={`w-full flex flex-col ${className}`}
    >
      <RadixTabs.List
        className="relative inline-flex p-1 rounded-xl bg-surface-inset border border-surface-border-subtle self-start"
        style={{ boxShadow: 'var(--shadow-inset)' }}
      >
        {items.map((item) => {
          const isSelected = currentTab === item.id;
          return (
            <RadixTabs.Trigger
              key={item.id}
              value={item.id}
              className={`relative z-10 px-4 py-2 text-xs font-semibold rounded-lg transition-colors duration-150 outline-none select-none ${
                isSelected ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId={prefersReducedMotion ? undefined : 'active-tab-pill'}
                  className="absolute inset-0 bg-surface-raised rounded-lg border border-surface-border"
                  style={{
                    boxShadow: 'var(--shadow-e1)',
                    zIndex: -1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
              {item.label}
            </RadixTabs.Trigger>
          );
        })}
      </RadixTabs.List>

      {items.map((item) => (
        <RadixTabs.Content
          key={item.id}
          value={item.id}
          className="mt-3 focus:outline-none"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
};
