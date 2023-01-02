/*
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2023 Olivier Giulieri
*/

const repoArr = (repoIds) =>
  repoIds
    .sort((a, b) => a.localeCompare(b))
    .map((id) => (id === "*" ? gitUser : reposH[id]));

const textField = (label, value) =>
  value ? `<div class="field"><label>${label}:</label> ${value}</div>` : "";
const urlField = (o, prop) =>
  o[prop]
    ? `
  <div class="field ellipsis">
    <div class="icon link"></div> <a href="${o[prop]}" target="${o.name}" rel="noopener">${o[prop]}</a>
  </div>
`
    : "";
const icon = (iconName) => '<div class="icon ' + iconName + '"></div>';
const condIcon = (iconName, count) =>
  count ? `${icon(iconName)}<span>${count}</span>` : "";

const infoRepo = (name) => {
  const o = repos.find((item) => item.name === name);
  let h = "";
  let url = `https://github.com/${gitUser.login}/${o.name}`;

  h += `<h1><a href="${url}" target="${o.name}">
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
    (o.repos ? repoList(repos) : "") +
    (o.description ? `<div class="field">${o.description}</div>` : "") +
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
  h += `<h1><a href="${url}" target="${o.login}">${o.login}</a></h1>`;
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
    h += repoList(gitUser.repos, true);
  } else {
    if (o.starred && o.starred.length) {
      h +=
        '<div class="field"><label>Starred: ' +
        o.starred.length +
        "</label>" +
        repoList(repoArr(o.starred), false, true) +
        "</div>";
    }
    if (o.forked && o.forked.length) {
      h +=
        '<div class="field"><label>Forked: ' +
        o.forked.length +
        "</label> " +
        repoList(repoArr(o.forked), false, true) +
        "</div>";
    }
  }
  return h;
};

const repoList = (repos, skipMe, skipLabel) =>
  '<div class="reposList">' +
  (skipLabel
    ? ""
    : '<span class="repoIco">' +
      icon("repos") +
      " " +
      repos.length +
      "</span>") +
  repos.map((r) => repoItem(r, skipMe)).join("") +
  "</div>";

const repoItem = (r, skipMe) => {
  const isMe = r.login || r.name === "*";
  if (isMe && skipMe) {
    return "";
  }
  const name = isMe ? r.login : r.name;
  const url = isMe ? r.login : gitUser.login + "/" + r.name;
  return `
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
        ${
          isMe
            ? `<div class="field multi">
          ${condIcon("followers", r.nbFollowers)}
          ${condIcon("star", r.nbStars)}
          ${condIcon("fork", r.nbForks)}
        </div>`
            : repoItemPop(r)
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
      ? `${icon("tag")}<a href="${url}releases/tag/${
          r.version
        }" class="bold" ${target}>${r.version}</a>`
      : ""
  }
</div>
`;
};
