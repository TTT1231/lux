import chalk from 'chalk';

export const logger = {
   log(msg: string) {
      console.log(msg);
   },
   success(msg: string) {
      console.log(chalk.green(msg));
   },
   warn(msg: string) {
      console.warn(chalk.yellow(msg));
   },
   error(msg: string) {
      console.error(chalk.red(msg));
   },
};
