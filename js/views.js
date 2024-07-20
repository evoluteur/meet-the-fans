/*
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2024 Olivier Giulieri
*/

const eMap = {};
const $ = (id) => {
  const em = eMap[id];
  if (em) {
    return em;
  }
  const e = document.getElementById(id);
  if (e) {
    eMap[id] = e;
  }
  return e;
};

const refreshRepos = (fRepos, summary) => {
  $("reposList").innerHTML = repoList(fRepos, false, true, true);
  if (summary) {
    $("summary-count").innerHTML =
      '<span class="summary">' + summary + "</span>";
  }
};

const onSearch = (evt, elem) => {
  const search = evt?.currentTarget?.value;
  const totalCount = repos?.length || 0;
  if (search) {
    const fRepos = repos.filter((r) => r.name.includes(search));
    const filteredCount = fRepos.length;
    refreshRepos(fRepos, filteredCount + " / " + totalCount);
  } else {
    refreshRepos(repos, totalCount);
  }
};

let sortDirection = 1;
let lastSortKey = "n";
const onSort = (evt, id) => {
  evt.stopPropagation();
  if (lastSortKey === id) {
    sortDirection = -sortDirection;
  } else {
    sortDirection = 1;
    lastSortKey = id;
  }
  const sortFn =
    id === "s"
      ? (a, b) => sortDirection * (b.nbStars - a.nbStars)
      : (a, b) => sortDirection * a.name.localeCompare(b.name);
  refreshRepos(repos.sort(sortFn));
};

const searchBox = () =>
  `<input type="text class="field" onkeyup="javascript:onSearch(event,this)"/><span id="summary-count">${
    repos?.length || ""
  }</span></div>`;

const sortOptions = () =>
  `<div class="sort-dir" onclick="javascript:onSort(event, 'n')"/>N</div>/<div class="sort-dir" onclick="javascript:onSort(event, 's')"/>S</div>`;

const searchSortElems = () =>
  `<div class="field-holder">
  ${searchBox()}
  ${sortOptions()}
  </div>`;

const repoArr = (repoIds) =>
  repoIds
    .sort((a, b) => a.localeCompare(b))
    .map((id) => (id === "*" ? gitUser : reposH[id]));

const textField = (label, value) =>
  value ? `<div class="field"><label>${label}:</label> ${value}</div>` : "";
const urlField = (o, prop) =>
  o[prop]
    ? `<div class="field ellipsis">
    <div class="icon link"></div> <a href="${o[prop]}" target="${o.name}" rel="noopener">${o[prop]}</a>
  </div>`
    : "";
const icon = (iconName) => '<div class="icon ' + iconName + '"></div>';
const condIcon = (iconName, count) =>
  count ? `${icon(iconName)}<span>${count}</span>` : "";

const infoRepo = (name) => {
  const o = repos.find((item) => item.name === name);
  let h = "";
  let url = `https://github.com/${gitUser.login}/${o.name}`;

  h += `<div class="repo-body"><h1><a href="${url}" target="${o.name}">
      <div class="repo-circle" style="background-color:${color({
        isRepo: true,
        name: o.name || r.id,
        group: o.group,
      })}"></div>
      ${o.name}
    </a></h1>`;
  h +=
    urlField(o, "homepageUrl") +
    repoItemPop(o) +
    (o.description ? `<div class="field f-desc">${o.description}</div>` : "") +
    textField("Updated", o.updatedAt) +
    textField("Created", o.createdAt);
  h += o.licenseInfo
    ? `<div class="field multi">${icon("license")}<a href="${
        o.licenseInfo.url
      }" target="${o.licenseInfo.key}" rel="noopener">${
        o.licenseInfo.name
      }</a></div>`
    : "";
  h +=
    o.languages && o.languages.length
      ? o.languages
          .map(
            (l) =>
              `<span><div style="background-color:${l.color}" class="ln-dot"></div>${l.name}</span>`
          )
          .join("")
      : "";
  h += htmlTopics(o.topics);
  h += "</div>";
  return h;
};

const avatarPix = (url, css) => `<div class="${css}"><img src="${url}"></div>`;
const userTooltip = (d) =>
  avatarPix(fans[d.id].avatarUrl, "avatar-small") +
  d.id +
  textField("Updated", d.updatedAt);

const infoUser = (name) => {
  const o = name === "*" ? gitUser : fans[name];
  let h = "";
  const isMe = o.login === gitUser.login;
  let url = "https://github.com/" + o.login;

  h += o.avatarUrl
    ? '<div class="h190"><img src="' + o.avatarUrl + '"></div>'
    : "";
  h += `<div class="profile-top"><h1><a href="${url}" target="${o.login}">${o.login}</a></h1>`;
  h += o.fullName ? `<div class="fullName">${o.fullName}</div>` : "";
  h += urlField(o, "websiteUrl") + urlField(o, "webURL");

  h += o.location
    ? `<div class="field"><div class="icon location"></div> <span>${o.location}</span></div>`
    : "";
  h += o.bio ? `<div class="field">${o.bio}</div>` : "";

  h += '<div class="field multi">';
  h += o.nbFollowers
    ? `${icon("followers")}<a href="https://github.com/${
        o.login
      }?tab=followers" target="${"follow_" + o.name}" rel="noopener">${
        o.nbFollowers
      }</a>`
    : "";
  h += "</div>";
  if (isMe) {
    h += condIcon("star", o.nbStars) + condIcon("fork", o.nbForks);
  } else {
    h += o.nbRepos
      ? `${icon("repos")}<a href="https://github.com/${
          o.login
        }?tab=repositories" target="${o.name}" rel="noopener">${o.nbRepos}</a>`
      : "";
  }

  h += "</div>";
  if (isMe) {
    h += searchSortElems() + repoList(gitUser.repos, true, true);
  } else {
    if (o.starred && o.starred.length) {
      h += `<div class="field">
      <label class="lbl-10">Starred: ${o.starred.length}</label>
      ${repoList(repoArr(o.starred), false, true, null, false)}
      </div>`;
    }
    if (o.forked && o.forked.length) {
      h += `<div class="field">
      <label class="lbl-10">Forked: ${o.forked.length}</label>
      ${repoList(repoArr(o.forked), false, true, null, false)}
      </div>`;
    }
  }
  return h;
};

const repoList = (repos, skipMe, skipLabel, noTag, withSummary) => {
  const body = repos.map((r) => repoItem(r, skipMe, withSummary)).join("");
  const label = skipLabel
    ? ""
    : '<span class="repoIco">' + icon("repos") + " " + repos.length + "</span>";
  return noTag
    ? body
    : '<div id="reposList" class="reposList">' + label + body + "</div>";
};

const repoItem = (r, skipMe, withSummary = true) => {
  const isMe = r.login || r.name === "*";
  if (isMe && skipMe) {
    return "";
  }
  const name = isMe ? r.login : r.name;
  if (!name) {
    return "";
  }
  const url = isMe ? r.login : gitUser.login + "/" + r.name;
  return `
      <div onclick="javascript:selectProject('${r.name}')" class="project">
      <div>
      <a class="${isMe ? "gituser" : ""}" href="javascript:selectProject('${
    r.name
  }')">
          <div class="repo-circle" style="background-color:${color({
            isRepo: true,
            group: isMe ? 0 : r.group,
          })}"></div>
        </a>
        <a class="${
          isMe ? "gituser" : ""
        }" href="https://github.com/${url}" target="${name}" rel="noopener">
          ${name}
        </a>
         </div>
        ${
          isMe && withSummary
            ? `<div class="field multi">
          ${condIcon("followers", r.nbFollowers)}
          ${condIcon("star", r.nbStars)}
          ${condIcon("fork", r.nbForks)}
        </div>`
            : withSummary
            ? repoItemPop(r)
            : ""
        }
      </div>
    `;
};

let topicList = [];
const maxTopics = config.maxTopics || 3;
const htmlTopic = (t) =>
  `<div><a href="https://github.com/topics/${t}" target="t_${t}">${t}</a></div>`;
const htmlTopics = (ts) => {
  topicList = ts;
  return (
    '<div id="my_topics" class="field topics">' +
    ts.slice(0, maxTopics).map(htmlTopic).join("") +
    (ts.length > maxTopics
      ? '<div class="morelink" onclick="moreTopics(event)">+ ' +
        (ts.length - maxTopics) +
        " more...</div>"
      : "")
  );
};

const moreTopics = (evt) => {
  evt.stopPropagation();
  document.getElementById("my_topics").innerHTML = topicList
    .map(htmlTopic)
    .join("");
};

const repoItemPop = (r) => {
  const url = `https://github.com/${gitUser.login}/${r.name}/`;
  const target = ` target="${r.name}" rel="noopener"`;
  return `
<div class="field multi">
  ${
    r.nbStars
      ? `${icon("star")}<a href="${url}stargazers" ${target}>${r.nbStars}</a>`
      : ""
  }
  ${
    r.nbForks
      ? `${icon("fork")}<a href="${url}network/members" ${target}>${
          r.nbForks
        }</a>`
      : ""
  }
  ${
    r.version
      ? `${icon("tag")}<a href="${url}releases/tag/${r.version}" ${target}>${
          r.version
        }</a>`
      : ""
  }
</div>
`;
};
