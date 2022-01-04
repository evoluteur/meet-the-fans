/*
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2022 Olivier Giulieri
*/

const apiPathGraphQL = "https://api.github.com/graphql";
const pageSize = 20; // max=100 but GitHub times out
let token;
let login;

let user = {};
let fans = {};
let totalQueries = 0;
let runningQueries = 0;
let startTime;

const toJSON = (obj) => JSON.stringify(obj, null, 2);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
const gqlOptions = (query) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify({ query: query }),
});
const setStatusRed = (msg) => setStatus('<span class="red">' + msg + "</span>");
const runQuery = (q, cb, cbError) => {
  totalQueries += 1;
  runningQueries += 1;
  fetch(apiPathGraphQL, gqlOptions(q))
    .then((r) => r.json())
    .then((data) => {
      if (data.errors) {
        setStatusRed(data.errors.map((err) => err.message).join("<br/>"));
        if (cbError) {
          cbError(data.errors);
        }
        cb(null, true);
      } else if (data.message && data.documentation_url) {
        runningQueries -= 1;
        setStatusRed(data.message);
      } else {
        cb(data.data);
      }
    })
    .catch((err) => {
      runningQueries -= 1;
      setStatusRed(err.message);
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
    nbStarredRepos: node.starredRepositories
      ? node.starredRepositories.totalCount
      : 0,
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

const cleanRepo = (r) => ({
  //oType: 'repo',
  name: r.name,
  description: r.description,
  nbStars: r.stargazers.totalCount,
  nbForks: r.forkCount,
  nbStarredRepos: r.nbStarredRepos,
  createdAt: formatDate(r.createdAt),
  updatedAt: formatDate(r.updatedAt),
  homepageUrl: r.homepageUrl,
  licenseInfo: r.licenseInfo ? r.licenseInfo : null,
  languages: r.languages ? r.languages.nodes : null,
  //starHistory: [],
  //forkHistory: [],
  nbReleases: r.repoRelease.totalCount || 0,
  version:
    r.repoRelease.nodes && r.repoRelease.nodes.length
      ? r.repoRelease.nodes[0].name
      : "",
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
  followers {
    totalCount
  }
  repositories{
    totalCount
  }
  following {
    totalCount
  }
  starredRepositories {
   totalCount
  }
`;
const ownerDetails = `
  owner{
    login
    avatarUrl
    repositories{
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
  licenseInfo{
    key
    name
    url
  }
  languages(first:50){
    nodes{
      name
      color
    }
  }
  repositoryTopics(first:100){
    nodes{
      topic {
         name
      }
    }
  }
  stargazers{
    totalCount
  }
  repoRelease: releases(last:1){
    totalCount
    nodes{
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

const getUserInfo = () => {
  login = document.getElementById("github_user").value;
  token = document.getElementById("github_token").value;

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

  let isFirstUserQuery = true;
  document.getElementById("response").style.display = "block";
  const qRepos = (cursor) =>
    cursor
      ? `
    query{
      user(login:"${login}"){
        followers(first:${pageSize} after:"${cursor}"){
          totalCount
          nodes{
            ${userDetails}
          }
          ${pageInfo}
        }
      }
    }
  `
      : `
    query{
      user(login:"${login}"){
        ${userScalars}
        following {
          totalCount
        }
        followers(first:100){
          totalCount
          nodes{
            ${userDetails}
          }
          ${pageInfo}
        }
        repositories (first: 100) {
          totalCount
          nodes{
            ${repoDetails}
          }
        }
      }
    }
  `;

  const cbRepos = (data) => {
    if (isFirstUserQuery) {
      isFirstUserQuery = false;
      user = cleanUser(data.user);
      delete user.starred;
      delete user.forked;
      user.repos = data.user.repositories.nodes
        .filter((r) => !r.isFork)
        .map(cleanRepo)
        .sort((a, b) => a.name.localeCompare(b.name));
      setStatus(user.repos.length + " repos (forks excluded).");
      addTotals(user);
      document.getElementById("user").value = "const gitUser = " + toJSON(user);
      setStatus("Generating queries...");
    }
    const fs = data.user.followers;
    if (fs && fs.pageInfo.hasNextPage) {
      console.log("followers", fs.pageInfo.endCursor);
      runQuery(qRepos(fs.pageInfo.endCursor), cbRepos, cbError);
    } else {
      user.repos.forEach((r) => {
        if (r.nbStars + r.nbForks) {
          getFans(r);
        } else {
          setStatus(`Skipping repo ${r.name}.`);
        }
      });
      //user.repos.forEach(r => getFans(r))
    }
    data.user.followers.nodes.forEach((u) => {
      fans[u.login] = cleanUser(u, "*");
    });
    runningQueries -= 1;
  };
  setStatus(`Querying user ${login}...`);
  runQuery(qRepos(""), cbRepos, cbError);
};

const getFans = (repo) => {
  console.log(repo.name);
  document.getElementById("fans").value = "Waiting...";
  setStatus(`Querying fans for repo ${repo.name}.`);
  if (!(repo.nbStars || repo.nbForks)) {
    return;
  }
  const project = repo.name;
  const qFans = (starsCursor, forksCursor) => `
    query{
      repository(owner:"${login}", name:"${project}"){
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

  const cbFans = (data, hasError) => {
    let curStars = "skip";
    let curForks = "skip";
    if (!hasError) {
      const repo = data.repository;
      const project = repo.name;
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
    runningQueries -= 1;

    if (curStars !== "skip" || curForks !== "skip") {
      console.log(project, curStars, curForks);
      runQuery(qFans(curStars, curForks), cbFans, cbError);
    }

    if (runningQueries) {
      setStatus(
        "Waiting on " +
          (runningQueries > 1 ? runningQueries + " queries..." : "1 query...")
      );
    } else {
      document.getElementById("fans").value = toJSON(fans);
    }
    document.getElementById("user").value = toJSON(user);
    if (!runningQueries) {
      setStatus(
        "Data fetched in " +
          Math.floor((new Date() - startTime) / 1000) +
          " seconds using " +
          totalQueries +
          " queries."
      );
      setStatus(dataSummary());
      showElem("bDownload");
    }
  };

  runQuery(qFans("", ""), cbFans, cbError);
};

const showElem = (id) => document.getElementById(id).classList.remove("hidden");
const hideElem = (id) => document.getElementById(id).classList.add("hidden");

const dataSummary = () =>
  login +
  ": " +
  user.nbRepos +
  " repos, " +
  user.nbStars +
  " stars, " +
  user.nbForks +
  " forks, " +
  user.nbFollowers +
  " followers => " +
  Object.keys(fans).length +
  " fans.<br/>";

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
  return totals;
};

const setStatus = (msg, onlyMsg) => {
  const e = document.getElementById("status");
  e.innerHTML = onlyMsg ? msg : e.innerHTML + "<br/>" + msg;
  e.scroll(0, e.scrollHeight);
};

const startQuery = () => {
  user = {};
  fans = {};
  showElem("status");
  setStatus("", true);
  showElem("response");
  document.getElementById("user").value = "Waiting for query response...";
  document.getElementById("fans").value = "";
  startTime = new Date();
  setStatus("meet-the-fans: " + startTime.toLocaleTimeString());
  getUserInfo();
};

const copy = (fieldName) => {
  var copyText = document.getElementById(fieldName);
  copyText.select();
  copyText.setSelectionRange(0, 99999); /*For mobile devices*/
  document.execCommand("copy");
};

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
const download = () => {
  const dNow = new Date();
  const txt = `
/*
  ${user.login} on ${dNow.toLocaleDateString()} ${dNow.toLocaleTimeString(
    "en-US"
  )}
  meet-the-fans: https://github.com/evoluteur/meet-the-fans
*/

const gitUser = ${toJSON(user)};

const fans = ${toJSON(fans)};
`;
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(txt)
  );
  element.setAttribute("download", "data-" + user.login + ".js");
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
