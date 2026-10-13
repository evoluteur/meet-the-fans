/*
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2026 Olivier Giulieri

    REST version of the data fetch (see queries.js for the GraphQL one).
    Produces the same gitUser / fans structures.
*/

const apiPathREST = "https://api.github.com";
const restPageSize = 100;

// REST does not return language colors (GraphQL does): use GitHub's colors
// for the most common languages, grey for the rest.
const langColors = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Less: "#1d365d",
  Python: "#3572A5",
  Java: "#b07219",
  "C#": "#178600",
  C: "#555555",
  "C++": "#f34b7d",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  "Jupyter Notebook": "#DA5B0B",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  PLpgSQL: "#336790",
  TSQL: "#e38c00",
  Handlebars: "#f7931e",
  EJS: "#a91e50",
  Pug: "#a86454",
  Dart: "#00B4AB",
  Lua: "#000080",
  R: "#198CE7",
};
const langColor = (name) => langColors[name] || "#8b949e";

const restHeaders = () => {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
};

// One REST call. Returns { data, link } or throws an Error with GitHub's message.
const restGet = async (path) => {
  totalQueries += 1;
  const url = path.startsWith("http") ? path : apiPathREST + path;
  const r = await fetch(url, { headers: restHeaders() });
  if (!r.ok) {
    let msg = r.status + " " + r.statusText;
    try {
      const j = await r.json();
      if (j.message) {
        msg = j.message;
      }
    } catch (e) {}
    if (r.headers.get("x-ratelimit-remaining") === "0") {
      const reset = r.headers.get("x-ratelimit-reset");
      msg += reset
        ? ` (rate limit reached, resets at ${new Date(
            reset * 1000,
          ).toLocaleTimeString()})`
        : " (rate limit reached)";
    }
    throw new Error(`${path.replace(apiPathREST, "")}: ${msg}`);
  }
  return { data: await r.json(), link: r.headers.get("link") };
};

const nextLink = (link) => {
  const m = link && link.match(/<([^>]+)>;\s*rel="next"/);
  return m ? m[1] : null;
};
const lastPage = (link) => {
  const m = link && link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return m ? parseInt(m[1], 10) : null;
};

// All pages of a list endpoint.
const restGetAll = async (path) => {
  let url = path;
  let all = [];
  while (url) {
    const { data, link } = await restGet(url);
    all = all.concat(data);
    url = nextLink(link);
  }
  return all;
};

// Run a call, log the error and return a fallback instead of throwing.
const tryRest = async (fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    nbErrors += 1;
    setStatusRed(err.message);
    return fallback;
  }
};

// Like Promise.all over items.map(fn), but at most `limit` calls at a time.
const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = await fn(items[k], k);
    }
  };
  const nbWorkers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: nbWorkers }, worker));
  return out;
};

const cleanUserRest = (u) => {
  const user = {
    login: u.login,
    avatarUrl: u.avatar_url,
    createdAt: formatDate(u.created_at),
    nbFollowers: u.followers,
    nbFollowings: u.following,
    nbRepos: u.public_repos,
  };
  if (u.blog) {
    user.websiteUrl = u.blog.startsWith("http") ? u.blog : "http://" + u.blog;
  }
  ["bio", "location", "company"].forEach((prop) => {
    if (u[prop]) {
      user[prop] = u[prop];
    }
  });
  return user;
};

const licenseRest = (l) =>
  l
    ? {
        key: l.key,
        name: l.name,
        url:
          l.key && l.key !== "other"
            ? `http://choosealicense.com/licenses/${l.key}/`
            : null,
      }
    : null;

const cleanRepoRest = async (r) => {
  const repoPath = `/repos/${r.owner.login}/${r.name}`;
  const [langs, rel] = await Promise.all([
    tryRest(() => restGet(repoPath + "/languages").then((x) => x.data), {}),
    tryRest(() => restGet(repoPath + "/releases?per_page=1"), null),
  ]);
  const releases = rel ? rel.data : [];
  return {
    name: r.name,
    description: r.description,
    nbStars: r.stargazers_count,
    nbForks: r.forks_count,
    createdAt: formatDate(r.created_at),
    updatedAt: formatDate(r.updated_at),
    homepageUrl: r.homepage || null,
    licenseInfo: licenseRest(r.license),
    languages: Object.keys(langs).map((name) => ({
      name,
      color: langColor(name),
    })),
    nbReleases: rel ? lastPage(rel.link) || releases.length : 0,
    version: releases.length ? releases[0].name || releases[0].tag_name : "",
    topics: r.topics || [],
  };
};

const getUserInfoRest = async () => {
  login = document.getElementById("github_user").value.trim();
  token = document.getElementById("github_token").value.trim();
  if (!login) {
    alert("Please provide a GitHub user name.");
    hideElem("response");
    return;
  }
  if (!token) {
    setStatus(
      "No token: GitHub allows only 60 REST requests per hour without one, which is enough only for very small accounts.",
    );
  }
  document.getElementById("response").style.display = "block";
  const ghLogin = encodeURIComponent(login);

  // User
  setStatus(`Querying user ${login}...`);
  const u = await tryRest(
    () => restGet(`/users/${ghLogin}`).then((x) => x.data),
    null,
  );
  if (!u) {
    return finishRest();
  }
  user = cleanUserRest(u);
  user.follower = false;

  // Repos (+ languages and releases for each)
  const repos = await tryRest(
    () => restGetAll(`/users/${ghLogin}/repos?type=owner&per_page=${restPageSize}`),
    [],
  );
  setStatus(`Querying details for ${repos.length} repos...`);
  user.repos = (
    await mapLimit(
      repos.filter((r) => !r.fork && !r.private),
      6,
      cleanRepoRest,
    )
  ).sort((a, b) => a.name.localeCompare(b.name));
  setStatus(user.repos.length + " repos (forks excluded).");
  addTotals(user);
  showJSON("user", "const gitUser = " + toJSON(user));

  // Who interacted with what
  const roles = {};
  const role = (who) =>
    roles[who.login] ||
    (roles[who.login] = {
      avatarUrl: who.avatar_url,
      follower: false,
      starred: [],
      forked: [],
    });

  setStatus("Querying followers...");
  const followers = await tryRest(
    () => restGetAll(`/users/${ghLogin}/followers?per_page=${restPageSize}`),
    [],
  );
  followers.forEach((f) => (role(f).follower = true));

  const reposWithFans = user.repos.filter((r) => r.nbStars + r.nbForks);
  user.repos
    .filter((r) => !(r.nbStars + r.nbForks))
    .forEach((r) => setStatus(`Skipping repo ${r.name}.`));
  await mapLimit(reposWithFans, 4, async (r) => {
    setStatus(`Querying fans for repo ${r.name}.`);
    const repoPath = `/repos/${ghLogin}/${encodeURIComponent(r.name)}`;
    if (r.nbStars) {
      const stargazers = await tryRest(
        () => restGetAll(`${repoPath}/stargazers?per_page=${restPageSize}`),
        [],
      );
      stargazers.forEach((s) => role(s).starred.push(r.name));
    }
    if (r.nbForks) {
      const forks = await tryRest(
        () => restGetAll(`${repoPath}/forks?per_page=${restPageSize}`),
        [],
      );
      forks.forEach((f) => {
        const forked = role(f.owner).forked;
        if (!forked.includes(r.name)) {
          forked.push(r.name);
        }
      });
    }
  });

  // Profile of each fan (one call per fan)
  const logins = Object.keys(roles);
  setStatus(`Querying profiles for ${logins.length} fans...`);
  let nbDone = 0;
  await mapLimit(logins, 8, async (fanLogin) => {
    const r = roles[fanLogin];
    const details = await tryRest(
      () =>
        restGet(`/users/${encodeURIComponent(fanLogin)}`).then((x) => x.data),
      null,
    );
    fans[fanLogin] = {
      ...(details
        ? cleanUserRest(details)
        : { login: fanLogin, avatarUrl: r.avatarUrl }),
      follower: r.follower,
      // same convention as the GraphQL fetch: followers "star" the user ("*")
      starred: (r.follower ? ["*"] : []).concat(r.starred),
      forked: r.forked,
    };
    nbDone += 1;
    if (nbDone % 50 === 0 && nbDone < logins.length) {
      setStatus(`${nbDone} / ${logins.length} fan profiles...`);
    }
  });

  finishRest();
};

const finishRest = () => {
  showJSON("user", toJSON(user));
  showJSON("fans", toJSON(fans));
  setStatus(
    "Data fetched in " +
      Math.floor((new Date() - startTime) / 1000) +
      " seconds using " +
      totalQueries +
      " REST requests.",
  );
  if (nbErrors) {
    setStatus(nbErrors + " requests with error.");
  }
  if (user.login) {
    setStatus(dataSummary());
    showElem("bDownload");
  }
};
