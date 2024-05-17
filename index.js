#!/usr/bin/env node

import axios from "axios";
import readline from "readline";
import { Chalk } from "chalk";
import Table from 'cli-table';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log(`\n${chalk.blueBright("ISSUES")}`);
    console.log(`${chalk.bgBlue(`${ORG}/${ISSUES_REPO}: ${ORG_GITHUB_DOMAIN}/${ORG}/${ISSUES_REPO}`)}`);

    const res = await axios.get(`${API_DOMAIN}/repos/${ORG}/${ISSUES_REPO}/issues?assignee=${MASTER}&sorted=updated`, {
      headers,
    });

    const issues = res.data;

  	if (issues.length === 0) {
      console.log(`\n${chalk.cyan(`No issues assigned to ${MASTER}`)}`);
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
    console.error(chalk.red('Error fetching issues:'), error.message);
  }
}

async function getPRs(repoChoice) {
  const repoName = PR_REPOS[Number(repoChoice)];

  try {
    console.log(`\n${chalk.blueBright("Pull Requests")}`);
    console.log(`${chalk.bgBlue(`${ORG}/${repoName}: ${ORG_GITHUB_DOMAIN}/${ORG}/${repoName}`)}`)

    const response = await axios.get(`${API_DOMAIN}/repos/${ORG}/${repoName}/pulls?state=open&sort=updated`, {
      headers,
    });

    const prs = response.data.filter(pr => pr.user.login === MASTER);

    if (prs.length ===  0) {
      console.log(chalk.yellow('No pull request'));
      return;
    }

    const table = new Table({
      head: ['Number', 'Title', 'URL', 'State'].map(h => chalk.magenta(h)),
    });

    prs.forEach(pr => {
      table.push([pr.number, pr.title, pr.html_url, chalk.bgGreenBright(pr.state)]);
    });

    console.log(`\n${chalk.cyan(`Pull requests authored by ${MASTER} in ${repoName}:`)}`);
    console.log(table.toString());
  } catch (error) {
    console.error(chalk.red('Error fetching pull requests:'), error.message);
  }
}

function main() {
  rl.question(chalk.yellow('\nWhat do you want to do? (1. view issues / 2. view prs / 3. quit): '), choice => {
    choice = choice.trim().toLowerCase();
    if (choice === '1') {
      getIssues().then(main);
    } else if (choice === '2') {
      const options = PR_REPOS.map((repo, index) => `${index}: ${repo}`);
      const optionIdx = PR_REPOS.map((_, index) => `${index}`);
      rl.question(chalk.yellow(`Which repo? (${options.join(', ')}): `), repoChoice => {
        if (optionIdx.includes(repoChoice)) {
          getPRs(repoChoice).then(main);
        } else {
          console.log(chalk.red('Invalid repo choice.'));
          main();
        }
      });
    } else if (choice === '3') {
      rl.close();
    } else {
      console.log(chalk.red('Invalid choice.'));
      main();
    }
  });
}

main();