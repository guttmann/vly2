#!/usr/bin/env node
/* eslint-disable no-console */
const axios = require('axios')
const fs = require('fs')
const argv = require('yargs')
  .usage('Usage: PostTag [jsonfile]')
  .command('PostTag', 'Load a Tag from json file or stdin json')
  .help('h')
  .alias('h', 'help')
  .argv

const API_URL = process.env.VLY_URL || 'http://localhost:3122'

const postTag = Tag => {
  console.log(Tag)
  axios.post(`${API_URL}/api/tags`, Tag)
    .then((response) => {
      console.log(response.data)
    })
    .catch((error) => {
      console.log(error)
    })
}

const content = fs.readFileSync(argv._[0] ? argv._[0] : 0, 'utf8')
const jsonContent = JSON.parse(content)
postTag(jsonContent)
