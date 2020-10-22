/*  
    Meet-the-Fans
    https://github.com/evoluteur/meet-the-fans
    (c) 2020 Olivier Giulieri
*/ 

const height = config.height || 1600;
const width = config.width || 1200;

const userColors = config.userColors
const colorFaded = config.colorFaded || '#eeeeee';

const scaleProject = d3.scaleOrdinal(d3.schemeCategory10);
const color = d => d.isRepo ? scaleProject(d.group) : userColors[d.group];

let selectedRepo = null;

const linksDistance = config.linksDistance || 50;
const linksCharge = config.linksDistance || -30;

const drag = simulation => {
  
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

function graph(data){
  const links = data.links//.map(d => Object.create(d));
  const nodes = data.nodes//.map(d => Object.create(d));

  // Define the div for the tooltip
  var div = d3.select("body").append("div")	
      .attr("class", "tooltip")				
      .style("opacity", 0);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).distance(50).id(d => d.id))
    .force("charge", d3.forceManyBody().strength(-30))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.radius));

  const svg = d3.create('svg')
      .attr('class', 'graph')
      .attr("viewBox", [0, 0, width, height])
      .on('click', hideDetails);

  const link = svg.append("g")
      .attr("stroke", "grey")
    .selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke-width", 1);

  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("r", d => d.radius)
      .attr("fill", color)
      .attr("class", d => d.oType)
      .call(drag(simulation))
      .on('click', showDetails) 
      .on("mouseover", (evt, d) => {	
          div.transition()		
              .duration(200)
              .delay(400)
              .style("opacity", .9); 

          const divHTML = div.html(d.isRepo ? repoItem(reposH[d.id]) : userTooltip(d))
          
          if(evt.pageX + 100 > window.innerWidth){
            divHTML.style('left', (window.innerWidth - 100) +'px')
          }else{
            divHTML.style('right', null).style("left", (evt.pageX+20) + "px")
          }
         divHTML.style("bottom", null).style("top", (evt.pageY+10) + "px");
      })
      .on("mouseout", (evt, d) => {
          div.transition()		
              .duration(200)		
              .style("opacity", 0);	
      })
  
  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });

  //invalidation.then(() => simulation.stop());
  
  return svg.node();

}


function hideDetails(evt){
  document.onclick = () => document.getElementById('details').className = '';

  d3.selectAll('circle')
    .transition().duration(600)
    .style('fill', color)

  d3.selectAll('line')
    .transition().duration(600)
    .style('stroke', 'grey')

  selectedRepo = null;
}

function showDetails(evt, d){
  evt.stopPropagation();
  if(evt.target.style.fill==='rgb(238, 238, 238)' && d.oType!=='repo'){
    return null;
  }
  const e = document.getElementById('details')
  e.innerHTML = (d.isRepo && d.id !=='*') ? infoRepo(d.id) : infoUser(d.id)
  e.className = (d.x > width / 2 ? 'left' : 'right') + (d.isRepo ? ' w220' : '')

  // highlightRepo (disable the rest) 
  let fnFilterCircles
  let fnFilterLines = c => { 
    return d.id!==c.source.id && d.id!==c.target.id
  }
  if(d.id==='*'){
    d.oType='repo'

  }
  if(d.oType==='repo'){
    selectedRepo = d.id
    console.log(selectedRepo)
    fnFilterCircles = c => {
        if(c.oType==='repo'){
          return d.id!==c.id || c.id == ''
        }else{
          const fan = fans[c.id]
          return fan ? !(fan.starred.includes(d.id) || fan.forked.includes(d.id)) : false
        }
      }
      d3.selectAll('circle')
        .transition().duration(600)
            .style('fill', d => fnFilterCircles(d) ? colorFaded : color(d))

      d3.selectAll('line')
          .transition().duration(600)
          .style('stroke', d => fnFilterLines(d) ? colorFaded : 'grey')
          .filter(d=>!fnFilterLines(d))
          .attr('class', 'disabled')

  } else if(d.oType==='user'){
    fnFilterCircles = c => {
      const fan = fans[d.id]
      return !(fan.starred.includes(c.id) || fan.forked.includes(c.id))
    }
    fnFilterLines = c => {
      console.log(d.id,c.source.id )
      return d.id===c.source.id // || d.id===c.target.id
    }

    if(selectedRepo){ 
      d3.selectAll('circle.repo')  
      .transition().duration(600)
      .style('fill', d => fnFilterCircles(d) ? colorFaded : color(d))

      fnFilterLines = c => {
        console.log(d.id,c.source.id )
        return d.id===c.source.id// || d.id===c.target.id
      }
      d3.selectAll('.userLine').style('stroke', colorFaded).attr('class', '')
      d3.selectAll('line')
        .filter(fnFilterLines)
          .style("stroke", "black")
          .attr('class', 'userLine')
    }
  }else{ 
    d3.selectAll('circle.repo')  
    .filter(fnFilterCircles)
    .transition().duration(600)
    .style('fill', color)
    d3.selectAll('.userLine').style('stroke', colorFaded).attr('class', '')
    d3.selectAll('line')
      .filter(fnFilterLines)
        .style("stroke", "black")
        .attr('class', 'userLine')
  }
}

const renderGraph = () => {
  document.body.appendChild(graph(getData()))
  document.getElementById('details').onclick = evt => evt.stopPropagation();
}