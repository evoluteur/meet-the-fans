/*  
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2020 Olivier Giulieri
*/ 

let reposH = { '*' : gitUser }
let totals = {
    nbStars: 0,
    nbForks: 0,
}
let licensesH = {}

const repos = gitUser.repos;

repos.forEach(r => {
    totals.nbStars += r.nbStars
    totals.nbForks += r.nbForks
    reposH[r.name] = r
    const l = licensesH[r.licenseName]
    if(l){
        l.repos.push(r.name)
    }else{
        licensesH[r.licenseName] = {
            id: r.licenseName,
            repos: [r.name]
        }
    }
})
gitUser.nbStars = totals.nbStars
gitUser.nbForks = totals.nbForks
gitUser.name = '*'

if(fans[gitUser.login]){
    delete fans[gitUser.login]
}

const size = user => 5 + (user.starred.length + user.forked.length) * 2

function userColorGroup(u){
    if(u.forked.length){
        return u.starred.length ? 'both' : 'fork'
    }else if(u.follower){
        return 'follower'
    }
    return 'star'
}

function getData(){
    let nodes = []
    let links = []

    repos.forEach((r, idx) => {
        r.group = idx+2
        nodes.push({id: r.name, oType: 'repo', radius: Math.min(10 + r.nbStars / 10, 100), group: r.group, isRepo: true})
        links.push({source: '*', target: r.name, "value": 4})
    })

    repos.push({
        name: '*',
        description: 'Evoluteur'
    })
    nodes.push({id: '*', radius: 20, group: 0, isRepo: true})
 
    for(var u in fans){ 
        const user = fans[u] 
        nodes.push({id: u, radius: size(user), oType: 'user', "group": userColorGroup(user)})
        user.starred.forEach(p => links.push({source: u, target: p, "value": 1}))
        user.forked.forEach(p => {
            if(!user.starred.includes(p)){
                links.push({source: u, target: p, "value": 1})
            }
        })
    }

    return {
        nodes: nodes,
        links: links
    };
}
