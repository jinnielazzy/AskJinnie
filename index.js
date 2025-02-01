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

const divider = chalk.hex('#7F8C8D')('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function getIssues() {
  try {
    console.log(divider);
    console.log(`${chalk.bgHex('#3498DB').whiteBright(` Issues in ${ISSUES_REPO} assigned to ${MASTER} `)}`);
    console.log(`${chalk.hex('#3498DB').underline(`${ISSUES_REPO}`)}`);

    const res = await axios.get(`${API_DOMAIN}/repos/${ISSUES_REPO}/issues?assignee=${MASTER}&sorted=updated`, {
      headers,
    });

    const issues = res.data;

    if (issues.length === 0) {
      console.log(`\n${chalk.bgHex('#F1C40F').black(' No issues assigned to ')}${chalk.bgHex('#F1C40F').black(MASTER)}`);
      return;
    }

    issues.forEach((issue) => {
      console.log(divider);
      console.log(chalk.bgHex('#E67E22').whiteBright(` Issue ${issue.number} `), issue.labels.map((label) => chalk.hex(`#${label.color}`)(label.name)).join(" "));
      console.log(`${chalk.hex('#27AE60').bold('Title:')} ${chalk.hex('#2ECC71')(issue.title)}`);
      console.log(`${chalk.hex('#2980B9').bold('ISSUE URL:')} ${chalk.hex('#3498DB').underline(issue.html_url)}`);
    });

  } catch (error) {
    console.error(chalk.bgHex('#E74C3C').white(' Error fetching issues: '), error.message);
  }
}

async function getPRsFromRepo(org, repoName) {
  try {
    const prefix = `${chalk.bgHex('#2E86C1').whiteBright(` Pull requests authored by ${MASTER} in ${org}/${repoName} `)}\n${chalk.hex('#3498DB').underline(`${ORG_GITHUB_DOMAIN}/${org}/${repoName}`)}`;

    const response = await axios.get(`${API_DOMAIN}/repos/${org}/${repoName}/pulls?state=open`, {
      headers,
    });

    const prs = response.data.filter(pr => pr.user.login === MASTER);

    if (prs.length === 0) {
      return `${prefix}\n${chalk.bgHex('#F1C40F').black(' No pull requests ')}`;
    }

    const prDetails = prs.map((pr) => {
      return (
        `${chalk.bgHex('#F39C12').black(` PR ${pr.number} `)}\n` +
        `${chalk.hex('#27AE60').bold('Title:')} ${chalk.hex('#2ECC71')(pr.title)}\n` +
        `${chalk.hex('#2980B9').bold('PR URL:')} ${chalk.hex('#3498DB').underline(pr.html_url)}\n`
      );
    }).join(`${divider}\n`);

    return `${prefix}\n${divider}${prDetails}${divider}`;
  } catch (error) {
    console.error(chalk.bgHex('#E74C3C').white(' Error fetching pull requests: '), error.message);
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
    console.log(chalk.bgHex('#2ECC71').black(' No files found, clean! '));
  } else {
    console.log(chalk.hex('#27AE60').bold('Files found:'));
    files.forEach(file => {
      const filePath = path.join(`${homeDir}/Desktop/`, file);
      process.stdout.write(chalk.hex('#E74C3C')(`Deleting ${filePath} ... `));
      try {
        fs.unlinkSync(filePath);
        console.log(chalk.bgHex('#2ECC71').black(' OK '));
      } catch (error) {
        console.log(chalk.bgHex('#E74C3C').white(' GG '));
      }
    });
  }
}

async function main() {
  let quit = false;

  while (!quit) {
    const choice = await new Promise(resolve => {
      rl.question(chalk.hex('#F39C12')('\nHow can I help? (1. view issues / 2. view prs / 3. delete screenshots / 4. just chat / 5. quit): '), resolve);
    });

    const trimmedChoice = choice.trim().toLowerCase();

    if (trimmedChoice === '1') {
      await getIssues();
    } else if (trimmedChoice === '2') {
      const options = ORG_REPOS.map((orgRepo, index) => `${index + 1}: ${orgRepo.org}/${orgRepo.repoName}`);
      const optionIdx = ORG_REPOS.map((_, index) => `${index + 1}`);
      const prChoice = await new Promise(resolve => {
        rl.question(chalk.hex('#F39C12')(`Which repo? (${options.join(', ')}, ${options.length + 1}. all): `), resolve);
      });

      if ([...optionIdx, `${options.length + 1}`].includes(prChoice)) {
        await getPRs(Number(prChoice));
      } else {
        console.log(chalk.bgHex('#E74C3C').white(' Invalid repo choice. '));
      }
    } else if (trimmedChoice === '3') {
      console.log(`\n${chalk.hex('#3498DB').bold('Delete screenshots')}`);
      listAndDeleteScreenshots();
    } else if (trimmedChoice === '4') {
      console.log(`\n${chalk.hex('#F1C40F').bold('Sadly not there yet, pick another option')}`);
    } else if (trimmedChoice === '5') {
      quit = true;
    } else {
      console.log(chalk.bgHex('#E74C3C').white(' Invalid choice. '));
    }
  }

  rl.close();
}

console.log(`${chalk.hex('#2E86C1').bold(`哈喽 哈喽 👋 ${MASTER}`)}`);
main();