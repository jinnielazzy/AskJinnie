#!/usr/bin/env node

import axios from "axios";
import readline from "readline";
import { Chalk } from "chalk";
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

const MASTER = process.env.MASTER;
const API_DOMAIN = process.env.API_DOMAIN;
const ORG_GITHUB_DOMAIN = process.env.ORG_GITHUB_DOMAIN;
const ISSUES_REPO = process.env.ISSUES_REPO;
const ORG_REPOS = process.env.ORG_REPOS.split(",").map((repo) => {
  const [org, repoName] = repo.split("/");
  return { org, repoName };
});

const divider = chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function getIssues() {
  try {
    console.log(divider);
    console.log(`${chalk.bgGreenBright.black(`Issues in ${ORG}/${ISSUES_REPO} assigned to ${MASTER} `)}`);
    console.log(`${chalk.blue(`${ORG_GITHUB_DOMAIN}/${ORG}/${ISSUES_REPO}`)}`);

    const res = await axios.get(`${API_DOMAIN}/repos/${ORG}/${ISSUES_REPO}/issues?assignee=${MASTER}&sorted=updated`, {
      headers,
    });

    const issues = res.data;

    if (issues.length === 0) {
      console.log(`\n${chalk.bgCyan(`No issues assigned to ${MASTER}`)}`);
      return;
    }

    issues.forEach((issue) => {
      console.log(divider);
      console.log(chalk.bold.bgYellowBright.black(` Issue ${issue.number} `), issue.labels.map((label) => chalk.hex(`#${label.color}`)(label.name)).join(" "));
      console.log(`${chalk.bold.green('Title:')} ${chalk.greenBright(issue.title)}`);
      console.log(`${chalk.bold.blue('ISSUE URL:')} ${chalk.blueBright(issue.html_url)}`);
    });

  } catch (error) {
    console.error(chalk.red('Error fetching issues:'), error.message);
  }
}

async function getPRsFromRepo(org, repoName) {
  try {
    const prefix = `${chalk.bgGreenBright.black(`Pull requests authored by ${MASTER} in ${repoName} `)}\n${chalk.blue(`${ORG_GITHUB_DOMAIN}/${org}/${repoName}`)}`;

    const response = await axios.get(`${API_DOMAIN}/repos/${org}/${repoName}/pulls?state=open`, {
      headers,
    });

    const prs = response.data.filter(pr => pr.user.login === MASTER);

    if (prs.length === 0) {
      return `${prefix}${chalk.bgCyan('\nNo pull requests')}`;
    }

    const prDetails = prs.map((pr) => {
      return (
        `${chalk.bold.bgYellowBright.black(` PR ${pr.number} `)}\n` +
        `${chalk.bold.green('Title:')} ${chalk.greenBright(pr.title)}\n` +
        `${chalk.bold.blue('PR URL:')} ${chalk.blueBright(pr.html_url)}\n`
      );
    }).join(`${divider}\n`);

    return `${prefix}\n${divider}${prDetails}${divider}`;
  } catch (error) {
    console.error(chalk.red('Error fetching pull requests:'), error.message);
  }
}

async function getPRs(choice) {
  // Choice === repo length + 1, Jinhua selects all repos.
  const repos = choice === ORG_REPOS.length + 1 ? [...ORG_REPOS] : [ORG_REPOS[choice - 1]];
  for (const { org, repoName } of repos) {
    console.log(await getPRsFromRepo(org, repoName));
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

async function main() {
  let quit = false;

  while (!quit) {
    const choice = await new Promise(resolve => {
      rl.question(chalk.yellow('\nhow can i help? (1. view issues / 2. view prs / 3. delete screenshots / 4. just chat / 5. quit): '), resolve);
    });

    const trimmedChoice = choice.trim().toLowerCase();

    if (trimmedChoice === '1') {
      await getIssues();
    } else if (trimmedChoice === '2') {
      const options = ORG_REPOS.map((orgRepo, index) => `${index + 1}: ${orgRepo.org}/${orgRepo.repoName}`);
      const optionIdx = ORG_REPOS.map((_, index) => `${index + 1}`);
      const prChoice = await new Promise(resolve => {
        rl.question(chalk.yellow(`which repo? (${options.join(', ')}, ${options.length + 1}. all): `), resolve);
      });

      if ([...optionIdx, `${options.length + 1}`].includes(prChoice)) {
        await getPRs(Number(prChoice));
      } else {
        console.log(chalk.red('invalid repo choice.'));
      }
    } else if (trimmedChoice === '3') {
      console.log(`\n${chalk.cyanBright("delete screenshots")}`);
      listAndDeleteScreenshots();
    } else if (trimmedChoice === '4') {
      console.log(`\n${chalk.yellow('sadly not there yet, pick another option')}`);
    } else if (trimmedChoice === '5') {
      quit = true;
    } else {
      console.log(chalk.red('invalid choice.'));
    }
  }

  rl.close();
}

console.log(`哈喽 哈喽 👋 ${MASTER}`);
main();