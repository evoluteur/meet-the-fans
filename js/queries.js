/*
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2026 Olivier Giulieri
*/

const apiPathGraphQL = "https://api.github.com/graphql";
const pageSize = 10; // max=100 but GitHub times out

let token;
let login;

let user = {};
let fans = {};
let totalQueries;
let runningQueries;
let nbErrors;
let startTime;
// repos where GitHub returned a star count but no stargazers (see warnStars)
let hiddenStars;

const toJSON = (obj) => JSON.stringify(obj, null, 2);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
const gqlOptions = (query, variables) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ query, variables }),
});
// Read-only JSON view with syntax colors (keys, strings, numbers, literals).
const escapeHTML = (txt) =>
  txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const jsonTokens =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(const)\b/g;
const highlightJSON = (txt) =>
  escapeHTML(txt).replace(jsonTokens, (m, str, colon, lit, num, kw) => {
    if (str) {
      return colon
        ? `<span class="j-key">${str}</span>${colon}`
        : `<span class="j-str">${str}</span>`;
    }
    if (lit) return `<span class="j-lit">${lit}</span>`;
    if (num) return `<span class="j-num">${num}</span>`;
    return `<span class="j-kw">${kw}</span>`;
  });
const showJSON = (id, txt) => {
  document.getElementById(id).innerHTML = highlightJSON(txt || "");
};

// Live progress for the Fans box while fetching: the count in its title is
// updated on every result, the JSON (plain, not colored) every 2 seconds.
// The colored JSON is shown once at the end (showFansFinal).
const FANS_REFRESH_MS = 2000;
let fansTimer = null;
let fetching = false;
const fansCountText = () => {
  const list = Object.values(fans);
  const nb = (test) => list.filter(test).length;
  return (
    `: ${list.length} (` +
    `${nb((u) => u.starred && u.starred.some((r) => r !== "*"))} stargazers, ` +
    `${nb((u) => u.forked && u.forked.length)} forkers, ` +
    `${nb((u) => u.follower)} followers)`
  );
};
const showFansCount = (done) => {
  const e = document.getElementById("fansCount");
  e.textContent = Object.keys(fans).length
    ? fansCountText() + (done ? "" : " so far...")
    : "";
};
const refreshFans = () => {
  showFansCount(false);
  if (fansTimer) {
    return;
  }
  fansTimer = setTimeout(() => {
    fansTimer = null;
    if (fetching) {
      const e = document.getElementById("fans");
      const top = e.scrollTop;
      e.textContent = toJSON(fans);
      e.scrollTop = top;
    }
  }, FANS_REFRESH_MS);
};
const showFansFinal = () => {
  fetching = false;
  clearTimeout(fansTimer);
  fansTimer = null;
  showFansCount(true);
  showJSON("fans", toJSON(fans));
};

const setStatusRed = (msg) => setStatus('<span class="red">' + msg + "</span>");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST a GraphQL query, retrying when GitHub times out. A GitHub timeout is a
// 502/504 without CORS headers, so the browser reports it as a CORS error
// ("Failed to fetch") and the status code is not readable: retry those too.
const MAX_TRIES = 3;
const gql = async (q, variables) => {
  totalQueries += 1;
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(apiPathGraphQL, gqlOptions(q, variables));
    } catch (err) {
      if (attempt < MAX_TRIES) {
        setStatus(`GitHub did not answer (timeout?), retrying (${attempt}/${MAX_TRIES - 1})...`);
        await sleep(1500 * attempt);
        continue;
      }
      throw new Error("GitHub did not answer (" + err.message + "). The query may be too heavy, try again later.");
    }
    if (res.status >= 500 && attempt < MAX_TRIES) {
      setStatus(`GitHub error ${res.status}, retrying (${attempt}/${MAX_TRIES - 1})...`);
      await sleep(1500 * attempt);
      continue;
    }
    const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    if (data.errors) {
      throw new Error(data.errors.map((err) => err.message).join("<br/>"));
    }
    if (!data.data) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data.data;
  }
};

// Callback style used by the per-repo fans queries.
const runQuery = (q, variables, cb, cbError) => {
  runningQueries += 1;
  gql(q, variables)
    .then((data) => cb(data))
    .catch((err) => {
      nbErrors += 1;
      setStatusRed(err.message);
      if (cbError) {
        cbError(err);
      }
      cb(null, true);
    });
};

const cleanUser = (node, repo) => {
  const user = {
    //oType: 'user',
    login: node.login,
    // fullName: node.name, -- uncomment to include users full name
    avatarUrl: node.avatarUrl,
    createdAt: formatDate(node.createdAt),
    nbFollowers: node.followers.totalCount,
    nbFollowings: node.following.totalCount,
    nbRepos: node.repositories.totalCount,
    follower: repo === "*",
    //starred: repo==='*' ? [] : [repo],
    starred: [repo],
    forked: [],
  };
  let prop = node.websiteUrl;
  if (prop) {
    user.websiteUrl = prop.startsWith("http") ? prop : "http://" + prop;
  }
  ["bio", "location", "company"].forEach((prop) => {
    if (node[prop]) {
      user[prop] = node[prop];
    }
  });
  return user;
};

const getVersion = (releases) => releases?.length ? releases[0].name : "";

const cleanRepo = (r) => ({
  //oType: 'repo',
  name: r.name,
  description: r.description,
  nbStars: r.stargazers.totalCount,
  nbForks: r.forkCount,
  createdAt: formatDate(r.createdAt),
  updatedAt: formatDate(r.updatedAt),
  homepageUrl: r.homepageUrl,
  licenseInfo: r.licenseInfo ?? null,
  languages: r.languages ? r.languages.nodes : null,
  //starHistory: [],
  //forkHistory: [],
  nbReleases: r.repoRelease.totalCount || 0,
  version: getVersion(r.repoRelease.nodes),
  //releasedAt: r.releases.nodes[0],
  topics: r.repositoryTopics
    ? r.repositoryTopics.nodes.map((rt) => rt.topic.name || "N/A")
    : null,
});

const cbError = (err) => {
  if (err && err.message) {
    console.error(err.message);
  }
};

const userScalars = `
  login
  name
  company
  bio
  location
  avatarUrl
  websiteUrl
  createdAt
`;
// fullName
const userDetails = `
  ${userScalars}
  repositories {
    totalCount
  }
  followers {
    totalCount
  }
  following {
    totalCount
  }
`;
const ownerDetails = `
  owner {
    login
    avatarUrl
    repositories {
      totalCount
    }
  }
  createdAt
`;
const repoDetails = `
  name
  homepageUrl
  createdAt
  updatedAt
  description
  isFork
  forkCount
  licenseInfo  {
    key
    name
    url
  }
  languages(first:50){
    nodes {
      name
      color
    }
  }
  repositoryTopics(first:20){
    nodes{
      topic {
        name
      }
    }
  }
  stargazers{
    totalCount
  }
  repoRelease: releases(first:1){
    totalCount
    nodes {
      name
      publishedAt
   }
  }
`;
const pageInfo = `
  pageInfo {
    endCursor
    hasNextPage
  }
`;

// The user, the followers and the repos are fetched in small pages:
// one big query (100 repos with languages and topics + followers) makes
// GitHub time out with a 502.
const followersPageSize = 25;
const reposPageSize = 20;

const qUser = `
  query($login: String!){
    user(login: $login){
      ${userScalars}
      following {
        totalCount
      }
      repositories(privacy: PUBLIC) {
        totalCount
      }
      followers(first:${followersPageSize}){
        totalCount
        nodes{
          ${userDetails}
        }
        ${pageInfo}
      }
    }
  }
`;

const qFollowersPaged = `
  query($login: String!, $cursor: String!){
    user(login: $login){
      followers(first:${followersPageSize} after: $cursor){
        nodes{
          ${userDetails}
        }
        ${pageInfo}
      }
    }
  }
`;

const qReposPaged = `
  query($login: String!, $cursor: String){
    user(login: $login){
      repositories(first:${reposPageSize} after: $cursor, privacy: PUBLIC){
        nodes{
          ${repoDetails}
        }
        ${pageInfo}
      }
    }
  }
`;

const getUserInfo = async () => {
  login = document.getElementById("github_user").value.trim();
  token = document.getElementById("github_token").value.trim();

  let msg = "";
  const invalidLogin = !login;
  const invalidToken = !token;
  if (invalidLogin && invalidToken) {
    msg = "Please provide a GitHub user name and a token.";
  } else if (invalidLogin) {
    msg = "Please provide a GitHub user name.";
  } else if (invalidToken) {
    msg = "Please provide a GitHub token.";
  }
  if (msg) {
    alert(msg);
    hideElem("response");
    return;
  }
  document.getElementById("response").style.display = "block";

  try {
    // user + first page of followers
    setStatus(`Querying user ${login}...`);
    const data = await gql(qUser, { login });
    if (!data.user) {
      throw new Error(`User "${login}" not found.`);
    }
    user = cleanUser(data.user);
    delete user.starred;
    delete user.forked;

    // followers (paged)
    let fs = data.user.followers;
    const addFollowers = (nodes) => {
      nodes.forEach((u) => {
        fans[u.login] = cleanUser(u, "*");
      });
      refreshFans();
    };
    addFollowers(fs.nodes);
    while (fs.pageInfo.hasNextPage) {
      setStatus(`Followers: ${Object.keys(fans).length} / ${data.user.followers.totalCount}...`);
      fs = (await gql(qFollowersPaged, { login, cursor: fs.pageInfo.endCursor })).user.followers;
      addFollowers(fs.nodes);
    }

    // repos (paged)
    let repos = [];
    let cursor = null;
    do {
      setStatus(`Repos: ${repos.length} / ${data.user.repositories.totalCount}...`);
      const rs = (await gql(qReposPaged, { login, cursor })).user.repositories;
      repos = repos.concat(rs.nodes);
      cursor = rs.pageInfo.hasNextPage ? rs.pageInfo.endCursor : null;
    } while (cursor);
    user.repos = repos
      .filter((r) => !r.isFork)
      .map(cleanRepo)
      .sort((a, b) => a.name.localeCompare(b.name));
    setStatus(user.repos.length + " repos (forks excluded).");
    addTotals(user);
    showJSON("user", "const gitUser = " + toJSON(user));
  } catch (err) {
    nbErrors += 1;
    setStatusRed(err.message);
    showFansFinal();
    return;
  }

  // stargazers and forks, per repo (in parallel)
  setStatus("Generating queries...");
  const withFans = user.repos.filter((r) => r.nbStars + r.nbForks);
  user.repos
    .filter((r) => !(r.nbStars + r.nbForks))
    .forEach((r) => setStatus(`Skipping repo ${r.name}.`));
  if (withFans.length) {
    withFans.forEach(getFans);
  } else {
    finishGraphQL();
  }
};

const getFans = (repo) => {
  console.log(repo.name);

  setStatus(`Querying fans for repo ${repo.name}.`);
  if (!(repo.nbStars || repo.nbForks)) {
    return;
  }
  const project = repo.name;
  const qFans = (starsCursor, forksCursor) => `
    query($login: String!, $project: String!){
      repository(owner: $login, name: $project){
        name
        ${repo.nbStars ? subQ("stargazers", starsCursor) : ""}
        ${repo.nbForks ? subQ("forks", forksCursor) : ""}
      }
    }
  `;
  const subQ = (object, cursor) => {
    if (cursor === "skip") {
      return "";
    }
    const details = object === "stargazers" ? userDetails : ownerDetails;
    const starDates = object === "stargazers" ? "edges{starredAt}" : "";
    return `
      ${object}(first:${pageSize} ${cursor ? 'after:"' + cursor + '"' : ""}){
        totalCount
        nodes{
          ${details}
        }
        ${starDates}
        ${pageInfo}
      }
    `;
  };

  const cbFans = (data, hasError, starsCursor = null) => {
    let curStars = "skip";
    let curForks = "skip";
    if (!hasError) {
      const repo = data.repository;
      const project = repo.name;
      if (
        repo.stargazers &&
        repo.stargazers.totalCount &&
        !repo.stargazers.nodes.length &&
        starsCursor === null
      ) {
        hiddenStars.push(project);
      }
      if (repo.stargazers) {
        repo.stargazers.nodes.forEach((u) => {
          const fan = fans[u.login];
          if (fan) {
            if (fan.createdAt) {
              // fan is full user
              fan.starred.push(project);
            } else {
              // fan is fork owner
              const forked = fan.forked;
              fans[u.login] = cleanUser(u, project);
              fans[u.login].forked = forked;
            }
          } else {
            fans[u.login] = cleanUser(u, project);
          }
        });
        //repo.stargazers.edges.forEach(e => {
        //  cRepo.starHistory.push(e.starredAt)
        //})
        if (repo.stargazers.pageInfo.hasNextPage) {
          curStars = repo.stargazers.pageInfo.endCursor;
        }
      }

      if (repo.forks) {
        repo.forks.nodes.forEach((un) => {
          const u = un.owner;
          if (fans[u.login]) {
            fans[u.login].forked.push(project);
          } else {
            fans[u.login] = {
              login: u.login,
              avatarUrl: u.avatarUrl,
              websiteUrl: u.websiteUrl,
              nbRepos: u.repositories.totalCount,
              forked: [project],
              starred: [],
            };
          }
          //cRepo.forkHistory.push(un.createdAt)
        });
        if (repo.forks.pageInfo.hasNextPage) {
          curForks = repo.forks.pageInfo.endCursor;
        }
      }
    }
    refreshFans();
    runningQueries -= 1;

    if (curStars !== "skip" || curForks !== "skip") {
      runQuery(
        qFans(curStars, curForks),
        { login, project },
        (d, err) => cbFans(d, err, curStars),
        cbError,
      );
    }

    if (runningQueries) {
      setStatus(
        `${totalQueries} queries: ${
          totalQueries - runningQueries
        } done + ${runningQueries} pending...`,
      );
    } else {
      finishGraphQL();
    }
  };

  runQuery(qFans(null, null), { login, project }, cbFans, cbError);
};

const finishGraphQL = () => {
  showFansFinal();
  showJSON("user", toJSON(user));
  setStatus(
    "Data fetched in " +
      Math.floor((new Date() - startTime) / 1000) +
      " seconds using " +
      totalQueries +
      " GraphQL queries.",
  );
  if (nbErrors) {
    setStatus(nbErrors + " queries with error or timeout.");
  }
  warnStars();
  setStatus(dataSummary());
  showElem("bDownload");
  showElem("bGraph");
};

// Since July 2026 GitHub lists stargazers only for the repo's admins and
// collaborators: other tokens (or a classic token with no scopes) get the
// star count but an empty list.
const warnStars = () => {
  if (hiddenStars && hiddenStars.length) {
    setStatusRed(
      `GitHub returned no stargazers for ${hiddenStars.length} repo(s) that have stars ` +
        `(${hiddenStars.slice(0, 5).join(", ")}${hiddenStars.length > 5 ? "..." : ""}). ` +
        "GitHub now shows stargazers only to the repo owner and collaborators: " +
        "use a classic token with the public_repo scope (a token with no scopes no longer works).",
    );
  }
};

const showElem = (id) => document.getElementById(id).classList.remove("hidden");
const hideElem = (id) => document.getElementById(id).classList.add("hidden");

const dataSummary = () =>
  `${login}: ${user.nbRepos} repos, ${user.nbStars} stars, ` +
  user.nbForks +
  " forks, " +
  user.nbFollowers +
  " followers => " +
  Object.keys(fans).length +
  " fans" +
  (nbErrors ? " (partial results due to errors)" : "") +
  ".<br/>";

const addTotals = (user) => {
  let totals = {
    nbStars: 0,
    nbForks: 0,
  };
  user.repos.forEach((r) => {
    totals.nbStars += r.nbStars;
    totals.nbForks += r.nbForks;
  });
  user.nbStars = totals.nbStars;
  user.nbForks = totals.nbForks;
};

const setStatus = (msg, onlyMsg) => {
  const e = document.getElementById("status");
  e.innerHTML = onlyMsg ? msg : e.innerHTML + "<br/>" + msg;
  e.scroll(0, e.scrollHeight);
};

const startQuery = () => {
  totalQueries = 0;
  runningQueries = 0;
  nbErrors = 0;
  hiddenStars = [];
  user = {};
  fans = {};
  showElem("status");
  hideElem("bDownload");
  hideElem("bGraph");
  setStatus("", true);
  showElem("response");
  showJSON("user", "Waiting for query response...");
  showJSON("fans", "");
  showFansCount(true);
  fetching = true;
  startTime = new Date();
  const api = getApiChoice();
  setStatus(
    `meet-the-fans: ${startTime.toLocaleTimeString()} (${
      api === "rest" ? "REST" : "GraphQL"
    } API)`,
  );
  if (api === "rest") {
    getUserInfoRest();
  } else {
    getUserInfo();
  }
};

const getApiChoice = () => {
  const e = document.querySelector('input[name="api"]:checked');
  return e ? e.value : "graphql";
};

// Save the fetched data in localStorage and open the graph with it
// (index.html?data=mine reads it back instead of the demo data).
const STORE_DATA = "mtf-data";
const viewGraph = () => {
  try {
    localStorage.setItem(
      STORE_DATA,
      JSON.stringify({ gitUser: user, fans, savedAt: new Date().toISOString() }),
    );
  } catch (e) {
    setStatusRed(
      "Could not save the data in the browser (" +
        e.message +
        "). Use Download instead.",
    );
    return;
  }
  window.location.href = "index.html?data=mine";
};

const copy = (fieldName) => {
  const text = document.getElementById(fieldName).textContent;
  navigator.clipboard.writeText(text);
};

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
const download = () => {
  const dNow = new Date();
  const txt = `
/*
  ${user.login} on ${dNow.toLocaleDateString()} ${dNow.toLocaleTimeString(
    "en-US",
  )}
  meet-the-fans: https://github.com/evoluteur/meet-the-fans
*/

const gitUser = ${toJSON(user)};

const fans = ${toJSON(fans)};
`;
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(txt),
  );
  element.setAttribute("download", "data-" + user.login + ".js");
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

// ---- Remember form values between visits ----
// The username is kept in localStorage. The token stays in sessionStorage
// (cleared when the tab closes) unless "Remember token" is checked, which
// moves it to localStorage.
const STORE_USER = "mtf-github-user";
const STORE_TOKEN = "mtf-github-token";
const STORE_REMEMBER = "mtf-remember-token";
const STORE_API = "mtf-api";

const store = {
  get: (area, k) => {
    try {
      return window[area].getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (area, k, v) => {
    try {
      if (v) window[area].setItem(k, v);
      else window[area].removeItem(k);
    } catch (e) {}
  },
};

const saveFormValues = () => {
  const user = document.getElementById("github_user").value.trim();
  const token = document.getElementById("github_token").value.trim();
  const remember = document.getElementById("remember_token").checked;
  store.set("localStorage", STORE_USER, user);
  store.set("localStorage", STORE_REMEMBER, remember ? "1" : "");
  store.set("sessionStorage", STORE_TOKEN, token);
  store.set("localStorage", STORE_TOKEN, remember ? token : "");
  store.set("localStorage", STORE_API, getApiChoice());
};

const restoreFormValues = () => {
  const eUser = document.getElementById("github_user");
  const eToken = document.getElementById("github_token");
  const eRemember = document.getElementById("remember_token");
  if (!eUser || !eToken || !eRemember) return;
  eUser.value = store.get("localStorage", STORE_USER) || eUser.value;
  eRemember.checked = store.get("localStorage", STORE_REMEMBER) === "1";
  eToken.value =
    store.get("sessionStorage", STORE_TOKEN) ||
    store.get("localStorage", STORE_TOKEN) ||
    eToken.value;
  [eUser, eToken].forEach((e) => e.addEventListener("input", saveFormValues));
  eRemember.addEventListener("change", saveFormValues);
  const api = store.get("localStorage", STORE_API);
  const eApi = api && document.querySelector(`input[name="api"][value="${api}"]`);
  if (eApi) {
    eApi.checked = true;
  }
  document
    .querySelectorAll('input[name="api"]')
    .forEach((e) => e.addEventListener("change", saveFormValues));
};

document.addEventListener("DOMContentLoaded", restoreFormValues);
