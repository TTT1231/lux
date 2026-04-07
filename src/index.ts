import { program } from 'commander'
import { registerFmtCommand } from './commands/fmt.js'
import { registerVscodeCommand } from './commands/vscode.js'

program
  .name('trw1')
  .description('One-click project formatting & VSCode config CLI')
  .version('1.0.0')

registerFmtCommand(program)
registerVscodeCommand(program)

program.parse()
