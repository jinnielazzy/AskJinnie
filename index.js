#!/usr/bin/env node

import axios from "axios";
import readline from "readline";
import { Chalk } from "chalk";
import Table from 'cli-table';
import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import path from "path";
import fs from 'fs';
import os from 'os';

// Determine the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '.env')
});

const chalk = new Chalk();

const headers = {
  "Accept": 'application/vnd.github+json',
  "Authorization": `token ${process.env.GITHUB_TOKEN}`,
  "X-GitHub-Api-Version": "2022-11-28"
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ORG = process.env.ORG;
const MASTER = process.env.MASTER;
const API_DOMAIN = process.env.API_DOMAIN;
const ORG_GITHUB_DOMAIN = process.env.ORG_GITHUB_DOMAIN;
const ISSUES_REPO = process.env.ISSUES_REPO;
const PR_REPOS = process.env.PR_REPOS.split(",");

async function getIssues() {
  try {
    console.log(`\n${chalk.greenBright(`issues in ${ORG}/${ISSUES_REPO} that assigned to ${MASTER}`)}`);
    console.log(`${chalk.blue(`${ORG_GITHUB_DOMAIN}/${ORG}/${ISSUES_REPO}`)}`);

    const res = await axios.get(`${API_DOMAIN}/repos/${ORG}/${ISSUES_REPO}/issues?assignee=${MASTER}&sorted=updated`, {
      headers,
    });

    const issues = res.data;

  	if (issues.length === 0) {
      console.log(`\n${chalk.bgCyan(`no issues assigned to ${MASTER}`)}`);
      return;
    }

    const table = new Table({
      head: ['Number', 'Title', 'URL', 'State'].map(h => chalk.magenta(h)),
    });

    issues.forEach((issue) => {
      const { number, html_url, title, state } = issue;
      const numberStr = `${number}`;
      table.push([numberStr, title, html_url, chalk.bgGreenBright(state)]);
    });

    console.log(table.toString())
  } catch (error) {
    console.error(chalk.red('error fetching issues:'), error.message);
  }
}

async function getPRsFromRepo(repoName) {
  try {
    const prefix = `\n${chalk.greenBright(`pull requests authored by ${MASTER} in ${repoName}:`)}\n${chalk.blue(`${ORG_GITHUB_DOMAIN}/${ORG}/${repoName}`)}\n`;

    const response = await axios.get(`${API_DOMAIN}/repos/${ORG}/${repoName}/pulls?state=open&sort=long-running`, {
      headers,
    });

    const prs = response.data.filter(pr => pr.user.login === MASTER);

    if (prs.length ===  0) {
      return `${prefix}${chalk.bgCyan('no pull request')}`;
    }

    const table = new Table({
      head: ['Number', 'Title', 'URL', 'State'].map(h => chalk.magenta(h)),
    });

    prs.forEach(pr => {
      table.push([pr.number, pr.title, pr.html_url, chalk.bgGreenBright(pr.state)]);
    });

    const finalString = `${prefix}${table.toString()}`;
    return finalString;
  } catch (error) {
    console.error(chalk.red('error fetching pull requests:'), error.message);
  }
}

async function getPRs(choice) {
  // Choice === repo length + 1, Jinhua selects all repos.
  const repos = choice === PR_REPOS.length + 1 ? [...PR_REPOS] : [PR_REPOS[choice - 1]];
  const promises = [];
  for (const repo of repos) {
    console.log(await getPRsFromRepo(repo));
  }
}

function listAndDeleteScreenshots() {
  const homeDir = os.homedir();
  const files = fs.readdirSync(`${homeDir}/Desktop/`).filter(file => file.startsWith("Screen") || file.endsWith(".mov") || file.endsWith(".png"));

  if (files.length === 0) {
    console.log(chalk.bgCyan("no files found, clean!"));
  } else {
    console.log(chalk.green("files found:"));
    files.forEach(file => {
      const filePath = path.join(`${homeDir}/Desktop/`, file);
      process.stdout.write(chalk.redBright(`deleting ${filePath} ... `));
      try {
        fs.unlinkSync(filePath);
        console.log(chalk.bgGreenBright('OK'));
      } catch (error) {
        console.log(chalk.bgRedBright('GG'));
      }
    });
  }
}

function main() {
  rl.question(chalk.yellow('\nhow can i help? (1. view issues / 2. view prs / 3. delete screenshots / 4. just chat / 5. quit): '), choice => {
    choice = choice.trim().toLowerCase();
    if (choice === '1') {
      getIssues().then(main);
    } else if (choice === '2') {
      // Offset by 1 for readability and convenience.
      const options = PR_REPOS.map((repo, index) => `${index + 1}: ${repo}`);
      const optionIdx = PR_REPOS.map((_, index) => `${index + 1}`);
      rl.question(chalk.yellow(`which repo? (${options.join(', ')}, ${options.length + 1}. all): `), choice => {
        if ([...optionIdx, `${options.length + 1}`].includes(choice)) {
          getPRs(Number(choice)).then(main);
        } else {
          console.log(chalk.red('invalid repo choice.'));
          main();
        }
      });
    } else if (choice === '3') {
      console.log(`\n${chalk.cyanBright("detele screenshots")}`);
      listAndDeleteScreenshots();
      main();
    } else if (choice === '4') {
      console.log(`\n${chalk.yellow('sadly not there yet, pick another option')}`);
      main();
    } else if (choice === '5') {
      rl.close();
    } else {
      console.log(chalk.red('invalid choice.'));
      main();
    }
  });
}

console.log(`哈喽 哈喽 👋 ${MASTER}`);
main();