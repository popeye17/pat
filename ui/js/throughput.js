d3.custom.throughput = function(el, observableArray) {
  const d3_id = "d3_throughput",
        d3_container = "d3_throughput_container";        

  var margin = {top: 30, right: 30, bottom: 30, left: 30},
      d3Obj = d3.select(el),
      jqObj = $(el);
  
  lineWidth = 30;
  clipMarginRight = 40;
  svgWidth = jqObj.width() - margin.left - margin.right;
  svgHeight = jqObj.height() - margin.top - margin.bottom;
  x = d3.scale.linear().range([0, svgWidth], 1);
  y = d3.scale.linear().range([0, svgHeight], 1);

  xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
  yAxis = d3.svg.axis()
    .scale(y)
    .orient("right")
    .tickSize(-svgWidth + 30);
  zoom = d3.behavior.zoom()
    .x(x)
    .scaleExtent([1, 10])
    .on("zoom", zoomed());

  d3Obj.append("div")
    .attr("id", d3_container)
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("class","slide_content")   
  .append("svg")
    .attr("id", d3_id)
    .attr("width", jqObj.width())
    .attr("height", jqObj.height());

  svg = d3.select("#" + d3_id)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  outterBody = svg.append("g");

  drawBoxWidth = parseInt(svgWidth - clipMarginRight);
  svg.append("defs").append("clipPath")
    .attr("id", d3_id + "clip")
  .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", drawBoxWidth)
    .attr("height", svgHeight + 30);

 var chartBody = svg.append("g")
    .attr("clip-path", "url(#" + d3_id + "clip)")
    .call(zoom);
  chartBody.append("rect")
    .attr("width","100%")
    .attr("height","100%")
    .attr("style","fill:none;pointer-events: all;");

  outterBody.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + svgHeight + ")");
  outterBody.append("g")  
    .attr("class", "y axis")
    .attr("transform", "translate(" + (svgWidth - 20) + ", 0)");

  graphBox = chartBody.append("g")
    .attr("id", d3_id + "_graph_box")
    .attr("transform", "translate(0,0)");  

  var self = this;
  observableArray.subscribe(function() {    
      if (!data) {
          self.svg.append("text")
            .attr("x", -30)
            .attr("y", -10)
            .attr("transform", "rotate(-90)")
            .text("Commands/sec");
          self.svg.append("text")
            .attr("x", self.svgWidth - 60)
            .attr("y", self.svgHeight + 25)
            .text("Task #")
            .attr("text-anchor","middle");
          data = observableArray();
          refresh()();
      } else {
        data = observableArray();
        refresh()();
      }
  });


  function refresh() {
    const second = 1000000000;
    var self = this;

    return function(){      
      var len = self.data.length;      
      var x = self.x.domain( [1, len] ).range([0, self.drawBoxWidth]);
      var y = self.y.domain([getRangeY(self.data) * 1.3, 0] );
      var graph = self.graphBox.selectAll("rect.bar").data(self.data);
      var labels = self.graphBox.selectAll("text").data(self.data);

      // var reboxObj = {
      //   self:self,
      //   chartBodyG: self.graphBox,
      //   drawBoxWidth: self.drawBoxWidth,
      //   zoom: self.zoom
      // };    
      // reboxObj = reBoxing(reboxObj);
      // self.zoom = reboxObj.zoom;
      // self.graphBox = reboxObj.chartBodyG;

////////////// line
      var line = d3.svg.line()
        .x( function(d) {console.log("x: " +x(d.Total)); return x(d.Total) } )
        .y( function(d) { console.log("y: " + y(d.Commands.dummy.Throughput)); return y(d.Commands.dummy.Throughput); } );

      self.graphBox.append("path")
        .attr("class", "line")
        .attr("d", line(self.data));

      self.zoom.x(x);
      //self.zoom.y(y);
      ////////////// end line

      // bars.transition()
      //   .attr("x", function(d, i) { return x(i) })
      //   .attr("y", function(d) { return y(d.LastResult / second) } )  
      //   .attr("height", function(d) { return (self.svgHeight - y(d.LastResult / second)) } );

      // labels.transition()
      //   .attr("x", function(d, i) { return (x(i) + (self.lineWidth / 2)) })
      //   .attr("y", self.svgHeight + 3 );

      // bars.enter()
      //   .append("rect")
      //     .attr("x", function(d, i) { return x(i) + 20 })
      //     .attr("y", function(d) { return y(d.LastResult / second) } )  
      //     .attr("height", function(d) { return (self.svgHeight - y(d.LastResult / second)) } )
      //     .attr("width", self.lineWidth)
      //     .attr("class", "bar")
      //     .attr("data-shift", function(){ 
      //         var bodyWidth = len * (self.lineWidth + 1);
      //         if (bodyWidth + getTranslateX(self.graphBox) > self.drawBoxWidth) {    
      //           transformChart(self.graphBox, self.drawBoxWidth - bodyWidth  - 25, 0);
      //           self.zoom = addjustZoomX(self.zoom, self.drawBoxWidth - bodyWidth  - 25, bodyWidth);
      //         }
      //     })
      //   .transition()        
      //     .duration(1000)
      //     .attr("x", function(d, i) { return x(i) })
      //     .attr("y", function(d) { return y(d.LastResult / second) })     
      //     .attr("height", function(d) { return (self.svgHeight - y(d.LastResult / second) ) } );

      // bars.enter()
      //   .append("text")
      //     .attr("x", function(d, i) { return (x(i) + (self.lineWidth / 2)) })
      //     .attr("y", self.svgHeight + 30 )
      //     .attr("dy", ".7em")
      //     .text(function(d, i){ return i + 1 })
      //   .transition()
      //     .attr("y", self.svgHeight + 3 );

      self.outterBody.select(".x.axis").call(self.xAxis);    
      self.outterBody.select(".y.axis").call(self.yAxis);

      //bars.exit().remove();   
      //labels.exit().remove();      
    }
  }

  var yAxis_max = function() {
    return this.yAxis.scale().domain()[0];
  }

  var xAxis_max = function() {
    return this.xAxis.scale().domain()[0];
  }

  var line_width = function() {
    return this.lineWidth;
  }

  var draw_box_width = function() {
    return this.drawBoxWidth;
  }

  function zoomed() {
    var self = this;
    return function() {    
      var svg = self.svg;    
      self.graphBox.attr("transform", "translate(" + d3.event.translate[0] + ",0)scale(1, 1)");
      //self.outterBody.select(".x.axis").call(self.xAxis);          
    }
  }

  function reBoxing(obj) {
    var bodyWidth = getNodeWidth(obj.chartBodyG[0][0]);
    var barsPan = getTranslateX(obj.chartBodyG);      

    if (bodyWidth + barsPan <= 0 && bodyWidth > 0) {
        transformChart(obj.chartBodyG, ( 0 - bodyWidth) + obj.drawBoxWidth / 3, 0);      
        obj.zoom = addjustZoomX(obj.zoom, ((0 - bodyWidth) + obj.drawBoxWidth / 3), bodyWidth);      
      } else if (barsPan > obj.drawBoxWidth) {
        transformChart(obj.chartBodyG, obj.drawBoxWidth - (obj.drawBoxWidth / 3), 0);      
        obj.zoom = addjustZoomX(obj.zoom, obj.drawBoxWidth - (obj.drawBoxWidth / 3), bodyWidth);    
      }
      
      return obj;
    }

  function getRangeY(data) {
    var yRange = 0;

    data.forEach( function(d){
      for (var p in d.Commands) {
       yRange = (d.Commands[p].Throughput > yRange) ? d.Commands[p].Throughput : yRange;
      }      
    });    
   return yRange;
  }

  function getTranslateX(node) {    
    console.log("throughput translateX ==========================================");
    var splitted = node.attr("transform").split(",");  
    return parseInt(splitted [0].split("(")[1]);
  }

  function getNodeWidth(node) {
    return node.getBBox().width;
  }

  function transformChart(node, x, y) {
    node.transition()
      .attr("transform", "translate(" + x + ", " + y + ")" );   
  }

  function addjustZoomX(zoom, x, range) {
    zoom.x(d3.scale.linear().range([1, range]));                     
    zoom.translate([x, 0]);
    return zoom;
  }

  return {
    xAxis_max: xAxis_max,
    yAxis_max: yAxis_max,
    line_width: line_width,
    draw_box_width: draw_box_width
  }

}; //end d3.custom.throughput
