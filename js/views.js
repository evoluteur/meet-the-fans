/*  
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2020 Olivier Giulieri
*/ 

const repoArr = repoIds => repoIds.sort((a, b) => a.localeCompare(b)).map(id => id==='*' ? gitUser : reposH[id])

const textField = (label, value) => value ? `<div class="field"><label>${label}:</label> ${value}</div>` : ''
const urlField = (o, prop) => o[prop] ? `
  <div class="field ellipsis">
    <div class="icon link"></div> <a href="${o[prop]}" target="${o.name}" rel="noopener">${o[prop]}</a>
  </div>
` : ''
const iconTextField = (icon, text) => `<div class="icon ${icon}"></div><span>${text}</span>`


const icon = name => '<div class="icon '+name+'"></div>'



function infoRepo(name){
    const o = repos.find(item => item.name === name)
    let h = ''
    let url = 'https://github.com/' + gitUser.login +'/'+o.name

    h += `<h1><a href="${url}" target="${o.name}">
      <div class="repo-circle" style="background-color:${color({isRepo:true, name:o.name || r.id, group:o.group})}"></div>
      ${ o.name }
    </a></h1>`
    h += urlField(o, 'homepageUrl')
    h += repoItemPop(o)
    h += o.repos ? repoList(repos) : ''
    h += o.description ? `<div class="field">${o.description}</div>` : ''
    h += textField('Updated', o.updatedAt)
    h += textField('Created', o.createdAt)
    h += o.licenseInfo ? `<div class="field multi">${icon('license')}<a href="${o.licenseInfo.url}" target="${o.licenseInfo.key}" rel="noopener">${o.licenseInfo.name}</a></div>` : ''
    h += o.languages && o.languages.length ? o.languages.map(l => `<span><div style="background-color:${l.color}" class="ln-dot"></div>${l.name}</span>`).join('') : ''
    h += htmlTopics(o.topics)
    return h
  }

  const avatarPix = (url, css) => `<div class="${css}"><img src="${url}"></div>`
  const userTooltip = d => avatarPix(fans[d.id].avatarUrl, 'avatar-small') + d.id + 
          textField('Updated', d.updatedAt)
  //const iconDiv = icon => '<div class="icon '+icon+'"></div>'
  
  //const cField = (css, value) => 
  const infoUser = name => {
    const o = name==='*' ? gitUser : fans[name]
    let h = ''
    const isMe = o.login===gitUser.login
    let url = 'https://github.com/' + o.login
  
    h += o.avatarUrl ? '<div class="h190"><img src="'+o.avatarUrl+'"></div>' : ''
    h += `<h1><a href="${url}" target="${ o.login }">${ o.login }</a></h1>` 
    h += o.fullName ? `<div class="fullName">${o.fullName}</div>` : ''
    h += urlField(o, 'websiteUrl')
    h += urlField(o, 'webURL')


    h += o.location ? `<div class="field"><div class="icon location"></div><span> ${o.location}</span></div>` : ''
    h += o.bio ? `<div class="field">${o.bio}</div>` : ''

    h += '<div class="field multi">'
    h += o.nbFollowers ? `${icon('followers')}<a href="https://github.com/${o.login}?tab=followers" target="${'follow_'+o.name}" rel="noopener">${o.nbFollowers}</a>` : ''
    if(isMe){ 
      h += o.nbStars ? iconTextField('star', o.nbStars) : ''
      h += o.nbForks ? iconTextField('fork', o.nbForks) : ''
    }else{
      h += o.nbRepos ? `${icon('repos')}<a href="https://github.com/${o.login}?tab=repositories" target="${o.name}" rel="noopener">${o.nbRepos}</a>` : ''
    }
    h += '</div>'
  
    if(isMe){
      h += repoList(gitUser.repos, true) 
    }else{
      if(o.starred && o.starred.length){
        h += '<div class="field"><label>Starred: ' +o.starred.length+'</label>' + 
          repoList(repoArr(o.starred), false, true) + '</div>'
      }
      if(o.forked && o.forked.length){
        h += '<div class="field"><label>Forked: ' +o.forked.length+'</label> '+ 
          repoList(repoArr(o.forked), false, true) + '</div>'
      }
    }
    return h
  }
  
  const repoList = (repos, skipMe, skipLabel) => '<div class="reposList"><span class="repoIco">' + 
    (skipLabel ? '' : (icon('repos')+' '+repos.length)) +
    '</span>'+
    repos.map(r => repoItem(r, skipMe)).join('') 
    + '</div>'
  const repoItem = (r, skipMe) => {
    const isMe = r.login || r.name==='*'
    if(isMe && skipMe){
      return ''
    }
    const name = isMe ? r.login : r.name
    const url = isMe ? r.login : gitUser.login+'/'+r.name
    return `
      <div>
        <a class="${isMe ? 'gituser' : ''}" href="https://github.com/${url}" target="${name}" rel="noopener">
          <div class="repo-circle" style="background-color:${color({isRepo:true, group: isMe ? 0 : r.group})}"></div>
          ${name}
        </a>
        ${isMe ? `<div class="field multi">
          ${r.nbFollowers ? (icon('followers') + r.nbFollowers) : ''}
          ${r.nbStars ? (icon('star') + r.nbStars) : ''}
          ${r.nbForks ? (icon('fork') + r.nbForks) : ''}
        </div>` : repoItemPop(r)}
      </div>
    `
  }

let topicList = []
const maxTopics = config.maxTopics || 3
const htmlTopic = t => `<div><a href="https://github.com/topics/${t}" target="t_${t}">${t}</a></div>`
const htmlTopics = ts => {
  topicList = ts
  return '<div id="my_topics" class="field topics">'+
    ts.slice(0, maxTopics).map(htmlTopic).join('')+
    (ts.length>maxTopics ? '<div class="morelink" onclick="moreTopics(event)">+ '+(ts.length-maxTopics)+' more...</div>' : '')
}

function moreTopics(evt){
  evt.stopPropagation()
  document.getElementById('my_topics').innerHTML = topicList.map(htmlTopic).join('')
}

const repoItemPop =  (r, links) => `
<div class="field multi">
  ${r.nbStars ? `${icon('star')}<a href="https://github.com/${gitUser.login}/${r.name}/stargazers" target="${r.name}" rel="noopener">${r.nbStars}</a>` : ''}
  ${r.nbForks ? `${icon('fork')}<a href="https://github.com/${gitUser.login}/${r.name}/network/members" target="${r.name}" rel="noopener">${r.nbForks}</a>` : ''}
  ${r.version ? `${icon('tag')}<a href="https://github.com/${gitUser.login}/${r.name}/releases/tag/${r.version}" class="bold" target="${r.name}" rel="noopener">${r.version}</a>`: ''}
</div>
`

/*
var btn = document.querySelector('button');
var svg = document.querySelector('svg');
var canvas = document.querySelector('canvas');

function triggerDownload (imgURI) {
  var evt = new MouseEvent('click', {
    view: window,
    bubbles: false,
    cancelable: true
  });

  var a = document.createElement('a');
  a.setAttribute('download', 'MY_COOL_IMAGE.png');
  a.setAttribute('href', imgURI);
  a.setAttribute('target', '_blank');

  a.dispatchEvent(evt);
}

btn.addEventListener('click', function () {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var data = (new XMLSerializer()).serializeToString(svg);
  var DOMURL = window.URL || window.webkitURL || window;

  var img = new Image();
  var svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
  var url = DOMURL.createObjectURL(svgBlob);

  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    DOMURL.revokeObjectURL(url);

    var imgURI = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');

    triggerDownload(imgURI);
  };

  img.src = url;
});
*/