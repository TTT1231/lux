import chalk from 'chalk';

export const logger = {
   info(msg: string) {
      console.log(chalk.blue('ℹ'), msg);
   },
   success(msg: string) {
      console.log(chalk.green('✔'), msg);
   },
   warn(msg: string) {
      console.log(chalk.yellow('⚠'), msg);
   },
   error(msg: string) {
      console.error(chalk.red('✖'), msg);
   },
   skip(file: string, reason: string) {
      console.log(chalk.yellow('⊘'), chalk.gray(file), chalk.gray(`(${reason})`));
   },
   create(file: string) {
      console.log(chalk.green('✚'), file);
   },
   overwrite(file: string) {
      console.log(chalk.cyan('↻'), file);
   },
};
