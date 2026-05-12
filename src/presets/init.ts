interface InitTool {
   name: string;
   label: string;
   targetDir: string;
}

const INIT_TOOLS: InitTool[] = [
   {
      name: 'claude',
      label: 'Claude Code',
      targetDir: '.claude/skills',
   },
   {
      name: 'opencode',
      label: 'OpenCode',
      targetDir: '.opencode/skills',
   },
];

export { INIT_TOOLS };
export type { InitTool };
