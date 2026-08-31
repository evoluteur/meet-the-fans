![Meet-the-Fans](screenshots/mtf.png) &middot; [![GitHub license](https://img.shields.io/github/license/evoluteur/meet-the-fans)](https://github.com/evoluteur/meet-the-fans/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/meet-the-fans)](https://www.npmjs.com/package/meet-the-fans)

Network graph of repositories, followers, stargazers, and forks to meet your GitHub fans.

[![Evoluteur's graph](screenshots/mtf-data-viz.png)](https://evoluteur.github.io/meet-the-fans/)
## Installation

[**Download**](https://github.com/evoluteur/meet-the-fans/archive/master.zip) or **clone** from [GitHub](https://github.com/evoluteur/meet-the-fans/).

```bash
# To get the latest stable version, use git from the command line.
git clone https://github.com/evoluteur/meet-the-fans
```

or use the [npm package](https://www.npmjs.com/package/meet-the-fans):

```bash
# To get the latest stable version, use npm from the command line.
npm install meet-the-fans
```


## Project structure

The two files you'll actually use are:

- `index-data.html` — fetches your GitHub data (see [Getting the data](#getting-the-data)).
- `index.html` — renders the graph (see [Visualizing the data](#visualizing-the-data)).

## Getting the data

[Get your data](https://evoluteur.github.io/meet-the-fans/index-data.html) (user info, repositories, followers, stars, and forks) using [GitHub GraphQL API](https://docs.github.com/en/free-pro-team@latest/graphql).

Open index-data.html in your browser to fetch and download your data easily. Just enter your GitHub user name and your [GitHub Access Token](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token), then click the "Fetch data" button.

Your token stays in your browser: it is used only to call the GitHub GraphQL API directly from your machine and is never sent to any server.

[![Get your Data](screenshots/mtf-data-fetch.png)](https://evoluteur.github.io/meet-the-fans/index-data.html)

When fetching is done a "Download" button appears. Use it to download your data.

Note: it is only fetching original repositories (not including forked repos) but it is easy to change in the code.

## Visualizing the data

[Visualize your data](https://evoluteur.github.io/meet-the-fans/) using D3 force layout.

To switch to your data, change the path to "data/data-evoluteur.js" for the new file you just downloaded (in [index.html](https://github.com/evoluteur/meet-the-fans/blob/master/index.html)).

Clicking a project dot (on the graph or in the side pane) highlights it with its stargazers and forks.

[![Evoluteur's graph](screenshots/mtf-data-viz-2.png)](https://evoluteur.github.io/meet-the-fans/)

The graph supports zoom and pan. Colors, size and force layout can be configured in the [config.js](https://github.com/evoluteur/meet-the-fans/blob/master/config.js) file. You may also want to modify the [CSS](https://github.com/evoluteur/meet-the-fans/blob/master/css/meet-the-fans.css).

```javascript
const config = {
  // svg size
  height: 2000,
  width: 2000,
  // graph params
  strength: -30,
  distance: 50,
  // colors
  userColors: {
    follower: "#B9D7EB",
    star: "#86BDDC",
    fork: "#1966AC",
    both: "#4A96C9",
  },
  colorFaded: "#5f5f5f",
  circleBorder: "white",
  // misc.
  maxTopics: 5,
};
```

To rebuild the project (minimizing the JS), run the following commands:

```javascript
npm install
npm run build
```

## License

Meet-the-Fans is released under the [MIT license](http://github.com/evoluteur/meet-the-fans/blob/master/LICENSE).

Encourage this project by [becoming a sponsor](https://github.com/sponsors/evoluteur).

## Related projects

You may also like these projects:

- [GitHub-Projects-Cards](https://github.com/evoluteur/github-projects-cards) ([demo](https://evoluteur.github.io/github-projects-cards/)) for a cards view of your Github projects.
- [npm-Pulse](https://github.com/evoluteur/npm-pulse) ([demo](https://evoluteur.github.io/npm-pulse/)) for a dashboard of the downloads, sparklines, and trends of your npm packages.

Copyright (c) 2026 [Olivier Giulieri](https://evoluteur.github.io/).
